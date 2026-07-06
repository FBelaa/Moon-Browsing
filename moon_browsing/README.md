# Moon Browsing v0.1

Moon Browsing ist eine Chrome/Edge Extension mit Mond-Icon.

## Features

- Check URL: aktuelle URL an VirusTotal senden und Ergebnis wie `1/143` anzeigen
- Check Download: heruntergeladene Datei auswählen, SHA-256 lokal berechnen und bei VirusTotal prüfen
- optionaler Upload zu VirusTotal, falls kein Hash-Report existiert
- Download HTML: aktuelle Seite als `.html.txt` speichern
- Enhance FPS: leichter Modus für den aktiven Tab
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

`moon-browsing-settings-v0.1.config`

Aktuell gespeichert werden:

- VirusTotal API Key
- Upload-Erlaubnis
- Sprache
- Config-Version
- Extension-Version
- Export-Zeitpunkt

## Hinweis

Der VirusTotal API Key bleibt lokal in Chrome Storage. Lade ihn nicht öffentlich auf GitHub hoch.
