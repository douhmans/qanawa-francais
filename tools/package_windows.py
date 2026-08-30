#!/usr/bin/env python3
"""Emballe le lanceur Windows déjà compilé à côté du contenu pédagogique.

    python3 tools/package_windows.py [chemin/vers/Qanawa.exe] [vers/le/dossier/prototype]

Produit, à la racine du dépôt :
    win32/dist/Qanawa.exe                 (copie prête à épingler)
    win32/dist/Qanawa-windows.zip         (exe + prototype + README)
    win32/dist/Qanawa-windows.zip.sha256  (à vérifier sur le poste : certutil -hashfile … SHA256)

Ce script ne compile PAS : sous Windows on utilise win32/build_exe.bat (le compilateur C# de
.NET Framework 4.x y est déjà), sous CI c'est .github/workflows/release-windows.yml.
"""
from __future__ import annotations
import hashlib
import os
import shutil
import sys
import zipfile

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main() -> int:
    exe = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RACINE, "build", "win", "Qanawa.exe")
    proto = sys.argv[2] if len(sys.argv) > 2 else os.path.join(RACINE, "prototype")
    dist = os.path.join(RACINE, "win32", "dist")
    if not os.path.isfile(exe):
        print("✗ lanceur introuvable : " + exe, file=sys.stderr)
        print("  → à compiler sous Windows : win32\\build_exe.bat", file=sys.stderr)
        print("  → ou reprendre le binaire publié : Releases → Qanawa-windows.zip", file=sys.stderr)
        return 1
    if not os.path.isfile(os.path.join(proto, "index.html")):
        print(f"✗ prototype introuvable : {proto}", file=sys.stderr)
        return 1

    os.makedirs(dist, exist_ok=True)
    shutil.copy2(exe, os.path.join(dist, "Qanawa.exe"))
    ico = os.path.join(os.path.dirname(exe), "Qanawa.ico")
    if os.path.isfile(ico):
        shutil.copy2(ico, os.path.join(dist, "Qanawa.ico"))

    zip_path = os.path.join(dist, "Qanawa-windows.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.write(os.path.join(dist, "Qanawa.exe"), "Qanawa/Qanawa.exe")
        if os.path.isfile(ico):
            z.write(os.path.join(dist, "Qanawa.ico"), "Qanawa/Qanawa.ico")
        for f in ("README-WINDOWS.md", "RELEASE-NOTES.md"):
            p = os.path.join(RACINE, "win32", f)
            if os.path.isfile(p):
                z.write(p, "Qanawa/" + f)
        for root, dirs, files in os.walk(proto):
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "__pycache__"}]
            for name in sorted(files):
                src = os.path.join(root, name)
                rel = os.path.relpath(src, os.path.dirname(proto)).replace(os.sep, "/")
                z.write(src, "Qanawa/" + rel)
        for root, dirs, files in os.walk(os.path.join(RACINE, "win32")):
            for name in files:
                if name.endswith((".cs", ".bat")):
                    src = os.path.join(root, name)
                    z.write(src, "Qanawa/win32-src/" + name)

    digest = hashlib.sha256(open(zip_path, "rb").read()).hexdigest()
    open(zip_path + ".sha256", "w").write(digest + "  Qanawa-windows.zip\n")

    n = len(zipfile.ZipFile(zip_path).namelist())
    print(f"✓ {os.path.relpath(zip_path, RACINE)}  —  {n} fichiers, {os.path.getsize(zip_path):,} octets")
    print(f"✓ SHA-256 : {digest}")
    print("  sur le poste :  certutil -hashfile Qanawa-windows.zip SHA256")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
