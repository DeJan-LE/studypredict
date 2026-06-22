"""
StudyPredict – Flask Dev Server
Starten: python app.py  (oder F5 in VS Code)
Erreichbar unter: http://localhost:5000

Unterstützt Anthropic (sk-ant-...) und OpenAI (sk-...) API Keys.
Der Provider wird automatisch am Key-Präfix erkannt.
"""

import json
import webbrowser
import threading
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path
from flask import Flask, send_from_directory, send_file, jsonify, request

BASE_DIR  = Path(__file__).parent
DIST_DIR  = BASE_DIR / "dist"
DATA_FILE = BASE_DIR / "studypredict_data.json"

app = Flask(__name__, static_folder=str(DIST_DIR), static_url_path="")


def load_data() -> dict:
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"entries": [], "subjects": [], "settings": {}}

def save_data(data: dict) -> None:
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify(load_data())

@app.route("/api/data", methods=["POST"])
def post_data():
    try:
        save_data(request.get_json(force=True))
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


def detect_provider(api_key: str) -> str:
    key = api_key.strip()
    if key.startswith("sk-ant-"):
        return "anthropic"
    if key.startswith("sk-"):
        return "openai"
    return "unknown"


def call_anthropic(api_key: str, prompt: str) -> str:
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 350,
        "messages": [{"role": "user", "content": prompt}]
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type":      "application/json",
            "x-api-key":         api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
    return raw["content"][0]["text"].strip()


def call_openai(api_key: str, prompt: str) -> str:
    payload = json.dumps({
        "model": "gpt-4o-mini",
        "max_tokens": 350,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = json.loads(resp.read().decode("utf-8"))
    return raw["choices"][0]["message"]["content"].strip()


@app.route("/api/predict", methods=["POST"])
def predict():
    body = request.get_json(force=True)

    data    = load_data()
    api_key = data.get("settings", {}).get("apiKey", "").strip()

    if not api_key:
        return jsonify({"error": "no_api_key"}), 400

    provider = detect_provider(api_key)
    if provider == "unknown":
        return jsonify({"error": "invalid_api_key"}), 400

    subject   = body.get("subject", "Unbekannt")
    target    = body.get("targetNote", 5.0)
    days_left = body.get("daysLeft", 7)
    exam_date = body.get("examDate", "")
    entries   = body.get("entries", [])

    if entries:
        history = "\n".join(
            f"- {e.get('type','Pruefung').capitalize()}: Note {e.get('note')}, "
            f"Lernzeit {e.get('studyHours')}h, Gewichtung {e.get('weight')}%"
            for e in entries[-8:]
        )
    else:
        history = "Noch keine frueheren Eintraege vorhanden."

    prompt = f"""Du bist ein erfahrener Schweizer Berufsschul-Lernberater. Berechne die optimale GESAMTE Lernzeit fuer eine bevorstehende Pruefung.

Fach: {subject}
Pruefungsdatum: {exam_date} (in {days_left} Tagen)
Zielnote: {target} (Schweizer Skala 1-6, 6 ist Bestnote)

Bisherige Leistungen in {subject}:
{history}

WICHTIGE REGELN fuer deine Berechnung:
- Gib die GESAMTE Lernzeit an (nicht pro Tag). Diese wird spaeter sinnvoll auf die Tage vor der Pruefung verteilt.
- Realistische Werte: Eine normale Pruefung braucht 3-8h Gesamtvorbereitung, eine grosse/schwere Pruefung 8-15h.
- Wenn die bisherige Note bereits ueber dem Ziel liegt: weniger Zeit (Stoff sitzt schon).
- Wenn die Note unter dem Ziel liegt: mehr Zeit, proportional zur Luecke.
- Beruecksichtige wie viel der Schueler frueher gelernt hat und welche Note dabei rauskam (Effizienz).
- Die Anzahl Tage bis zur Pruefung aendert NICHT die Gesamtstunden - nur wie sie verteilt werden.

Antworte NUR mit diesem JSON (kein Markdown, kein Text drumherum):
{{
  "hours": <GESAMTE Lernzeit, Zahl zwischen 1 und 15, auf 0.5 gerundet>,
  "confidence": <Prozent 10-95, hoeher bei mehr Datenpunkten>,
  "reasoning": "<1-2 Saetze auf Deutsch: warum genau diese Gesamtzeit, basierend auf Note und Ziel>",
  "tips": ["<konkreter Lerntipp fuer {subject}>", "<zweiter konkreter Tipp>"]
}}"""

    try:
        if provider == "anthropic":
            text = call_anthropic(api_key, prompt)
        else:
            text = call_openai(api_key, prompt)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"[{provider} API Error {e.code}] {err_body}")
        if e.code in (401, 403):
            return jsonify({"error": "invalid_api_key"}), 401
        return jsonify({"error": "api_error", "detail": err_body}), 502
    except Exception as e:
        print(f"[{provider} API Error] {e}")
        return jsonify({"error": "network_error", "detail": str(e)}), 502

    try:
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())
        result["provider"] = provider
        return jsonify(result)
    except Exception as e:
        print(f"[Parse Error] {e} -- text: {text}")
        return jsonify({"error": "parse_error"}), 502


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path: str):
    target = DIST_DIR / path
    if path and target.exists() and target.is_file():
        return send_from_directory(str(DIST_DIR), path)
    return send_file(str(DIST_DIR / "index.html"))


def maybe_build():
    if not (DIST_DIR / "index.html").exists():
        print("dist/ nicht gefunden - baue React-App (einmalig)...")
        result = subprocess.run(
            ["npm", "run", "build:vite"],
            cwd=str(BASE_DIR),
            shell=(sys.platform == "win32"),
        )
        if result.returncode != 0:
            print("Build fehlgeschlagen. Bitte 'npm install --legacy-peer-deps' ausfuehren.")
            sys.exit(1)
        print("Build erfolgreich.")

def open_browser():
    webbrowser.open("http://localhost:5000")

if __name__ == "__main__":
    maybe_build()
    print()
    print("  StudyPredict laeuft auf http://localhost:5000")
    print("  Strg+C zum Beenden")
    print()
    threading.Timer(1.2, open_browser).start()
    app.run(host="0.0.0.0", port=5000, debug=False)
