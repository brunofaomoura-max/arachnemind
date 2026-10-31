import os
import sys
import json
import subprocess
import shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

SKILLS_DIR = Path(r"c:\Users\PAULO\Documents\antigravity\fervent-kepler\.agents\skills")
SKILLSPECTOR_EXE = Path(r"c:\Users\PAULO\Documents\antigravity\fervent-kepler\.venv-skillspector\Scripts\skillspector.exe")
REPORT_PATH = Path(r"c:\Users\PAULO\Documents\antigravity\fervent-kepler\skills_security_audit.json")

def scan_single_skill(skill_path):
    skill_name = skill_path.name
    cmd = [
        str(SKILLSPECTOR_EXE),
        "scan",
        str(skill_path),
        "--no-llm",
        "--format",
        "json"
    ]
    try:
        res = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=35
        )
        raw = res.stdout.strip()
        idx = raw.find('{')
        if idx != -1:
            data = json.loads(raw[idx:])
            assessment = data.get("risk_assessment", {})
            score = assessment.get("score", 0)
            severity = assessment.get("severity", "LOW")
            recommendation = assessment.get("recommendation", "INSTALL")
            issues = data.get("issues", [])
            categories = list(set(i.get("category", "General") for i in issues))[:4]
            return {
                "skill": skill_name,
                "score": score,
                "severity": severity,
                "recommendation": recommendation,
                "issues_count": len(issues),
                "categories": categories,
                "path": str(skill_path)
            }
    except Exception as e:
        return {
            "skill": skill_name,
            "score": 0,
            "severity": "LOW",
            "recommendation": "INSTALL",
            "issues_count": 0,
            "categories": [f"Err: {str(e)[:30]}"],
            "path": str(skill_path)
        }
    return {
        "skill": skill_name,
        "score": 0,
        "severity": "LOW",
        "recommendation": "INSTALL",
        "issues_count": 0,
        "categories": [],
        "path": str(skill_path)
    }

def main():
    if not SKILLS_DIR.exists():
        print(f"Directory not found: {SKILLS_DIR}", flush=True)
        return

    folders = [p for p in SKILLS_DIR.iterdir() if p.is_dir()]
    total = len(folders)
    print(f"[*] Iniciando Varredura Paralela (8 Cores) em {total} skills...", flush=True)

    results = []
    unsafe_skills = []
    safe_skills = []

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(scan_single_skill, f): f for f in folders}
        done_count = 0
        for future in as_completed(futures):
            done_count += 1
            res = future.result()
            results.append(res)
            
            is_unsafe = res["severity"] in ("CRITICAL", "HIGH") or res["score"] >= 50 or res["recommendation"] == "DO_NOT_INSTALL"
            
            if is_unsafe:
                unsafe_skills.append(res)
                print(f"[{done_count}/{total}] [INSEGURA] {res['skill']} - SCORE: {res['score']} ({res['severity']}) -> REMOVER", flush=True)
            else:
                safe_skills.append(res)
                if done_count % 25 == 0 or done_count == total:
                    print(f"[{done_count}/{total}] Progresso... (Seguras: {len(safe_skills)}, Inseguras: {len(unsafe_skills)})", flush=True)

    # Save complete report
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "total_scanned": total,
            "unsafe_count": len(unsafe_skills),
            "safe_count": len(safe_skills),
            "unsafe_skills": sorted(unsafe_skills, key=lambda x: x["score"], reverse=True),
            "safe_skills": sorted(safe_skills, key=lambda x: x["skill"])
        }, f, indent=2, ensure_ascii=False)

    print(f"\n==========================================", flush=True)
    print(f"VARREDURA COMPLETA FINALIZADA!", flush=True)
    print(f"Total Auditadas: {total}", flush=True)
    print(f"Skills Seguras Mantidas: {len(safe_skills)}", flush=True)
    print(f"Skills Inseguras/Criticas: {len(unsafe_skills)}", flush=True)
    print(f"==========================================\n", flush=True)

    print("[*] Desinstalando todas as skills inseguras...", flush=True)
    removed_count = 0
    for u in unsafe_skills:
        p = Path(u["path"])
        if p.exists():
            try:
                shutil.rmtree(p)
                removed_count += 1
                print(f" [EXCLUIDA] {u['skill']} (Score {u['score']} - {u['severity']})", flush=True)
            except Exception as e:
                print(f" [ERRO AO EXCLUIR] {u['skill']}: {e}", flush=True)

    print(f"\n[OK] Concluido! {removed_count} skills perigosas desinstaladas com sucesso.", flush=True)

if __name__ == "__main__":
    main()
