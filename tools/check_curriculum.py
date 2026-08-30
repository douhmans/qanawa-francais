#!/usr/bin/env python3
"""Contrôle de cohérence du référentiel programme (à brancher en CI)."""
import json, sys
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "data/curriculum-6e.json", encoding="utf-8"))
err = []
mods = d["modules"]
if len(mods) != 8: err.append(f"modules={len(mods)} attendu 8")
for m in mods:
    for k in ("module", "theme", "slogan", "projet_ecriture", "objectifs_oraux", "outils_langue", "textes", "unite"):
        if not m.get(k): err.append(f"M{m.get('module')}: champ manquant {k}")
    if len(m["textes"]["lecture"]) != 3: err.append(f"M{m['module']}: {len(m['textes']['lecture'])} textes de lecture (attendu 3)")
    for sub in ("grammaire", "conjugaison", "orthographe"):
        if not m["outils_langue"].get(sub): err.append(f"M{m['module']}: outils_langue.{sub} manquant")
    if m["unite"] != (m["module"] + 1) // 2: err.append(f"M{m['module']}: unité {m['unite']} incohérente")
if len(d["journees_type"]) != 8: err.append("journées-type != 8")
if len(d["criteres_evaluation_ecrit"]) != 7: err.append("critères d'écriture != 7")
if len(d["phonetique_contrastes_officiels"]) < 12: err.append("contrastes phonétiques insuffisants")
for j in d["journees_type"]:
    if not j["activites"]: err.append(f"{j['id']}: aucune activité")
phases = [p["id"] for p in d["sequence_lecture"]["phases"]]
if phases != ["anticipation", "globale", "analytique", "vocabulaire", "synthese"]:
    err.append(f"séquence de lecture détournée: {phases}")
if d["meta"]["volume_horaire"] != "8 h / semaine": err.append("volume horaire inattendu")
print("ERREURS:" if err else "✅ référentiel conforme au programme officiel (8 modules / 5 textes / J1-J8 / C1-C7)")
for e in err: print("  –", e)
sys.exit(1 if err else 0)
