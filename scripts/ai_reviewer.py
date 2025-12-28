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
MAX_CONTENT_LENGTH = 80000  # Augmenté car les diffs sont plus compacts que le contenu complet
MAX_FILES_ANALYZED = 50

DISCORD_WEBHOOK = os.environ.get("DISCORD_WEBHOOK_URL")
API_KEY = os.environ.get("OPENAI_API_KEY")

# Mapping des auteurs Git vers les IDs Discord
AUTHOR_DISCORD_MAP = {
    "skycun": "202033313270071296",
    "lelio88": "479725850590183459",
    "ethanolove": "556125496979619840"
}

# Initialisation du client OpenAI
client = OpenAI(api_key=API_KEY)

# --- VALIDATION SCHÉMA PYDANTIC ---
class ReviewDetails(BaseModel):
    SOLID: int = Field(ge=0, le=20)
    Clarte: int = Field(ge=0, le=20)
    Securite: int = Field(ge=0, le=20)
    Performance: int = Field(ge=0, le=20)

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

def get_file_diff(filepath: str) -> str:
    """Récupère le diff d'un fichier spécifique"""
    try:
        result = subprocess.run(
            ["git", "diff", "HEAD~1", "HEAD", "--", filepath],
            capture_output=True, text=True, check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Erreur lors de la récupération du diff pour {filepath}: {e}")
        return ""

def get_file_stats(filepath: str) -> dict:
    """Récupère les statistiques d'un fichier (lignes ajoutées/supprimées)"""
    try:
        result = subprocess.run(
            ["git", "diff", "--numstat", "HEAD~1", "HEAD", "--", filepath],
            capture_output=True, text=True, check=True
        )
        stats = result.stdout.strip().split('\t')
        if len(stats) >= 2:
            return {
                "added": int(stats[0]) if stats[0] != '-' else 0,
                "deleted": int(stats[1]) if stats[1] != '-' else 0
            }
    except (subprocess.CalledProcessError, ValueError) as e:
        print(f"⚠️ Erreur stats pour {filepath}: {e}")
    return {"added": 0, "deleted": 0}

def get_commit_info():
    """Récupère le message, le hash et l'auteur du dernier commit"""
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

        # Récupère l'auteur du commit (nom d'utilisateur Git)
        author_result = subprocess.run(
            ["git", "log", "-1", "--pretty=%an"],
            capture_output=True, text=True, check=True
        )
        commit_author = author_result.stdout.strip()

        return commit_hash, commit_message, commit_author
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Erreur lors de la récupération des infos du commit: {e}")
        return "unknown", "Commit inconnu", "unknown"

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

    # Prompt amélioré avec critères détaillés et sans exemple biaisé
    prompt = f"""
Tu es un code reviewer senior expert. Analyse les CHANGEMENTS de code ci-dessous et évalue-les selon des critères stricts.

CRITÈRES D'ÉVALUATION (sur 20) :

1. **SOLID** (0-20) - Principes de conception :
   - Single Responsibility : Chaque classe/fonction a-t-elle une seule raison de changer ?
   - Open/Closed : Le code est-il extensible sans modification ?
   - Liskov Substitution : Les héritages sont-ils corrects ?
   - Interface Segregation : Pas de dépendances inutiles ?
   - Dependency Inversion : Dépendances vers abstractions ?
   - NOTE : 0-5=Très mauvais, 6-10=Insuffisant, 11-14=Correct, 15-17=Bon, 18-20=Excellent

2. **Clarté** (0-20) - Lisibilité et maintenabilité :
   - Nommage explicite et cohérent ?
   - Structure logique et organisation claire ?
   - Complexité cognitive faible ?
   - Documentation/commentaires pertinents (pas excessifs) ?
   - NOTE : 0-5=Illisible, 6-10=Confus, 11-14=Acceptable, 15-17=Clair, 18-20=Exemplaire

3. **Sécurité** (0-20) - Bonnes pratiques et vulnérabilités :
   - Validation des entrées utilisateur ?
   - Pas d'injection (SQL, XSS, etc.) ?
   - Gestion sécurisée des erreurs (pas d'exposition de secrets) ?
   - Authentification/autorisation appropriées ?
   - Pas de dépendances vulnérables ?
   - NOTE : 0-5=Dangereuses vulnérabilités, 6-10=Risques significatifs, 11-14=Basique, 15-17=Sécurisé, 18-20=Niveau production

4. **Performance** (0-20) - Efficacité et optimisation :
   - Complexité algorithmique appropriée (O(n) vs O(n²), etc.) ?
   - Utilisation efficace de la mémoire (pas de fuites, copies inutiles) ?
   - Requêtes base de données optimisées (N+1 queries, indexation) ?
   - Mise en cache pertinente ?
   - Pas de calculs redondants ou boucles inutiles ?
   - Chargement lazy/eager approprié ?
   - NOTE : 0-5=Très inefficace, 6-10=Problèmes notables, 11-14=Acceptable, 15-17=Optimisé, 18-20=Hautement performant

**SCORE GLOBAL** : Moyenne pondérée des 4 critères (pas juste la moyenne arithmétique).
- Pénalise fortement les scores <10 dans une catégorie
- Un excellent code peut avoir 16-18/20
- 20/20 est exceptionnel et très rare (code production parfait)
- Un code médiocre doit avoir 8-12/20, pas 15/20
- Considère SOLID, Clarté, Sécurité ET Performance dans le calcul

CONSIGNES STRICTES :
- Sois OBJECTIF et EXIGEANT dans ta notation
- Varie les notes selon la QUALITÉ RÉELLE du code
- Ne donne PAS systématiquement 14-16/20
- Un petit changement cosmétique mérite 8-11/20
- Un refactoring majeur bien fait mérite 15-18/20
- Identifie 2-4 points forts ET 2-4 points faibles réels

RETOURNE UNIQUEMENT CE JSON (sans ```json, sans texte avant/après) :
{{
    "score_global": <nombre 0-20>,
    "details": {{
        "SOLID": <nombre 0-20>,
        "Clarte": <nombre 0-20>,
        "Securite": <nombre 0-20>,
        "Performance": <nombre 0-20>
    }},
    "resume": "<phrase courte résumant l'analyse>",
    "points_forts": ["<point fort 1>", "<point fort 2>"],
    "points_faibles": ["<point faible 1>", "<point faible 2>"],
    "conseil_mentor": "<conseil concret et actionnable pour améliorer le code>"
}}

CHANGEMENTS À ANALYSER :
{files_content}

RAPPEL : Retourne UNIQUEMENT le JSON, sans markdown, sans explications."""

    max_retries = 2
    for attempt in range(max_retries):
        try:
            print(f"🤖 Tentative {attempt + 1}/{max_retries} d'analyse IA...")
            response = client.responses.create(
                model=MODEL_NAME,
                input=[
                    {"role": "system", "content": "You are a senior code reviewer API. You output ONLY valid JSON, no markdown, no explanations. Be critical and objective in your scoring - vary scores based on actual code quality."},
                    {"role": "user", "content": prompt}
                ],
                reasoning={"effort": "medium"}  # Augmenté pour analyse approfondie
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

def get_discord_mention(author: str) -> str:
    """Retourne la mention Discord de l'auteur si connu, sinon le nom"""
    # Normalise le nom (lowercase et supprime les espaces)
    author_normalized = author.lower().strip().replace(" ", "")

    # Cherche dans le mapping
    discord_id = AUTHOR_DISCORD_MAP.get(author_normalized)

    if discord_id:
        return f"<@{discord_id}>"
    else:
        return author

def send_discord_notification(report_json: str, commit_hash: str, commit_message: str, commit_author: str, change_context: str = "") -> bool:
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

        # Construction de la description avec contexte des changements
        author_mention = get_discord_mention(commit_author)
        description = f"**{commit_message[:100]}** (`{commit_hash}`)\n"
        description += f"👤 Auteur : {author_mention}\n"
        if change_context:
            description += f"📦 {change_context}\n"
        description += f"\n{data['resume'][:200]}"

        embed = {
            "title": f"📝 Code Review : {score}/20",
            "description": description,
            "color": color,
            "fields": [
                {"name": "🧠 SOLID", "value": f"{data['details']['SOLID']}/20", "inline": True},
                {"name": "👀 Clarté", "value": f"{data['details']['Clarte']}/20", "inline": True},
                {"name": "🛡️ Sécurité", "value": f"{data['details']['Securite']}/20", "inline": True},
                {"name": "⚡ Performance", "value": f"{data['details']['Performance']}/20", "inline": True},
                {"name": "✅ Top", "value": points_forts_text, "inline": False},
                {"name": "⚠️ Flop", "value": points_faibles_text, "inline": False},
                {"name": "💡 Conseil", "value": data['conseil_mentor'][:300], "inline": False}
            ],
            "footer": {"text": f"Moteur: {MODEL_NAME} • CulturiaQuests CI/CD"}
        }

        # Prépare le payload avec mention de l'auteur
        payload = {"embeds": [embed]}

        # Ajoute une mention en texte si l'auteur est connu (pour notifier)
        if author_mention.startswith("<@"):
            payload["content"] = f"{author_mention} Nouvelle code review disponible !"

        response = requests.post(DISCORD_WEBHOOK, json=payload, timeout=10)
        
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
    commit_hash, commit_message, commit_author = get_commit_info()
    print(f"📌 Commit: {commit_message} ({commit_hash})")
    print(f"👤 Auteur: {commit_author}")

    print(f"\n📋 Fichiers détectés: {len(changed_files)}")
    for f in changed_files:
        print(f"  - {f}")
    
    print(f"\n🚀 Analyse IA en cours avec {MODEL_NAME}...\n")

    content_to_analyze = ""
    total_chars = 0
    total_added = 0
    total_deleted = 0

    for file in changed_files:
        # Récupération du diff au lieu du contenu complet
        file_diff = get_file_diff(file)
        stats = get_file_stats(file)

        total_added += stats['added']
        total_deleted += stats['deleted']

        total_chars += len(file_diff)

    # Détermine l'ampleur du changement
    total_changes = total_added + total_deleted
    if total_changes < 10:
        change_magnitude = "TRÈS PETIT (ajustement mineur)"
    elif total_changes < 50:
        change_magnitude = "PETIT (modification simple)"
    elif total_changes < 200:
        change_magnitude = "MOYEN (feature ou refactoring)"
    else:
        change_magnitude = "IMPORTANT (refactoring majeur ou nouvelle feature)"

    # En-tête contextuel enrichi
    content_to_analyze = f"""
CONTEXTE DU COMMIT :
Commit: {commit_hash}
Message: {commit_message}
Fichiers modifiés: {len(changed_files)}
Ampleur: {change_magnitude} (+{total_added}/-{total_deleted} lignes)

CONSIGNE D'ÉVALUATION :
L'ampleur des changements doit influencer ta notation :
- Changement très petit (<10 lignes) : Si c'est juste cosmétique ou trivial, note 8-12/20. Si c'est un fix critique bien fait, note 13-16/20.
- Changement petit (10-50 lignes) : Évalue la qualité technique. Code basique: 10-13/20, code solide: 14-16/20.
- Changement moyen (50-200 lignes) : Potentiel pour excellentes notes si bien architecturé (15-18/20).
- Changement important (>200 lignes) : Évalue la cohérence globale et l'architecture (12-18/20 selon qualité).

INSTRUCTIONS :
Analyse les changements ci-dessous (format diff git).
- Les lignes '+' sont des ajouts, les lignes '-' sont des suppressions
- Évalue la QUALITÉ de ces CHANGEMENTS, pas du fichier complet
- Sois CRITIQUE et VARIE tes notes selon la vraie qualité

"""

    # Ajout des diffs de chaque fichier
    for file in changed_files:
        file_diff = get_file_diff(file)
        stats = get_file_stats(file)

        content_to_analyze += f"\n{'='*60}\n"
        content_to_analyze += f"FICHIER: {file}\n"
        content_to_analyze += f"Lignes ajoutées: +{stats['added']} | Lignes supprimées: -{stats['deleted']}\n"
        content_to_analyze += f"{'='*60}\n"
        content_to_analyze += file_diff if file_diff else "[Nouveau fichier ou fichier binaire]\n"
        content_to_analyze += "\n"

    print(f"📊 Changements détectés: {change_magnitude}")
    print(f"📊 Détails: +{total_added} / -{total_deleted} lignes sur {len(changed_files)} fichier(s)")
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
        # Ajout du contexte des changements pour la notification Discord
        change_context = f"{len(changed_files)} fichier(s) • +{total_added}/-{total_deleted} lignes"
        success = send_discord_notification(report, commit_hash, commit_message, commit_author, change_context)
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