# Créer un token GitHub pour la plateforme — guide pas à pas (5 min)

Objectif : me donner **juste assez** de droits pour (1) pousser le commit `bc24b9c` sur `main`,
(2) renommer le dépôt `-` → `qanawa-francais`, (3) mettre à jour description + topics.
Puis vous supprimez le token. Durée de validité : **1 jour**.

---

## Étape 1 — Ouvrir le bon formulaire (fine-grained, pas classic)

Connecté à GitHub, ouvrez :

👉 **https://github.com/settings/personal-access-tokens/new**

Si vous passez par les menus : avatar (en haut à droite) → **Settings** → tout en bas de la colonne
de gauche **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → bouton
**Generate new token**.

⚠️ Si un onglet « Tokens (classic) » s'ouvre par erreur, revenez : le classic donne accès à **toutes**
vos repositories — on ne veut pas ça.

## Étape 2 — Haut du formulaire

| Champ | Valeur à mettre |
|---|---|
| **Token name** | `arena-push-qanawa-1j` |
| **Expiration** | **1 day** (minimum possible — ne prenez jamais "No expiration") |
| **Description** | `Pousser le commit du référentiel programme 6e + renommer le dépôt. Usage unique, à révoquer le jour même.` |
| **Resource owner** | votre compte **douhmans** (menu déroulant) |

## Étape 3 — « Repository access »

Cochez **Only select repositories**, puis dans le sélecteur tapez le nom du dépôt (il s'appelle
littéralement `-`, donc tapez `douhmans/-`) et sélectionnez-le.
**Ne laissez surtout pas « All repositories »** : ce serait donner accès à tout votre compte.

## Étape 4 — « Permissions » → déroulez **Repository permissions**

Dans les versions actuelles, la liste est vide au départ : cliquez sur **Add permissions** si les
lignes n'apparaissent pas. Réglez **uniquement ces trois lignes** (menu déroulant « Access » à
droite de chaque ligne) :

| Ligne (nom exact dans l'UI) | Access | Pourquoi |
|---|---|---|
| **Contents** | `Read and write` | créer le commit / pousser les fichiers |
| **Administration** | `Read and write` | renommer le dépôt + description + topics |
| **Metadata** | `Read-only` | obligatoire pour tout token (GitHub l'ajoute tout seul) |

Tout le reste doit rester **Non-permitted** (pas de *Workflows*, pas de *Pull requests*, pas de
*Secrets*, pas de *Actions*, pas de *Delete repository*). En bas, « Account permissions » : **rien**.

> 💡 Astuce : si la ligne **Administration** n'apparaît pas dans la liste, c'est que le champ
> Resource owner n'est pas encore sur votre compte — sélectionnez-le d'abord, la liste se complète.

## Étape 5 — Générer et copier

Cliquez sur **Generate token** (bouton vert, tout en bas). GitHub peut demander votre mot de passe
ou une validation 2FA — normal.

Vous verrez alors **une seule fois** un jeton qui commence par :

- `github_pat_1A...` (fine-grained) ✅ c'est celui qu'il faut
- ~~`ghp_...`~~ = classic ❌ jetez-le et recommencez à l'étape 1

Copiez-le intégralement (une seule ligne, ~90 caractères).

## Étape 6 — Me l'envoyer

Collez-le dans le chat, seul sur une ligne :

```
github_pat_1A………………
```

Dès réception je ferai, dans cet ordre :

```bash
git -c credential.helper= push https://x-access-token:<TOKEN>@github.com/douhmans/-.git main:main
curl -X PATCH -H "Authorization: Bearer <TOKEN>" https://api.github.com/repos/douhmans/- \
     -d '{"name":"qanawa-francais","description":"منصة رقمية لتسهيل فهم وقراءة نصوص الفرنسية لتلاميذ السنة السادسة ابتدائي بتونس — دعم بالصوت والصورة والترجمة وروبوت مرافق، مبنية على البرنامج الرسمي (CNIP)."}'
curl -X PUT -H "Authorization: Bearer <TOKEN>" -H "Accept: application/vnd.github.mercy-preview+json" \
     https://api.github.com/repos/douhmans/qanawa-francais/topics \
     -d '{"names":["tunisie","francais","primaire","edtech","pwa"]}'
git ls-remote https://x-access-token:<TOKEN>@github.com/douhmans/qanawa-francais.git   # vérification
```

Puis je vous affiche le `SHA` distant prouvant que `bc24b9c` est bien en ligne, et l'état du CI
`.github/workflows/curriculum.yml`.

## Étape 7 — Révoquer (30 s, le jour même)

👉 **https://github.com/settings/personal-access-tokens** → cliquez sur le token → **Delete**.
Le renommage conserve une redirection automatique : vos anciens liens `douhmans/-` continueront de
fonctionner, et le `git remote` du dépôt cloné se corrige avec
`git remote set-url origin https://github.com/douhmans/qanawa-francais.git`.

---

## Ce qui peut coincer (et la parade)

- **`remote: Write access to repository not granted`** → la ligne **Contents** est restée en
  `Read-only` : modifiez le token (bouton *Edit*) plutôt que d'en créer un nouveau.
- **`404 / Resource not accessible by personal access token`** sur le renommage → **Administration**
  n'a pas été mise en `Read and write`.
- **Le dépôt n'apparaît pas dans le sélecteur** → vous êtes connecté avec un autre compte que
  `douhmans` (vérifiez l'avatar en haut à droite).
- **Je n'ai pas de `gh` ici** : je passerai par l'API REST avec `curl`, c'est déjà prévu ci-dessus.
- **Vous ne voulez pas coller de jeton dans un chat** → gardez-le pour vous et poussez vous-même :
  `git clone https://github.com/douhmans/-.git && cd -` puis
  `git remote add bundle /chemin/qanawa-francais-main.bundle`, `git fetch bundle main`,
  `git reset --hard bundle/main`, `git push origin main`. (le bundle contient l'historique complet,
  vérifié : `git bundle verify` → `is okay`).

## Ce que le token NE peut PAS faire (et c'est voulu)

supprimer le dépôt, toucher à vos autres dépôts, lire vos secrets/workflow, modifier vos _paramètres de compte_, publier des releases, gérer les branches protégées… et il expire en 24 h.

---

# TOKEN n° 2 — pour que je finisse tout sur GitHub sans rien te faire faire

**Pourquoi il en faut un second** : le premier était limité à `Contents` + `Administration`, donc GitHub
a refusé d'écrire `.github/workflows/…` (portée `workflow` exigée). Et 2 commits sont encore locaux.
Le dépôt, vérifié à l'instant : **0 workflow Actions**, **0 issue**, **0 milestone** — donc rien à écraser.

## Ce que je ferai avec (5 minutes, dans cet ordre)

1. Pousser les 2 commits en attente (`18fb3b4` + l'ajout de `ops/issues-to-create.json`).
2. Créer **`.github/workflows/curriculum.yml`** (le contrôle continu du référentiel) → la CI tourne dès le push.
3. Créer le **milestone `v0.1 — pilote 20 élèves`** + les **5 labels** (`pedagogie`, `frontend`, `ai`, `privacy`, `contenu`).
4. Ouvrir les **12 issues** S-1→S10 déjà rédigées avec critères d'acceptation (contenu prêt dans `ops/issues-to-create.json`).
5. Régler les options du dépôt : squash-merge activé, suppression des branches au merge, *Auto-fix vulnerable dependencies*.
6. Te montrer les liens cliquables + l'état de la CI. **Puis tu révoques le token.**

## Les permissions exactes (3 lignes seulement)

| Ligne dans **Repository permissions** | Access | Sert à |
|---|---|---|
| **Contents** | `Read and write` | pousser les commits + créer le fichier de workflow |
| **Workflows** | `Read and write` | autoriser l'écriture sous `.github/workflows/` (sinon GitHub rejette) |
| **Issues** | `Read and write` | créer le milestone, les labels et les 12 issues |

Et rien d'autre : **pas** `Administration` (le dépôt est déjà renommé, la description est déjà en place),
**pas** `Pull requests`, `Secrets`, `Actions`, `Deployments`, `Pages`, **jamais** `Delete repository`.
`Metadata` reste en `Read-only` (ajout automatique). `Account permissions` : **rien**.

## Réglages du formulaire (identiques à la fois précédente)

- URL directe : **https://github.com/settings/personal-access-tokens/new**
- `Token name` = `arena-ci-issues-1j` · `Expiration` = **1 day** · `Resource owner` = **douhmans**
- `Repository access` = **Only select repositories** → **douhmans/qanawa-francais** (un seul dépôt)
- `Description` = `CI + issues du chantier. Usage unique, à révoquer le jour même.`

## Si « Workflows » te gêne

Cette portée permet de créer des workflows qui s'exécutent avec les secrets du dépôt. Elle est limitée à
**un seul dépôt** et expire en 24 h, donc le risque est borné — mais tu peux la cocher **Non-permitted** :
dans ce cas je pousse tout le reste, je crée `ops/curriculum.yml` en **PR** depuis une branche, et il te
reste un clic « Merge » sur la page du PR (GitHub refuse la création de workflow par token sans cette
portée, mais acceptera la fusion que **tu** fais dans l'interface). Dis-moi simplement laquelle des deux options.

## Ce que je ne ferai pas

Pas de force-push sur `main`, pas de suppression de branche ou de fichier hors `ops/`, pas de création de
release, pas de modification des règles de protection, pas de dépôt autre que `qanawa-francais`.

**Et la fois précédente :** le token `arena-push-qanawa-1j` doit être supprimé s'il ne l'est pas déjà →
**https://github.com/settings/personal-access-tokens** → *Delete*. Un token qui a traîné dans une
conversation ne mérite pas de vivre, même expiré.
