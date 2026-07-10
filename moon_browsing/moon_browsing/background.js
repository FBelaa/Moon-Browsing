const VT_BASE = 'https://www.virustotal.com/api/v3';
const fpsTabs = new Set();
let fpsGlobalEnabled = false;

chrome.storage.local.get({ fpsGlobalEnabled: false }).then((values) => {
  fpsGlobalEnabled = Boolean(values.fpsGlobalEnabled);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && fpsGlobalEnabled && isSupportedUrl(tab.url)) {
    applyFpsToTab(tabId).catch(() => {});
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!fpsGlobalEnabled) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (isSupportedUrl(tab.url)) await applyFpsToTab(tabId);
  } catch {}
});

chrome.tabs.onRemoved.addListener((tabId) => {
  fpsTabs.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(
    (data) => sendResponse({ ok: true, ...data }),
    (error) => sendResponse({ ok: false, error: error.message || String(error) })
  );
  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case 'CHECK_URL': return { data: await checkUrl(message.url) };
    case 'CHECK_FILE': return { data: await checkFile(message) };
    case 'DOWNLOAD_HTML': return await downloadHtml(message.tabId, message.url, message.title);
    case 'TOGGLE_FPS': return await toggleFps(message.tabId);
    case 'EXPORT_SETTINGS': return { data: await exportSettings() };
    case 'IMPORT_SETTINGS': return { data: await importSettings(message.config) };
    case 'GET_FPS_STATUS': return await getFpsStatus(message.tabId);
    case 'GO_BACK': await chrome.tabs.goBack(message.tabId); return { done: true };
    case 'GO_FORWARD': await chrome.tabs.goForward(message.tabId); return { done: true };
    case 'RELOAD_TAB': await chrome.tabs.reload(message.tabId); return { done: true };
    case 'OPEN_SPEEDTEST': await chrome.tabs.create({ url: 'https://www.speedtest.net/' }); return { done: true };
    default: throw new Error('Unbekannte Aktion');
  }
}

async function getApiKey() {
  const { vtApiKey } = await chrome.storage.local.get('vtApiKey');
  if (!vtApiKey) throw new Error('Bitte zuerst deinen VirusTotal API Key speichern.');
  return vtApiKey;
}

async function vtFetch(path, options = {}) {
  const apiKey = await getApiKey();
  const res = await fetch(`${VT_BASE}${path}`, {
    ...options,
    headers: {
      'x-apikey': apiKey,
      ...(options.headers || {})
    }
  });
  if (res.status === 404) return null;
  if (res.status === 429) throw new Error('VirusTotal Rate Limit erreicht. Später nochmal versuchen.');
  if (!res.ok) throw new Error(`VirusTotal Fehler ${res.status}`);
  return await res.json();
}

function statsFromAnalysis(data, fallbackStatus = 'unknown') {
  const stats = data?.data?.attributes?.stats || data?.data?.attributes?.last_analysis_stats || {};
  const malicious = Number(stats.malicious || 0);
  const suspicious = Number(stats.suspicious || 0);
  const harmless = Number(stats.harmless || 0);
  const undetected = Number(stats.undetected || 0);
  const timeout = Number(stats.timeout || 0);
  const total = malicious + suspicious + harmless + undetected + timeout;
  return {
    malicious,
    suspicious,
    total,
    status: data?.data?.attributes?.status || fallbackStatus
  };
}

async function checkUrl(url) {
  if (!/^https?:/i.test(url)) throw new Error('Nur http/https URLs können geprüft werden.');

  const form = new URLSearchParams();
  form.append('url', url);

  const submitted = await vtFetch('/urls', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });

  const analysisId = submitted?.data?.id;
  if (!analysisId) throw new Error('Keine Analysis-ID von VirusTotal erhalten.');

  let report;
  for (let i = 0; i < 8; i++) {
    report = await vtFetch(`/analyses/${encodeURIComponent(analysisId)}`);
    if (report?.data?.attributes?.status === 'completed') break;
    await sleep(1800);
  }

  const result = statsFromAnalysis(report, 'queued');
  result.permalink = `https://www.virustotal.com/gui/url/${encodeURIComponent(analysisId)}`;
  return result;
}

async function checkFile({ hash, fileName, fileType, fileBuffer }) {
  let report = await vtFetch(`/files/${hash}`);
  let uploaded = false;

  if (!report && fileBuffer) {
    const bytes = new Uint8Array(fileBuffer);
    if (bytes.byteLength > 32 * 1024 * 1024) {
      throw new Error('Datei ist größer als 32 MB. Dafür müsste später /files/upload_url ergänzt werden.');
    }

    const form = new FormData();
    form.append('file', new Blob([bytes], { type: fileType || 'application/octet-stream' }), fileName || 'download.bin');
    const submitted = await vtFetch('/files', { method: 'POST', body: form });
    uploaded = true;

    const analysisId = submitted?.data?.id;
    if (analysisId) {
      for (let i = 0; i < 10; i++) {
        const analysis = await vtFetch(`/analyses/${encodeURIComponent(analysisId)}`);
        if (analysis?.data?.attributes?.status === 'completed') break;
        await sleep(2200);
      }
    }

    report = await vtFetch(`/files/${hash}`);
  }

  if (!report) throw new Error('Kein VirusTotal-Report für diesen Hash gefunden. Aktiviere optional den Upload-Haken.');

  const result = statsFromAnalysis(report, 'completed');
  result.uploaded = uploaded;
  result.permalink = `https://www.virustotal.com/gui/file/${hash}`;
  return result;
}

async function downloadHtml(tabId, url, title) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.documentElement.outerHTML
  });

  const safeTitle = sanitizeFileName(title || new URL(url).hostname || 'page');
  const content = `URL: ${url}\nSaved: ${new Date().toISOString()}\n\n${result}`;
  const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);

  await chrome.downloads.download({
    url: dataUrl,
    filename: `moon-browsing/${safeTitle}.html.txt`,
    saveAs: true
  });

  return { saved: true };
}

async function toggleFps(tabId) {
  const enabled = !fpsGlobalEnabled;
  fpsGlobalEnabled = enabled;
  await chrome.storage.local.set({ fpsGlobalEnabled: enabled });

  if (enabled) {
    await applyFpsToTab(tabId);
  } else {
    await disableFpsEverywhere();
  }

  return { enabled };
}

async function getFpsStatus(tabId) {
  const { fpsGlobalEnabled: storedEnabled } = await chrome.storage.local.get({ fpsGlobalEnabled: fpsGlobalEnabled });
  fpsGlobalEnabled = Boolean(storedEnabled);
  if (fpsGlobalEnabled && tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (isSupportedUrl(tab.url)) await applyFpsToTab(tabId);
    } catch {}
  }
  return { enabled: fpsGlobalEnabled };
}

async function applyFpsToTab(tabId) {
  fpsTabs.add(tabId);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: ruleIdsForTab(tabId),
    addRules: makeFpsRules(tabId)
  });
  await chrome.scripting.executeScript({ target: { tabId }, func: enablePageLiteMode });
}

async function disableFpsEverywhere() {
  const ruleIds = [];
  for (const tabId of fpsTabs) ruleIds.push(...ruleIdsForTab(tabId));
  fpsTabs.clear();
  if (ruleIds.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds });

  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(tabs.map((tab) => {
    if (!tab.id || !isSupportedUrl(tab.url)) return Promise.resolve();
    return chrome.scripting.executeScript({ target: { tabId: tab.id }, func: disablePageLiteMode });
  }));
}

function isSupportedUrl(url) {
  return /^https?:/i.test(url || '');
}

function makeFpsRules(tabId) {
  // 0.1-style simple mode, but media is not blocked so videos can still play.
  return [{
    id: ruleIdsForTab(tabId)[0],
    priority: 1,
    action: { type: 'block' },
    condition: { tabIds: [tabId], resourceTypes: ['font'] }
  }];
}

function ruleIdsForTab(tabId) {
  return [Number(`${tabId}1`.slice(-6))];
}

function enablePageLiteMode() {
  if (!document.getElementById('moon-browsing-lite-style')) {
    const style = document.createElement('style');
    style.id = 'moon-browsing-lite-style';
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
      img { loading: lazy !important; }
    `;
    document.documentElement.appendChild(style);
  }

  document.querySelectorAll('img').forEach((img) => {
    img.loading = 'lazy';
    img.decoding = 'async';
  });
}

function disablePageLiteMode() {
  document.getElementById('moon-browsing-lite-style')?.remove();
}

async function exportSettings() {
  const values = await chrome.storage.local.get(null);
  return {
    app: 'Moon Browsing',
    configVersion: 1,
    extensionVersion: chrome.runtime.getManifest().version,
    exportedAt: new Date().toISOString(),
    settings: {
      vtApiKey: values.vtApiKey || '',
      allowUpload: Boolean(values.allowUpload),
      language: values.language || 'en',
      fpsGlobalEnabled: Boolean(values.fpsGlobalEnabled)
    }
  };
}

async function importSettings(config) {
  if (!config || config.app !== 'Moon Browsing' || !config.settings) {
    throw new Error('Das ist keine gültige Moon Browsing .config Datei.');
  }

  const allowed = {};
  if (typeof config.settings.vtApiKey === 'string') allowed.vtApiKey = config.settings.vtApiKey;
  if (typeof config.settings.allowUpload === 'boolean') allowed.allowUpload = config.settings.allowUpload;
  if (typeof config.settings.language === 'string') allowed.language = config.settings.language;
  if (typeof config.settings.fpsGlobalEnabled === 'boolean') {
    allowed.fpsGlobalEnabled = config.settings.fpsGlobalEnabled;
    fpsGlobalEnabled = config.settings.fpsGlobalEnabled;
  }

  await chrome.storage.local.set(allowed);
  return { imported: true, keys: Object.keys(allowed) };
}

function sanitizeFileName(name) {
  return String(name).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || 'page';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
