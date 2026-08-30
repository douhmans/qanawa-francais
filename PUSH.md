## ✅ poussé le 2026-08-30 — `main` = `3107f61`+ (tag `v0.1.0-prototype`, Release avec 4 fichiers)

```
e788491..1ca7fff  main -> main     (16 commits : prototype, win32, harnais, notices)
refs/tags/v0.1.0-prototype         (créé)
Release 379324023 (prérelase)      → https://github.com/douhmans/qanawa-francais/releases/tag/v0.1.0-prototype
   Qanawa-windows.zip        87,309 o   (SHA-256 re-vérifié identique après re-téléchargement)
   Qanawa-windows.zip.sha256     85 o
   Qanawa.exe                33,280 o
   Qanawa.ico                 5,439 o
arbre en ligne : 54 fichiers · 41,4 Mo · truncated: false
```

**Réparation faite juste après** : le commit `413c99a` avait écrasé `README.md` (la présentation du projet)
par `prototype/README.md` — une de mes commandes `cp` visait la racine au lieu de `prototype/`.
Le README d'origine (89 lignes, avec la section Windows) a été restauré depuis `0093b59`, et l'encadré
« télécharger la Release » y a été ajouté. Les doublons `win32/README.md` et `win32/GUIDE-WINDOWS.md`
créés par la même erreur sont supprimés.

**Resté hors dépôt, volontairement** : les binaires (`win32/dist/*`, ignorés par `.gitignore`) — ils vivent
dans la Release. **Et le job Windows** `.qanawa-ci/workflows/release-windows.yml` : sa portée `Workflows`
n'a pas été accordée, donc il n'est pas dans `.github/workflows/`. Tant qu'il n'y est pas, le .exe n'est
pas recompilé par un vrai `windows-latest` (il a été produit par `mcs` sous Linux — IL valide, mais
l'affichage de la fenêtre reste non prouvé sur Windows).

**À faire de votre côté tout de suite** : révoquer le jeton collé dans la conversation →
<https://github.com/settings/tokens> (le fichier local a été supprimé, voir plus bas).

---

## Inventaire d'avant-push (conservé pour mémoire)

# État de la synchronisation — lecture attentive demandée

## Ce qui est **en ligne** (`github.com/douhmans/qanawa-francais`, `main`)

| Élément | Valeur vérifiée |
|---|---|
| Commit de tête | `e788491` |
| Workflow CI | `.github/workflows/curriculum.yml` → **curriculum · completed · success** (3 exécutions relevées) |
| Milestone | **#1** « Socle & données officielles (S-1 → S1) » |
| Labels | `pedagogie`, `frontend`, `ai`, `privacy`, `contenu`, `enhancement` |
| Issues | **#1 … #12** (les 12 sprints du chantier, créées par API) |
| Topics | `francais, tunisie, primaire, edtech, pwa, accessibilite` |
| Fichiers | 27 (dont 5 PDF CNIP dans `official-docs/`, ~39,3 Mo) |

## Ce qui est **local et attend un push** (3 commits, `main` = `24e737f`)

```
24e737f prototype: vert de bout en bout — harnais d'exécution + 3 bugs réels corrigés
64becc7 docs(prototype): mode d'emploi du test — 12 étapes élève, 6 points enseignant…
d7301e4 prototype: modèle premier jouable (S2–S10) sans build ni dépendances
```

Ils sont **déjà rébasez sur `e788491`** (`git merge-base --is-ancestor e788491 HEAD` → vrai),
donc le push est un simple **fast-forward**, sans `--force`.

### Pourquoi ils ne sont pas encore en ligne
Le token n° 2 a été **supprimé du disque dès la fin de la dernière opération** (`rm -f /tmp/.gh2`, vérifié :
`No such file or directory`). Sans jeton, `git push` échoue (`fatal: could not read Username`) — je ne
contourne pas l'authentification.

### Deux façons de finir, au choix

**A. Je pousse moi-même (30 secondes de votre côté).** Recréez un jeton fine-grained **jetable**
(`GUIDE-TOKEN-GITHUB.md` § « TOKEN n° 2 » donne les cases exactes : dépôt unique `douhmans/qanawa-francais`,
expiration 1 jour, `Contents: Read and write` **seulement** — pas besoin de `Workflows` ni d'`Issues`, tout est déjà fait).
Ports nécessaires, selon ce que vous voulez :
- **`Contents: Read and write`** → push des 7 commits (fast-forward), rien d'autre.
- **+ `Workflows: Read and write`** → si vous voulez aussi que le job Windows
  (`.qanawa-ci/workflows/release-windows.yml`) soit **actif** (copié dans `.github/workflows/`, il
  construira le `Qanawa.exe` sur un vrai poste Windows et le publiera en Release à chaque tag `v*`).
- La **Release** elle-même (binaire + ZIP + SHA-256) se crée avec le même token, portée `Contents` :
  `POST /repos/.../releases` + upload `application/zip` sur `uploads.github.com`.

Collez-le ici ; je lance le push, je crée la Release `v0.1.0-prototype` avec le ZIP déjà construit
(`win32/dist/Qanawa-windows.zip`, SHA-256 `5a06e7a7…b3ef`), je vérifie l'arbre en ligne, je supprime
le fichier du jeton, et je vous rappelle de révoquer.

**B. Vous poussez vous-même**, depuis un terminal où vous êtes connecté à GitHub :

```bash
cd /home/user/qanawa-francais
git push origin main          # fast-forward, aucun --force nécessaire
```

Si le dépôt local n'est pas sur votre machine : `prototype.zip` (43 Ko) est à la racine du workspace — il
contient le site complet, à déposer dans `prototype/`.

## Ce que le push apporterait
`prototype/` (9 fichiers : `index.html`, `app.js`, `data.js`, `teacher.html`, `teacher.js`, `styles.css`,
`sw.js`, `manifest.webmanifest`, `assets/icon.svg` + `README.md`), `tools/harnais_prototype.mjs`,
`GUIDE-TEST-PROTOTYPE.md`. Rien d'autre — les PDF officiels restent où ils sont, et le CI `curriculum`
ne sera pas affecté (il ne lit que `data/curriculum-6e.json`).

## Rappel sécurité (à faire de toute façon)
Révoquez les deux jetons déjà utilisés : <https://github.com/settings/personal-access-tokens>
→ `arena-push-qanawa-1j` et `arena-ci-issues-1j`. Ils ont une expiration d'un jour, mais la révocation
immédiate évite d'attendre. Aucun jeton n'a jamais été écrit dans le dépôt.
