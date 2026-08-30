### قَنَوة — lecture du français, 6ème année (Tunisie) · paquet Windows

**Contenu de `Qanawa-windows.zip`**
- `Qanawa.exe` — lanceur .NET 4.0 (≈ 26 Ko) : sert `prototype\` sur `http://localhost:8137/`,
  ouvre le navigateur, icône dans la zone de notification. Aucun installateur, aucun droit admin.
- `prototype\` — l'application complète (HTML/CSS/JS, 4 cartes de textes, hors-ligne via service worker).
- `README-WINDOWS.md` — installation, SmartScreen, reconstruction, pannes connues.
- `Qanawa.ico` — icône (régénérée par `win32/QanawaIcon.cs`, rien de binaire dans le dépôt).

**Pourquoi un serveur local plutôt qu'un double-clic sur `index.html`** : `localStorage` fiable et
partagé (le cahier de l'élève survit aux redémarrages), service worker et `manifest.webmanifest`
autorisés (`file://` les refuse), URL stable pour l'export CSV de l'enseignant.

**Vérifications faites à la compilation** (voir le log du job `build`) : `/health`, 8 fichiers en 200
avec bons MIME, traversée de chemin bloquée, puis le harnais de parcours complet (51 contrôles :
7 étapes de leçon, malette, lecteur, quiz « indice jamais la réponse », garde-fous du robot نور,
plafond de 20★/jour, révision espacée, stations `#/phono` et `#/placement`, vue enseignant).

**Sécurité / vie privée** : écoute uniquement `localhost` ; aucune donnée envoyée sur le réseau ;
un seul fichier écrit hors dossier (`%TEMP%\qanawa-manifest-<pid>.manifest`, texte) ; les progrès des
élèves restent dans le profil du navigateur du poste.

**Limite assumée** : binaire non signé → SmartScreen affiche « Windows a protégé votre PC »
(*Plus d'infos → Exécuter quand même*). La voix et la dictée dépendent des voix installées sur le poste
(voir README §C). Texte du manuel : seule la carte M1 reprend un poème du domaine public ; les autres
sont des textes originaux calibrés au programme.

Somme de contrôle : `Qanawa-windows.zip.sha256` — `certutil -hashfile Qanawa-windows.zip SHA256` pour vérifier.
