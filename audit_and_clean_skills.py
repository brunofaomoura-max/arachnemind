import os
import sys
import json
import subprocess
import shutil
from pathlib import Path

SKILLS_DIR = Path(r"c:\Users\PAULO\Documents\antigravity\fervent-kepler\.agents\skills")
SKILLSPECTOR_EXE = Path(r"c:\Users\PAULO\Documents\antigravity\fervent-kepler\.venv-skillspector\Scripts\skillspector.exe")
REPORT_PATH = Path(r"c:\Users\PAULO\Documents\antigravity\fervent-kepler\skills_security_audit.json")

def main():
    if not SKILLS_DIR.exists():
        print(f"Skills dir not found: {SKILLS_DIR}")
        return

    skill_folders = [p for p in SKILLS_DIR.iterdir() if p.is_dir()]
    total = len(skill_folders)
    print(f"Total skills to audit: {total}")

    audit_results = []
    unsafe_skills = []

    for idx, skill_path in enumerate(skill_folders, 1):
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
                timeout=60
            )
            raw_stdout = res.stdout.strip()
            
            # Find JSON start in stdout (in case there are banner logs)
            json_start = raw_stdout.find('{')
            if json_start != -1:
                data = json.loads(raw_stdout[json_start:])
                assessment = data.get("risk_assessment", {})
                score = assessment.get("score", 0)
                severity = assessment.get("severity", "UNKNOWN")
                recommendation = assessment.get("recommendation", "UNKNOWN")
                issues = data.get("issues", [])
                
                issue_categories = list(set(i.get("category", "General") for i in issues))[:5]
                
                record = {
                    "skill": skill_name,
                    "score": score,
                    "severity": severity,
                    "recommendation": recommendation,
                    "issues_count": len(issues),
                    "issue_categories": issue_categories
                }
                audit_results.append(record)
                
                is_unsafe = severity in ("CRITICAL", "HIGH") or recommendation == "DO_NOT_INSTALL"
                status_str = f"[{idx}/{total}] {skill_name}: Score {score} ({severity}) - {recommendation}"
                print(status_str)
                
                if is_unsafe:
                    unsafe_skills.append(record)
            else:
                print(f"[{idx}/{total}] {skill_name}: No JSON returned")
                audit_results.append({
                    "skill": skill_name,
                    "score": 0,
                    "severity": "UNKNOWN",
                    "recommendation": "SCAN_FAILED",
                    "issues_count": 0,
                    "issue_categories": []
                })
        except subprocess.TimeoutExpired:
            print(f"[{idx}/{total}] {skill_name}: TIMEOUT")
            audit_results.append({
                "skill": skill_name,
                "score": 50,
                "severity": "MEDIUM",
                "recommendation": "TIMEOUT",
                "issues_count": 0,
                "issue_categories": ["Timeout"]
            })
        except Exception as e:
            print(f"[{idx}/{total}] {skill_name}: ERROR {e}")

    # Save full report
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "total_scanned": total,
            "unsafe_count": len(unsafe_skills),
            "unsafe_skills": unsafe_skills,
            "all_results": audit_results
        }, f, indent=2, ensure_ascii=False)

    print(f"\n==========================================")
    print(f"AUDIT COMPLETE!")
    print(f"Total Scanned: {total}")
    print(f"Total Unsafe (CRITICAL/HIGH): {len(unsafe_skills)}")
    print(f"==========================================\n")

    # Uninstall unsafe skills
    print("UNINSTALLING UNSAFE SKILLS...")
    uninstalled = []
    for item in unsafe_skills:
        name = item["skill"]
        folder = SKILLS_DIR / name
        if folder.exists():
            try:
                shutil.rmtree(folder)
                uninstalled.append(name)
                print(f" [REMOVED] {name} ({item['severity']} - Score: {item['score']})")
            except Exception as e:
                print(f" [FAILED TO REMOVE] {name}: {e}")

    print(f"\nSuccessfully uninstalled {len(uninstalled)} unsafe skills.")

if __name__ == "__main__":
    main()
