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

Ils sont **déjà rébasez sur `e788491`** (vérifié : `git merge-base --is-ancestor e788491 HEAD` → vrai),
donc le push est un simple **fast-forward**, sans `--force`.

### Pourquoi ils ne sont pas encore en ligne
Le token n° 2 a été **supprimé du disque dès la fin de la dernière opération** (`rm -f /tmp/.gh2`, vérifié :
`No such file or directory`). Sans jeton, `git push` échoue (`fatal: could not read Username`) — je ne
contourne pas l'authentification.

### Deux façons de finir, au choix

**A. Je pousse moi-même (30 secondes de votre côté).** Recréez un jeton fine-grained **jetable**
(`GUIDE-TOKEN-GITHUB.md` § « TOKEN n° 2 » donne les cases exactes : dépôt unique `douhmans/qanawa-francais`,
expiration 1 jour, `Contents: Read and write` **seulement** — pas besoin de `Workflows` ni d'`Issues`, tout est déjà fait).
Collez-le ici ; je lance le push, je vérifie l'arbre en ligne, puis je supprime le fichier et je vous
rappelle de révoquer.

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
