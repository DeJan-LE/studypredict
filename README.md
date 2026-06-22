# StudyPredict

Ein simpler Lern-Tracker für Berufsschüler. Du trägst deine Prüfungen, Noten und Lernzeiten ein – und eine KI berechnet dir, wie viel du für die nächste Prüfung lernen solltest, um deine Zielnote zu erreichen.

Funktioniert mit der Schweizer Notenskala (1–6).

## Features

-  **Dashboard** mit Übersicht über Noten und Lernzeiten
-  **KI-Vorhersage** der optimalen Lernzeit (Anthropic *oder* OpenAI – Provider wird automatisch am API-Key erkannt)
-  **Study Planner** verteilt die berechnete Lernzeit auf die Tage bis zur Prüfung
-  **Kalenderansicht** für anstehende Prüfungen
-  Fächer mit eigenen Farben und Zielnoten

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Flask (Python)
- **Daten:** lokale JSON-Datei (`studypredict_data.json`)

## Setup

```bash
# 1. Frontend-Dependencies installieren
npm install --legacy-peer-deps

# 2. Python-Dependencies installieren
pip install -r requirements.txt

# 3. Starten (baut das Frontend beim ersten Mal automatisch)
python app.py
```

Die App läuft dann unter **http://localhost:5000** und öffnet sich automatisch im Browser.

## API-Key

Damit die KI-Vorhersage funktioniert, in den **Einstellungen** einen API-Key hinterlegen:

- Anthropic-Key (`sk-ant-...`) → nutzt Claude
- OpenAI-Key (`sk-...`) → nutzt GPT

Der Key wird nur lokal gespeichert.

## Hinweis

Persönliches Lernprojekt – kein produktives Tool.
