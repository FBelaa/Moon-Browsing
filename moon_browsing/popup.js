const $ = (id) => document.getElementById(id);
const version = chrome.runtime.getManifest().version;
$('version').textContent = version;

const I18N = {
  de: {
    subtitle: 'Sicherer & leichter browsen', apiKeyLabel: 'VirusTotal API Key', save: 'Save', saved: 'Saved',
    apiHint: 'Der Key bleibt lokal in Chrome Storage.', checkUrl: 'Check URL', notChecked: 'Noch nicht geprüft',
    checkDownload: 'Check Download', lookingDownload: 'Letzter Download wird gesucht…', allowUpload: 'Datei zu VirusTotal hochladen, falls kein Hash-Report existiert',
    pickFile: 'Wähle die heruntergeladene Datei aus.', downloadHtml: 'Download HTML', enhanceOn: 'Enhance FPS einschalten', enhanceOff: 'Enhance FPS ausschalten',
    fpsOff: 'Enhance FPS ist aus', fpsOn: 'Enhance FPS ist an. Bilder werden lazy geladen, Animationen/Fonts reduziert. Videos bleiben erlaubt.',
    settingsBackup: 'Settings Backup', exportSettings: 'Export', importSettings: 'Import', settingsHint: 'Exportiert/importiert deine lokalen Einstellungen als .config Datei.',
    checkingUrl: 'Prüfe URL…', chooseFile: 'Bitte wähle die heruntergeladene Datei aus. Browser-Extensions dürfen lokale Download-Pfade nicht automatisch auslesen.',
    hashing: 'SHA-256 wird berechnet…', askVt: 'Frage VirusTotal ab…', savingHtml: 'Speichere HTML…', htmlSaved: 'HTML wurde als .txt gespeichert.',
    toggleFps: 'Schalte Enhance FPS um…', exporting: 'Exportiere Settings…', exported: 'Settings wurden als .config exportiert.', importing: 'Importiere Settings…', imported: 'Settings importiert',
    noActiveTab: 'Kein aktiver Tab gefunden.', noDownload: 'Noch kein Download gefunden.', downloadError: 'Letzter Download konnte nicht gelesen werden.', lastDownload: 'Letzter Download', suspicious: 'auffällig · Status', error: 'Fehler'
  },
  en: {
    subtitle: 'Safer & lighter browsing', apiKeyLabel: 'VirusTotal API Key', save: 'Save', saved: 'Saved',
    apiHint: 'The key stays locally in Chrome Storage.', checkUrl: 'Check URL', notChecked: 'Not checked yet',
    checkDownload: 'Check Download', lookingDownload: 'Looking for latest download…', allowUpload: 'Upload file to VirusTotal if no hash report exists',
    pickFile: 'Choose the downloaded file.', downloadHtml: 'Download HTML', enhanceOn: 'Turn Enhance FPS on', enhanceOff: 'Turn Enhance FPS off',
    fpsOff: 'Enhance FPS is off', fpsOn: 'Enhance FPS is on. Images load lazily, animations/fonts are reduced. Videos stay allowed.',
    settingsBackup: 'Settings Backup', exportSettings: 'Export', importSettings: 'Import', settingsHint: 'Exports/imports your local settings as a .config file.',
    checkingUrl: 'Checking URL…', chooseFile: 'Please choose the downloaded file. Browser extensions cannot automatically read local download paths.',
    hashing: 'Calculating SHA-256…', askVt: 'Checking VirusTotal…', savingHtml: 'Saving HTML…', htmlSaved: 'HTML was saved as .txt.',
    toggleFps: 'Toggling Enhance FPS…', exporting: 'Exporting settings…', exported: 'Settings exported as .config.', importing: 'Importing settings…', imported: 'Settings imported',
    noActiveTab: 'No active tab found.', noDownload: 'No download found yet.', downloadError: 'Latest download could not be read.', lastDownload: 'Latest download', suspicious: 'flagged · Status', error: 'Error'
  },
  ru: {
    subtitle: 'Безопаснее и легче браузинг', apiKeyLabel: 'Ключ VirusTotal API', save: 'Save', saved: 'Saved',
    apiHint: 'Ключ хранится локально в Chrome Storage.', checkUrl: 'Проверить URL', notChecked: 'Еще не проверено',
    checkDownload: 'Проверить загрузку', lookingDownload: 'Ищу последнюю загрузку…', allowUpload: 'Загрузить файл в VirusTotal, если отчета по хэшу нет',
    pickFile: 'Выбери загруженный файл.', downloadHtml: 'Скачать HTML', enhanceOn: 'Включить Enhance FPS', enhanceOff: 'Выключить Enhance FPS',
    fpsOff: 'Enhance FPS выключен', fpsOn: 'Enhance FPS включен. Картинки загружаются lazy, анимации/шрифты снижены. Видео разрешены.',
    settingsBackup: 'Резерв настроек', exportSettings: 'Экспорт', importSettings: 'Импорт', settingsHint: 'Экспорт/импорт локальных настроек как .config файл.',
    checkingUrl: 'Проверяю URL…', chooseFile: 'Выбери загруженный файл. Расширения браузера не могут автоматически читать локальные пути загрузок.',
    hashing: 'Считаю SHA-256…', askVt: 'Проверяю VirusTotal…', savingHtml: 'Сохраняю HTML…', htmlSaved: 'HTML сохранен как .txt.',
    toggleFps: 'Переключаю Enhance FPS…', exporting: 'Экспорт настроек…', exported: 'Настройки экспортированы как .config.', importing: 'Импорт настроек…', imported: 'Настройки импортированы',
    noActiveTab: 'Активная вкладка не найдена.', noDownload: 'Загрузок пока нет.', downloadError: 'Не удалось прочитать последнюю загрузку.', lastDownload: 'Последняя загрузка', suspicious: 'подозрительно · Статус', error: 'Ошибка'
  }
};
let currentLang = 'de';
let fpsEnabled = false;

const t = (key) => I18N[currentLang]?.[key] || I18N.de[key] || key;

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error(t('noActiveTab'));
  return tab;
}

function setResult(el, text, kind = 'muted') {
  el.className = `result ${kind}`;
  el.textContent = text;
}

function formatStats(data) {
  const suspiciousTotal = Number(data.malicious || 0) + Number(data.suspicious || 0);
  const total = Number(data.total || 0);
  return `${suspiciousTotal}/${total || '?'} ${t('suspicious')}: ${data.status || 'unknown'}`;
}

function applyLanguage(lang) {
  currentLang = I18N[lang] ? lang : 'de';
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('.flag').forEach((btn) => btn.classList.toggle('active', btn.dataset.lang === currentLang));
  updateFpsUi(fpsEnabled);
}

function updateFpsUi(enabled) {
  fpsEnabled = Boolean(enabled);
  $('fpsBadge').textContent = fpsEnabled ? 'ON' : 'OFF';
  $('fpsBadge').className = `status ${fpsEnabled ? 'on' : 'off'}`;
  $('enhanceFps').classList.toggle('on', fpsEnabled);
  $('enhanceFps').textContent = fpsEnabled ? t('enhanceOff') : t('enhanceOn');
  setResult($('fpsResult'), fpsEnabled ? t('fpsOn') : t('fpsOff'), fpsEnabled ? 'good' : 'muted');
}

async function loadSettings() {
  const { vtApiKey, allowUpload, language } = await chrome.storage.local.get(['vtApiKey', 'allowUpload', 'language']);
  if (vtApiKey) $('apiKey').value = vtApiKey;
  $('allowUpload').checked = Boolean(allowUpload);
  applyLanguage(language || 'de');
}

async function loadFpsStatus() {
  try {
    const tab = await getActiveTab();
    const response = await chrome.runtime.sendMessage({ type: 'GET_FPS_STATUS', tabId: tab.id });
    updateFpsUi(Boolean(response?.enabled));
  } catch {
    updateFpsUi(false);
  }
}

$('saveApiKey').addEventListener('click', async () => {
  await chrome.storage.local.set({ vtApiKey: $('apiKey').value.trim() });
  $('saveApiKey').textContent = t('saved');
  setTimeout(() => ($('saveApiKey').textContent = t('save')), 1000);
});

$('allowUpload').addEventListener('change', async () => {
  await chrome.storage.local.set({ allowUpload: $('allowUpload').checked });
});

document.querySelectorAll('.flag').forEach((btn) => {
  btn.addEventListener('click', async () => {
    await chrome.storage.local.set({ language: btn.dataset.lang });
    applyLanguage(btn.dataset.lang);
  });
});

$('goBack').addEventListener('click', async () => chrome.runtime.sendMessage({ type: 'GO_BACK', tabId: (await getActiveTab()).id }));
$('goForward').addEventListener('click', async () => chrome.runtime.sendMessage({ type: 'GO_FORWARD', tabId: (await getActiveTab()).id }));
$('reloadPage').addEventListener('click', async () => chrome.runtime.sendMessage({ type: 'RELOAD_TAB', tabId: (await getActiveTab()).id }));
$('openSpeedtest').addEventListener('click', async () => chrome.runtime.sendMessage({ type: 'OPEN_SPEEDTEST' }));

$('checkUrl').addEventListener('click', async () => {
  const out = $('urlResult');
  try {
    setResult(out, t('checkingUrl'));
    const tab = await getActiveTab();
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_URL', url: tab.url });
    if (!response.ok) throw new Error(response.error);
    const text = formatStats(response.data);
    setResult(out, text, response.data.malicious || response.data.suspicious ? 'bad' : 'good');
  } catch (error) {
    setResult(out, `${t('error')}: ${error.message}`, 'bad');
  }
});

$('checkDownload').addEventListener('click', async () => {
  const out = $('downloadResult');
  try {
    const file = $('filePicker').files?.[0];
    if (!file) {
      setResult(out, t('chooseFile'), 'bad');
      return;
    }

    setResult(out, t('hashing'));
    const buffer = await file.arrayBuffer();
    const hash = await sha256(buffer);
    setResult(out, `SHA-256: ${hash}\n${t('askVt')}`);

    const allowUpload = $('allowUpload').checked;
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_FILE',
      hash,
      fileName: file.name,
      fileType: file.type,
      fileBuffer: allowUpload ? Array.from(new Uint8Array(buffer)) : null
    });

    if (!response.ok) throw new Error(response.error);
    const text = `${formatStats(response.data)}${response.data.uploaded ? ' · uploaded' : ''}`;
    setResult(out, text, response.data.malicious || response.data.suspicious ? 'bad' : 'good');
  } catch (error) {
    setResult(out, `${t('error')}: ${error.message}`, 'bad');
  }
});

$('downloadHtml').addEventListener('click', async () => {
  const out = $('fpsResult');
  try {
    setResult(out, t('savingHtml'));
    const tab = await getActiveTab();
    const response = await chrome.runtime.sendMessage({ type: 'DOWNLOAD_HTML', tabId: tab.id, url: tab.url, title: tab.title });
    if (!response.ok) throw new Error(response.error);
    setResult(out, t('htmlSaved'), 'good');
  } catch (error) {
    setResult(out, `${t('error')}: ${error.message}`, 'bad');
  }
});

$('enhanceFps').addEventListener('click', async () => {
  const out = $('fpsResult');
  try {
    setResult(out, t('toggleFps'));
    const tab = await getActiveTab();
    const response = await chrome.runtime.sendMessage({ type: 'TOGGLE_FPS', tabId: tab.id });
    if (!response.ok) throw new Error(response.error);
    updateFpsUi(response.enabled);
  } catch (error) {
    setResult(out, `${t('error')}: ${error.message}`, 'bad');
  }
});

$('exportSettings').addEventListener('click', async () => {
  const out = $('settingsResult');
  try {
    setResult(out, t('exporting'));
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_SETTINGS' });
    if (!response.ok) throw new Error(response.error);

    const json = JSON.stringify(response.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moon-browsing-settings-v${version}.config`;
    a.click();
    URL.revokeObjectURL(url);

    setResult(out, t('exported'), 'good');
  } catch (error) {
    setResult(out, `${t('error')}: ${error.message}`, 'bad');
  }
});

$('importSettings').addEventListener('click', () => $('importFile').click());

$('importFile').addEventListener('change', async () => {
  const out = $('settingsResult');
  try {
    const file = $('importFile').files?.[0];
    if (!file) return;

    setResult(out, t('importing'));
    const text = await file.text();
    const config = JSON.parse(text);
    const response = await chrome.runtime.sendMessage({ type: 'IMPORT_SETTINGS', config });
    if (!response.ok) throw new Error(response.error);

    await loadSettings();
    setResult(out, `${t('imported')}: ${response.data.keys.join(', ') || '-'}`, 'good');
  } catch (error) {
    setResult(out, `${t('error')}: ${error.message}`, 'bad');
  } finally {
    $('importFile').value = '';
  }
});

async function showLastDownload() {
  try {
    const downloads = await chrome.downloads.search({ limit: 1, orderBy: ['-startTime'] });
    const latest = downloads?.[0];
    $('lastDownload').textContent = latest ? `${t('lastDownload')}: ${latest.filename?.split(/[\\/]/).pop() || latest.url || 'unknown'}` : t('noDownload');
  } catch {
    $('lastDownload').textContent = t('downloadError');
  }
}

async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

(async () => {
  await loadSettings();
  await loadFpsStatus();
  await showLastDownload();
})();
