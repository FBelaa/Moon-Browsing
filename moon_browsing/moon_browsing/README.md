# Moon Browsing v0.0.2

Moon Browsing ist eine Chrome/Edge Extension mit Mond-Icon.

## Features

- Check URL: aktuelle URL an VirusTotal senden und Ergebnis wie `1/143` anzeigen
- Check Download: heruntergeladene Datei auswählen, SHA-256 lokal berechnen und bei VirusTotal prüfen
- optionaler Upload zu VirusTotal, falls kein Hash-Report existiert
- Download HTML: aktuelle Seite als `.html.txt` speichern
- Enhance FPS: dauerhafter leichter Modus, bleibt an bis du ihn ausschaltest
  - Bilder lazy laden
  - Animationen reduzieren
  - Fonts blockieren
  - Videos/Audio bleiben erlaubt
- kleines Browser-Panel:
  - Zurück
  - Vorwärts
  - Reload
  - Speedtest öffnen
- Sprachumschaltung:
  - Deutsch
  - Englisch
  - Russisch
- Export/Import Settings als `.config`
- kompakteres Popup mit schmalerer Breite

## Installation

1. ZIP entpacken.
2. Chrome/Edge öffnen.
3. `chrome://extensions` oder `edge://extensions` öffnen.
4. Entwicklermodus aktivieren.
5. „Entpackte Erweiterung laden“ klicken.
6. Den Ordner `moon_browsing` auswählen.

## Settings Export

Über **Export** wird eine Datei wie diese erstellt:

`moon-browsing-settings-v0.0.2.config`

Aktuell gespeichert werden:

- VirusTotal API Key
- Upload-Erlaubnis
- Sprache
- Enhance-FPS-Status
- Config-Version
- Extension-Version
- Export-Zeitpunkt

## Hinweis

Der VirusTotal API Key wird lokal in Chrome Storage gespeichert. Lade ihn nicht öffentlich auf GitHub hoch.


## v0.0.2 update
- GitHub link: https://github.com/FBelaa/Moon-Browsing
- Speedtest opens the English/default page: https://www.speedtest.net/
- Default language is English (US).
