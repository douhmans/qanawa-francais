# Fichiers d’exploitation — à activer manuellement (choix délibéré)

`curriculum.yml` est un workflow GitHub Actions **prêt à l’emploi** : il régénère
`data/curriculum-6e.json` depuis `official-docs/manuel-lecture-6e.pdf`, exécute
`tools/check_curriculum.py`, puis échoue si le référentiel committé diffère du référentiel généré
(`git diff --exit-code`). Autrement dit : **impossible de modifier le mapping du programme sans le
regénérer depuis la source officielle.**

## Pourquoi il n’est pas dans `.github/workflows/`

GitHub refuse qu’un *personal access token* crée ou modifie un fichier sous `.github/workflows/`
sans la portée supplémentaire `workflow`. Le projet a été poussé avec un token à privilèges minimaux
(`Contents` + `Administration` uniquement) — voir `../PUSH.md`.

## L’activer (2 possibilités)

**A. Via l’interface (1 minute, sans token élargi)**
Repository → **Add file → Create a new file** → nom du chemin : `.github/workflows/curriculum.yml`
→ collez le contenu de `ops/curriculum.yml` → **Commit directly to `main`**.
Puis **Actions** → le workflow apparaît, et se déclenche sur tout push touchant `data/`, `tools/`,
`official-docs/`.

**B. Via git, avec un token qui a la portée `Workflows: Read and write`**
```bash
mkdir -p .github/workflows && git mv ops/curriculum.yml .github/workflows/curriculum.yml
git commit -m "ci: activer le contrôle du référentiel programme"
git push origin main
```

## Ajouter un badge (optionnel)

```md
![curriculum](https://github.com/douhmans/qanawa-francais/actions/workflows/curriculum.yml/badge.svg)
```
