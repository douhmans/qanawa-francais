# État du dépôt — et ce qui reste à faire

**Fait, vérifié côté GitHub :**

| Action | Résultat |
|---|---|
| Push `main` | `c9647fb..f01fa91` (fast-forward) · `git ls-remote` distant = local = `f01fa9154cdd7a43eb252b24384008f8e5cd3c85` |
| Renommage | `douhmans/-` → **`douhmans/qanawa-francais`** (HTTP 200 ; l'ancien lien répond encore — redirection vérifiée par `git ls-remote`) |
| Description | mise à jour en arabe (réf. CNIP + PWA + robot) |
| Topics | `tunisie, francais, primaire, edtech, pwa, accessibilite` |
| Contenu en ligne | **23 fichiers · 39,3 Mo** (`GET /git/trees/f01fa91…?recursive=1`) |

**Reste (2 points, à faire depuis github.com — pas de token nécessaire) :**

1. **Activer le contrôle continu du programme** : Repository → *Add file → Create a new file* →
   chemin `.github/workflows/curriculum.yml` → coller le contenu de `ops/curriculum.yml` → commit sur `main`.
   Motif du contournement : GitHub refuse qu'un token sans portée `workflow` écrive sous `.github/workflows/`
   (`remote rejected … without 'workflow' scope`) — on n'a pas demandé cette portée.
2. **Supprimer l'ancien dossier `fr_6eme/`** (duplicata des mêmes PDF sous des noms obscurs) :
   ouvrez `https://github.com/douhmans/qanawa-francais/tree/main/fr_6eme` → poubelle sur chaque fichier →
   commit direct sur `main`. (Un token fine-grained ne peut pas `--force`, d'où la voie UI.)
   ⚠️ `fr_6eme/` est encore référencé dans `docs-sources-officiels.md` (note « mis à la main ») : rien à changer,
   les mêmes documents existent désormais proprement dans `official-docs/`.

**Sécurité :** le token utilisé (portées `Contents` + `Administration` + `Metadata`, expiration 1 jour) n'a
jamais été écrit dans le dépôt ni dans un fichier de ce projet — il n'a servi que dans l'URL d'une commande
`git push`/en-tête `Authorization`, et son empreinte locale a été supprimée. À révoquer quand même ici :
**https://github.com/settings/personal-access-tokens** → `arena-push-qanawa-1j` → **Delete**.

**Après cela**, le vrai démarrage du chantier = coller `prompt-master.txt` dans l'agent de code, qui
enchaîne `S-1` (référentiel déjà là) → `S0` (scaffold Next.js) → `S1` (schéma + seed des 8 cartes).
