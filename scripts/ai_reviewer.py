# scripts/ai_reviewer.py
import os
import sys
import subprocess
import requests
from openai import OpenAI # type: ignore
import json
from typing import List, Optional
from pydantic import BaseModel, ValidationError, Field, field_validator

# --- CONFIGURATION ---
MODEL_NAME = "gpt-5.1-codex-mini"
MAX_CONTENT_LENGTH = 60000
MAX_FILES_ANALYZED = 50

DISCORD_WEBHOOK = os.environ.get("DISCORD_WEBHOOK_URL")
API_KEY = os.environ.get("OPENAI_API_KEY")

# Initialisation du client OpenAI
client = OpenAI(api_key=API_KEY)

# --- VALIDATION SCHÉMA PYDANTIC ---
class ReviewDetails(BaseModel):
    SOLID: int = Field(ge=0, le=20)
    Clarte: int = Field(ge=0, le=20)
    Securite: int = Field(ge=0, le=20)

class ReviewReport(BaseModel):
    score_global: int = Field(ge=0, le=20)
    details: ReviewDetails
    resume: str = Field(max_length=200)
    points_forts: List[str] = Field(max_length=5)
    points_faibles: List[str] = Field(max_length=5)
    conseil_mentor: str = Field(max_length=300)
    
    @field_validator('points_forts', 'points_faibles')
    @classmethod
    def validate_list_items(cls, v):
        if not v:
            return ["Aucun point identifié"]
        # Limite la longueur de chaque élément et sanitation
        return [item[:150].strip() for item in v[:5]]
    
    @field_validator('resume', 'conseil_mentor')
    @classmethod
    def sanitize_text(cls, v):
        # Supprime les caractères potentiellement problématiques
        return v.replace('`', '').replace('*', '').strip()

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
        valid_files = [f for f in files if f.endswith(('.php', '.vue', '.ts', '.js', '.yaml', '.yml', '.css', '.py')) and os.path.exists(f)]
        
        if len(valid_files) > MAX_FILES_ANALYZED:
            print(f"⚠️ Trop de fichiers modifiés ({len(valid_files)}). Limitation à {MAX_FILES_ANALYZED} fichiers.")
            return valid_files[:MAX_FILES_ANALYZED]
        
        return valid_files
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de la récupération des fichiers: {e}")
        return []

def get_commit_info():
    """Récupère le message et le hash du dernier commit"""
    try:
        # Récupère le hash court (7 caractères)
        hash_result = subprocess.run(
            ["git", "rev-parse", "--short=7", "HEAD"],
            capture_output=True, text=True, check=True
        )
        commit_hash = hash_result.stdout.strip()
        
        # Récupère le message du commit (première ligne uniquement)
        message_result = subprocess.run(
            ["git", "log", "-1", "--pretty=%s"],
            capture_output=True, text=True, check=True
        )
        commit_message = message_result.stdout.strip()
        
        return commit_hash, commit_message
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Erreur lors de la récupération des infos du commit: {e}")
        return "unknown", "Commit inconnu"

def get_file_content(filepath: str) -> str:
    """Lit le contenu d'un fichier avec gestion d'erreur détaillée"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if len(content) > 10000:
                print(f"📄 {filepath}: {len(content)} caractères")
            return content
    except UnicodeDecodeError:
        print(f"⚠️ Fichier {filepath} ignoré (encodage non UTF-8)")
        return ""
    except Exception as e:
        print(f"❌ Erreur lecture {filepath}: {e}")
        return ""

def analyze_code(files_content: str) -> Optional[str]:
    """Envoie le code à l'IA pour analyse via la Responses API avec retry"""
    if not files_content:
        print("❌ Aucun contenu à analyser")
        return None

    # Prompt optimisé avec schéma JSON strict et exemples
    prompt = f"""
Tu es un code reviewer technique. Analyse ce code et RETOURNE UNIQUEMENT LE JSON SUIVANT (AUCUN AUTRE TEXTE) :

{{
    "score_global": 15,
    "details": {{
        "SOLID": 14,
        "Clarte": 16,
        "Securite": 13
    }},
    "resume": "Résumé de l'analyse en une phrase courte",
    "points_forts": ["Point fort 1", "Point fort 2"],
    "points_faibles": ["Point faible 1", "Point faible 2"],
    "conseil_mentor": "Un conseil concret et actionnable"
}}

CODE À ANALYSER :
{files_content}

RAPPEL CRITIQUE : Retourne UNIQUEMENT le JSON valide ci-dessus avec tes valeurs, sans ```json, sans commentaires, sans texte additionnel."""

    max_retries = 2
    for attempt in range(max_retries):
        try:
            print(f"🤖 Tentative {attempt + 1}/{max_retries} d'analyse IA...")
            response = client.responses.create(
                model=MODEL_NAME,
                input=[
                    {"role": "system", "content": "You are a JSON API that only outputs valid JSON. Never add markdown formatting or explanatory text. Return only raw JSON."},
                    {"role": "user", "content": prompt}
                ],
                reasoning={"effort": "low"}  # Réduit pour éviter les explications
            )
            
            output = response.output_text.strip()
            print(f"✅ Réponse IA reçue ({len(output)} caractères)")
            return output

        except Exception as e:
            print(f"⚠️ Erreur API OpenAI (tentative {attempt + 1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                print(f"❌ Échec définitif après {max_retries} tentatives")
                return None
    
    return None

def send_discord_notification(report_json: str, commit_hash: str, commit_message: str) -> bool:
    """Envoie le rapport formaté sur Discord avec validation stricte"""
    try:
        # Nettoyage des balises Markdown et espaces
        cleaned_json = report_json.replace("```json", "").replace("```", "").strip()
        
        # Nettoyage supplémentaire : extraction du JSON si du texte est présent avant/après
        # Cherche le premier { et le dernier }
        start_idx = cleaned_json.find('{')
        end_idx = cleaned_json.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            cleaned_json = cleaned_json[start_idx:end_idx+1]
        
        # Tentative de parsing JSON brut
        try:
            raw_data = json.loads(cleaned_json)
        except json.JSONDecodeError as e:
            print(f"❌ JSON invalide reçu de l'IA: {e}")
            print(f"Extrait du contenu: {cleaned_json[:500]}...")
            return False
        
        # Validation stricte avec Pydantic
        try:
            validated_report = ReviewReport(**raw_data)
        except ValidationError as e:
            print(f"❌ Schéma JSON invalide (validation Pydantic échouée):")
            print(e)
            print(f"Données reçues: {raw_data}")
            return False
        
        # Conversion en dict avec données validées et sanitées
        data = validated_report.model_dump()
        
        # Couleur selon la note (Vert >= 15, Orange >= 10, Rouge < 10)
        score = data['score_global']
        if score >= 15:
            color = 5763719  # Vert
        elif score >= 10:
            color = 16776960  # Orange
        else:
            color = 15548997  # Rouge

        # Sanitation supplémentaire pour Discord (limitation de longueur des fields)
        points_forts_text = "\n".join([f"• {p[:150]}" for p in data['points_forts'][:5]]) or "Aucun"
        points_faibles_text = "\n".join([f"• {p[:150]}" for p in data['points_faibles'][:5]]) or "Aucun"
        
        # Limitation stricte des longueurs Discord (max 1024 par field)
        if len(points_forts_text) > 1024:
            points_forts_text = points_forts_text[:1020] + "..."
        if len(points_faibles_text) > 1024:
            points_faibles_text = points_faibles_text[:1020] + "..."

        embed = {
            "title": f"📝 Code Review : {score}/20",
            "description": f"**{commit_message[:100]}** (`{commit_hash}`)\n\n{data['resume'][:200]}",
            "color": color,
            "fields": [
                {"name": "🧠 SOLID", "value": f"{data['details']['SOLID']}/20", "inline": True},
                {"name": "👀 Clarté", "value": f"{data['details']['Clarte']}/20", "inline": True},
                {"name": "🛡️ Sécurité", "value": f"{data['details']['Securite']}/20", "inline": True},
                {"name": "✅ Top", "value": points_forts_text, "inline": False},
                {"name": "⚠️ Flop", "value": points_faibles_text, "inline": False},
                {"name": "💡 Conseil", "value": data['conseil_mentor'][:300], "inline": False}
            ],
            "footer": {"text": f"Moteur: {MODEL_NAME} • CulturiaQuests CI/CD"}
        }

        response = requests.post(DISCORD_WEBHOOK, json={"embeds": [embed]}, timeout=10)
        
        if response.status_code == 204:
            print("✅ Rapport envoyé sur Discord avec succès")
            return True
        else:
            print(f"⚠️ Discord a répondu avec le code {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur réseau Discord: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue lors de l'envoi Discord: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("🤖 AI Code Reviewer - CulturiaQuests")
    print("="*60)
    
    # Vérification des variables d'environnement
    if not API_KEY:
        print("❌ OPENAI_API_KEY non définie")
        sys.exit(1)
    if not DISCORD_WEBHOOK:
        print("❌ DISCORD_WEBHOOK_URL non définie")
        sys.exit(1)
    
    changed_files = get_changed_files()
    
    if not changed_files:
        print("ℹ️ Aucun fichier de code pertinent modifié.")
        sys.exit(0)

    # Récupération des informations du commit
    commit_hash, commit_message = get_commit_info()
    print(f"📌 Commit: {commit_message} ({commit_hash})")

    print(f"\n📋 Fichiers détectés: {len(changed_files)}")
    for f in changed_files:
        print(f"  - {f}")
    
    print(f"\n🚀 Analyse IA en cours avec {MODEL_NAME}...\n")
    
    content_to_analyze = ""
    total_chars = 0
    
    for file in changed_files:
        file_content = get_file_content(file)
        content_to_analyze += f"\n--- FICHIER: {file} ---\n"
        content_to_analyze += file_content
        total_chars += len(file_content)

    print(f"📊 Total à analyser: {total_chars} caractères")
    
    # Troncation de sécurité avec logging détaillé
    if len(content_to_analyze) > MAX_CONTENT_LENGTH:
        original_length = len(content_to_analyze)
        content_to_analyze = content_to_analyze[:MAX_CONTENT_LENGTH]
        truncated_chars = original_length - MAX_CONTENT_LENGTH
        print(f"⚠️ Contenu tronqué: {truncated_chars} caractères supprimés (limite: {MAX_CONTENT_LENGTH})")
        print(f"⚠️ Cela représente {(truncated_chars/original_length)*100:.1f}% du contenu total")
        content_to_analyze += f"\n\n... [TRONQUÉ: {truncated_chars} caractères omis] ..."

    report = analyze_code(content_to_analyze)
    
    if report:
        success = send_discord_notification(report, commit_hash, commit_message)
        if success:
            print("\n" + "="*60)
            print("✅ Workflow terminé avec succès")
            print("="*60)
            sys.exit(0)
        else:
            print("\n" + "="*60)
            print("⚠️ Analyse terminée mais échec d'envoi Discord")
            print("="*60)
            sys.exit(1)
    else:
        print("\n" + "="*60)
        print("❌ Échec de l'analyse IA")
        print("="*60)
        sys.exit(1)