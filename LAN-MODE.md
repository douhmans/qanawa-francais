# Déployer sur le serveur de l'école (toute la salle en réseau local)

Le même code, servi par une machine de la salle au lieu d'un poste. Les élèves ouvrent une URL,
l'enseignant ouvre `…/teacher.html`. **Aucune connexion Internet nécessaire**, aucune donnée ne sort
du réseau de l'école.

---

## 1. Trois façons de servir (choisir une seule)

### a) Poste Windows de la salle (le plus simple — 0 installation)

```bat
C:\Qanawa\Qanawa.exe --lan --serve-only --port 8137
```

Windows refuse le préfixe `http://+:8137/` sans réservation. Une seule fois, **invite de commandes
en administrateur** :

```bat
netsh http add urlacl url=http://+:8137/ user=Everyone
netsh advfirewall firewall add rule name="Qanawa salle" dir=in action=allow protocol=TCP localport=8137 profile=private
```

Puis relancer `Qanawa.exe --lan --serve-only`. L'utilitaire affiche lui-même les adresses à donner
aux élèves (celle de `ipconfig`, port 8137).

Démarrage automatique (optionnel, sans droit admin) : raccourci vers la commande ci-dessus dans
`shell:startup`. Avec droit admin, préférer le planificateur de tâches (« au démarrage »,
« ne pas mettre en veille sur secteur »).

### b) Petit serveur Python (poste Windows ou Linux, si Python est installé)

```bash
cd C:\Qanawa\prototype           # ou /opt/qanawa/prototype
python -m http.server 8137 --bind 0.0.0.0
```

### c) Vrai serveur de l'école (le plus propre) — nginx, servi en **http** et en **https**

L'application est statique : `tools/qanawa-nginx.conf` la sert sur le port 80, avec `https` en
option (auto-signé) et un cache court. Copier `prototype/` dans `/srv/qanawa/prototype`.

```bash
sudo mkdir -p /srv/qanawa && sudo cp -a prototype /srv/qanawa/
sudo cp tools/qanawa-nginx.conf /etc/nginx/sites-available/qanawa
sudo ln -s /etc/nginx/sites-available/qanawa /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 2. Ce que les élèves tapent

```
http://<ip-ou-nom-du-serveur>:8137/            élève
http://<ip-ou-nom-du-serveur>:8137/teacher.html   enseignant
```

Écrire l'URL au tableau, ou distribuer le lien. **Note fixe** : changer d'adresse (IP DHCP qui bouge)
change l'origine, donc le navigateur considère qu'il s'agit d'une autre « machine » et les enregistrements
locaux ne suivent pas → servir toujours sous le même nom (ex. `qanawa.pedago.local`, ou
`http://10.0.0.5:8137/` figé).

## 3. Ce qui change par rapport au poste isolé (à savoir avant)

| Point | En local (`localhost`) | En salle (IP/`http`) |
|---|---|---|
| Sauvegarde de la progression | un profil = un élève | **un enregistrement par pseudo** dans le navigateur du poste utilisé ; l'écran d'accueil affiche « تلميذ آخر » et les prénoms déjà connus du poste |
| Micro / dictée de lecture (`SpeechRecognition`) | marche (contexte sécurisé) | **coupé en `http://10.x:8137`** (non sécurisé) → utiliser le champ « nombre de mots » : même indicateur WCPM. Pour récupérer le micro : HTTPS, même auto-signé (accepter le certificat une fois) |
| Service worker / mode hors ligne | actif (`http://localhost` est un contexte sécurisé) | inactif sur `http://10.x:8137` → l'app fonctionne, simplement sans cache ni installation « à ajouter à l'écran d'accueil ». Sur HTTPS, il revient |
| Confettis / animations, TTS, surlignage | identiques | identiques |
| Espace enseignant | voit les élèves de **ce** navigateur | voit les élèves de **ce** navigateur : pour une classe entière, chaque poste doit exporter son CSV, ou passer à la version serveur (sprints S0–S1) |

**Conséquence importante** : sans serveur de comptes, un poste mutualisé ne fait remonter que ses
propres élèves dans `teacher.html`. C'est exactement ce que corrigera la base de données (issue #2/#3) ;
en attendant, l'enseignant collecte les CSV poste par poste (bouton *تصدير CSV*) ou utilise un poste
de référence pour la classe.

## 4. Hygiène du poste partagé (déjà prévue dans le prototype)

- À chaque fin de séance, l'élève peut faire **⚙️ → 🔄 تلميذ آخر** ; la progression reste dans le
  navigateur, elle n'est ni envoyée, ni supprimée.
- Pas de mot de passe, pas de donnée d'identification : uniquement le pseudo choisi. Ne jamais
  demander le nom complet sur un poste partagé (règle R1, `docs/privacy.md`).
- En fin d'année, nettoyage : **⚙️ → 🗑️ تصفير بياناتي** (par élève), ou vider le stockage du navigateur.

## 5. Vérifier le déploiement en 4 commandes

```bash
curl -s  http://SERVEUR:8137/health        # → ok <chemin du dossier servi>   (exe uniquement)
curl -sI http://SERVEUR:8137/index.html | head -1     # → 200 OK
curl -sI http://SERVEUR:8137/app.js   | head -1       # → 200 OK
curl -s  "http://SERVEUR:8137/../../windows/win.ini"  # → 404 (le serveur ne sort pas du dossier)
```

Et le parcours complet, sans navigateur, depuis n'importe quel poste de la salle :

```bash
QANAWA_URL=http://SERVEUR:8137 node tools/harnais_prototype.mjs
# → ✅ harnais vert (51 contrôles : 7 étapes, malette, lecteur, quiz, نور, plafond 20★,
#    révision, stations #/phono et #/placement, vue enseignant, mode salle 2 élèves)
```

## 6. Sécurité : ce qu'il faut savoir (et assumer)

Le serveur intégré n'écoute **que** le réseau local de l'école s'il est derrière un NAT/pare-feu : ne
jamais exposer 8137 sur Internet. Il ne fait aucun chemin d'échappement (vérifié : 6 tentatives de
traversée → 404), n'écrit aucun fichier, et ne loggue aucune requête. Les seules données stockées sont
les enregistrements `localStorage` des navigateurs. Le contenu pédagogique reste soumis aux droits du
CNIP : diffusion dans la classe, pas de mise en ligne publique des textes du manuel.
