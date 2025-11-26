# scripts/ai_reviewer.py
import os
import sys
import subprocess
import requests
from openai import OpenAI # type: ignore
import json

# --- CONFIGURATION ---
MODEL_NAME = "gpt-5.1-codex-mini"

DISCORD_WEBHOOK = os.environ.get("DISCORD_WEBHOOK_URL")
API_KEY = os.environ.get("OPENAI_API_KEY")

# Initialisation du client OpenAI
client = OpenAI(api_key=API_KEY)

def get_changed_files():
    """Récupère la liste des fichiers modifiés dans le dernier commit"""
    try:
        # On compare le HEAD avec le commit précédent
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1", "HEAD"],
            capture_output=True, text=True, check=True
        )
        files = result.stdout.strip().split('\n')
        # On ne garde que les fichiers de code pertinents
        return [f for f in files if f.endswith(('.php', '.vue', '.ts', '.js', '.yaml', '.yml', '.css', '.py')) and os.path.exists(f)]
    except subprocess.CalledProcessError:
        return []

def get_file_content(filepath):
    """Lit le contenu d'un fichier"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception:
        return ""

def analyze_code(files_content):
    """Envoie le code à l'IA pour analyse via la Responses API"""
    if not files_content:
        return None

    # Prompt optimisé
    prompt = f"""
    Tu es un Tech Lead expert et un auditeur de sécurité.
    Analyse ce commit (Symfony 7 / Nuxt 3) selon 3 axes stricts.

    CODE À ANALYSER :
    {files_content}

    RÉPONDS UNIQUEMENT AU FORMAT JSON :
    {{
        "score_global": (note int sur 20),
        "details": {{
            "SOLID": (note int sur 5),
            "Clarte": (note int sur 10),
            "Securite": (note int sur 5)
        }},
        "resume": "Résumé concis (max 15 mots).",
        "points_forts": ["Court point 1", "Court point 2"],
        "points_faibles": ["Court point 1", "Court point 2"],
        "conseil_mentor": "1 conseil actionnable immédiat."
    }}
    """

    try:
        # Correction : Suppression de 'temperature' et ajout de 'reasoning' pour la rigueur
        response = client.responses.create(
            model=MODEL_NAME,
            input=[
                {"role": "system", "content": "Tu es un assistant CI/CD qui répond exclusivement en JSON valide."},
                {"role": "user", "content": prompt}
            ],
            # On remplace temperature par reasoning_effort pour demander une analyse sérieuse
            reasoning={"effort": "medium"} 
        )
        
        return response.output_text

    except Exception as e:
        print(f"Erreur API OpenAI ({MODEL_NAME}): {e}")
        return None

def send_discord_notification(report_json):
    """Envoie le rapport formaté sur Discord"""
    try:
        # Nettoyage basique au cas où le modèle renvoie des balises Markdown
        cleaned_json = report_json.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_json)
        
        # Couleur selon la note (Vert > 15, Orange > 10, Rouge < 10)
        score = data.get('score_global', 0)
        color = 5763719 # Vert
        if score < 15: color = 16776960 # Orange
        if score < 10: color = 15548997 # Rouge

        embed = {
            "title": f"📝 Code Review : {score}/20",
            "description": data.get('resume', 'Analyse terminée'),
            "color": color,
            "fields": [
                {"name": "🧠 SOLID", "value": f"{data['details']['SOLID']}/5", "inline": True},
                {"name": "👀 Clarté", "value": f"{data['details']['Clarte']}/10", "inline": True},
                {"name": "🛡️ Sécurité", "value": f"{data['details']['Securite']}/5", "inline": True},
                {"name": "✅ Top", "value": "\n".join([f"• {p}" for p in data.get('points_forts', [])]), "inline": False},
                {"name": "⚠️ Flop", "value": "\n".join([f"• {p}" for p in data.get('points_faibles', [])]), "inline": False},
                {"name": "💡 Conseil", "value": f"*{data.get('conseil_mentor', '')}*", "inline": False}
            ],
            "footer": {"text": f"Moteur: {MODEL_NAME} • Studia CI/CD"}
        }

        requests.post(DISCORD_WEBHOOK, json={"embeds": [embed]})
    except json.JSONDecodeError:
        print("Erreur: L'IA n'a pas renvoyé un JSON valide.")
        print(f"Contenu reçu brut : {report_json}")
    except Exception as e:
        print(f"Erreur Discord: {e}")

if __name__ == "__main__":
    changed_files = get_changed_files()
    
    if not changed_files:
        print("Aucun fichier de code pertinent modifié.")
        sys.exit(0)

    print(f"🚀 Analyse IA en cours avec {MODEL_NAME} sur {len(changed_files)} fichiers...")
    
    content_to_analyze = ""
    for file in changed_files:
        content_to_analyze += f"\n--- FICHIER: {file} ---\n"
        content_to_analyze += get_file_content(file)

    # Troncation de sécurité
    if len(content_to_analyze) > 60000:
        content_to_analyze = content_to_analyze[:60000] + "\n... (Tronqué)"

    report = analyze_code(content_to_analyze)
    
    if report:
        send_discord_notification(report)
        print("✅ Rapport envoyé sur Discord !")
    else:
        print("❌ Échec de l'analyse.")
        sys.exit(1)