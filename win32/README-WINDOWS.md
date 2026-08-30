# Qanawa sur Windows — mode d'emploi

Deux façons d'utiliser la plateforme sur un poste Windows, selon ce que vous avez sous la main.

---

## A) Le lanceur `Qanawa.exe` (recommandé en classe)

**Ce que c'est** : un petit programme .NET (≈ 26 Ko, aucun installeur, aucun droit
administrateur) qui :
1. sert le dossier `prototype\` sur `http://localhost:8137/` (fallback 8138 → 4173 → 8777 → 5151),
2. ouvre le navigateur par défaut (Edge, sinon Chrome, sinon « navigateur par défaut »),
3. laisse une icône dans la zone de notification avec **Ouvrir / Quitter**,
4. si le port est bloqué : ouvre quand même `prototype\index.html` en mode fichier, avec un avertissement.

**Installation (1 minute)**
1. Dézippez `Qanawa-windows.zip` **entier** (ne sortez pas seulement l'exe).
2. Placez le contenu dans un dossier en écriture, p. ex. `C:\Qanawa\` —
   évitez `C:\Program Files` (il faudrait des droits admin pour sauvegarder la progression).
   Structure attendue :
   ```
   C:\Qanawa\Qanawa.exe
   C:\Qanawa\prototype\index.html
   C:\Qanawa\prototype\app.js   … etc.
   ```
3. Double-cliquez `Qanawa.exe`. Le navigateur s'ouvre sur `http://localhost:8137/`.
4. Pour le remettre chaque matin : épinglez `Qanawa.exe` dans la barre des tâches
   (clic droit → *Épingler*), ou créez un raccourci sur le bureau.

**« Windows a protégé votre PC »** (SmartScreen) : c'est normal pour tout binaire non signé.
→ *Plus d'infos* → *Exécuter quand même*. Pour éviter ce dialogue à chaque poste, signez avec un
certificat code-signing, ou distribuez le dossier décompressé par l'administrateur réseau.
Le code source est sous AGPL-3.0 : n'importe qui peut relire `win32/QanawaLauncher.cs` et
vérifier qu'il n'ouvre **aucun** port autre que la boucle locale et n'écrit que dans `%TEMP%`.

**Pare-feu** : aucune demande, `HttpListener` n'écoute que `localhost`.

**Vérifier soi-même** (optionnel) :
```bat
C:\Qanawa\Qanawa.exe --serve-only --port 8137
curl http://localhost:8137/health      → ok C:\Qanawa\prototype
curl http://localhost:8137/../../windows/win.ini  → 404 (traversée de chemin bloquée)
```

**Reconstruire l'exe** (si vous préférez compiler sur place) :
```bat
cd C:\Qanawa\win32
build_exe.bat
```
Il utilise le compilateur C# livré avec .NET Framework 4.x (`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`),
présent sur Windows 7 SP1 à Windows 11. Sortie : `win32\bin\Qanawa.exe` + copie du dossier `prototype`.

---

## B) Sans aucun exe : juste le navigateur

1. Ouvrez `prototype\index.html` par double-clic. Ça marche (lecture, quiz, jeux, robot).
2. Limites en `file://` : le **mode hors ligne** (service worker) est désactivé, l'URL change
   selon le navigateur, et certains navigateurs isolent `localStorage` → **la progression peut
   ne pas survivre**. Sur un poste élève, préférez le mode A, ou :
```bat
cd C:\Qanawa\prototype
python -m http.server 8137        (si Python est installé)
```
puis `http://localhost:8137/`.

---

## C) Ce qui dépend du poste (à tester une fois sur place)

| Besoin | Selon quoi | Si absent |
|---|---|---|
| Voix française | voix `fr-FR` du système | Ajouter la langue Français (France) dans les Paramètres Windows ; sur Android/iOS, mettre à jour les données de prononciation |
| Dictée de lecture à voix haute | `SpeechRecognition` (Chrome/Edge) | le champ « nombre de mots lus sans erreur » est là : saisie manuelle, même indicateur WCPM |
| Confettis / animations | accélération graphique | le bouton réglages « réduire les animations » les coupe |
| Impression du bilan enseignant | imprimante/PDF | `Ctrl+P` dans `teacher.html` (feuille de style `@media print` incluse) |

## D) Désinstallation
Supprimez le dossier `C:\Qanawa`. Rien n'est écrit ailleurs que dans le profil du navigateur
(localStorage) et `%TEMP%\qanawa-manifest-*.manifest` (fichier texte de 700 octets, supprimé par le nettoyage habituel).

## E) Note pour l'enseignant
La progression est **locale au poste et au navigateur** : chaque élève doit utiliser le même poste et
le même navigateur, sinon il repart de zéro. Le vrai synchronisation par compte (sprint S0–S1) arrive
avec la version serveur ; l'espace enseignant exporte déjà un **CSV** que vous récupérez sur la clé USB
de la salle informatique.

---

## Mettre l'application sur le serveur de la salle (tous les postes)

Le même exécutable sait servir le réseau local :

```bat
Qanawa.exe --lan --serve-only --port 8137
```

Windows demandera une réservation d'URL (une seule fois, en administrateur) :

```bat
netsh http add urlacl url=http://+:8137/ user=Everyone
netsh advfirewall firewall add rule name="Qanawa salle" dir=in action=allow protocol=TCP localport=8137 profile=private
```

Le lanceur affiche alors les adresses à donner aux élèves. **Deux différences à connaître** (détail
complet : `LAN-MODE.md` à la racine du dépôt) :

1. **un enregistrement par pseudo** dans le navigateur du poste : deux élèves du même poste ne se
   marchent plus dessus, et l'accueil propose « 🔄 تلميذ آخر » + les prénoms déjà connus ;
2. en `http://10.x.x.x:8137/` le contexte n'est **pas sécurisé** → ni micro (`SpeechRecognition`),
   ni service worker (mode hors ligne/installable). Le champ « nombre de mots » remplace la dictée,
   le reste (lecture, surlignage, quiz, jeux, robot, malette, bilans) est identique. Le HTTPS, même
   auto-signé, rend les deux ; `tools/qanawa-nginx.conf` est prêt pour ça.

---

## « Je n'arrive pas à écrire mon prénom » — le cas du double-clic sur `index.html`

C'est le comportement attendu de Chrome et Edge sur un fichier ouvert en `file://` : **ils refusent
`localStorage`**, donc le prénom ne peut pas être mémorisé. Selon les versions, soit le champ semble
ne rien faire, soit le bouton *ادخل المنصّة* ne se passe pas. Trois réponses, de la plus simple à la plus propre :

| # | Ce que vous faites | Effet |
|---|---|---|
| 1 | **`Qanawa.exe`** (double-clic) | l'appli est servie sur `http://localhost:8137/` → stockage autorisé, tout marche |
| 2 | `cd prototype` puis `python -m http.server 8137` (ou `py -m http.server 8137`) | idem, sans construire d'exe |
| 3 | continuer en `file://` | **possible** : le prénom accepte la touche **Entrée**, un nom par défaut est donné si le champ est vide, et un bandeau jaune explique « هذا الجهاز لا يحفظ التقدّم الآن » — la leçon se lit, mais les étoiles sont perdues au rechargement |

Le code a été durci pour ce cas précis : l'écriture refusée n'interrompt plus l'entrée dans la plateforme
(`save()` est protégé, le bandeau s'affiche au premier refus), le champ reçoit le focus, porte
`dir="auto"` (la frappe arabe/lating se place correctement), et **Entrée = clic sur le bouton**.

Vérification automatique de ce cas (aucun serveur nécessaire) :
```bash
node tools/test_file_mode.mjs
# localStorage REFUSÉ  → cartes = 4 après Entrée, bandeau « لا يحفظ التقدّم » affiché, 0 erreur de script
# localStorage accepté → cartes = 4 après Entrée, aucun bandeau inutile
```

---

## « L'exe ouvre une page vide »

Ce symptôme a trois causes possibles, et le lanceur les distingue maintenant tout seul :

| Cause | Ce que tu vois | Solution |
|---|---|---|
| **ZIP lancé sans extraction** (le plus fréquent) | le navigateur affiche une page *Qanawa — fichier manquant* + une fenêtre « démarrage incomplet » | clic droit sur le ZIP → **Extract All / استخراج الكل**, puis lancer `Qanawa.exe` dans le dossier obtenu |
| **Navigateur ouvert avant que le serveur ait lié le port** | page vide pendant 1 s puis « localhost refusé » | corrigé : `WaitForPort()` attend que le port réponde (4 s max) avant d'ouvrir le navigateur ; sinon clique **Ouvrir** dans la fenêtre du lanceur |
| **Port déjà pris / bloqué par une politique** | fenêtre « Impossible d'ouvrir le port … » qui ne se ferme plus toute seule | `Qanawa.exe --port 8642` (autre port) ou `cd prototype` puis `python -m http.server 8137` |

**Diagnostic en 2 secondes** (invite de commandes, dans le dossier extrait) :

```bat
Qanawa.exe --serve-only --port 8137
curl http://localhost:8137/health
    ok C:\Qanawa\prototype · 9 fichiers        ← tout va bien, ouvre http://localhost:8137/
    ok C:\...\prototype · dossier absent       ← le dossier prototype n'est pas à côté de l'exe
```

`/health` répond toujours, même en cas de problème : c'est lui qui dit si le serveur voit bien les
9 fichiers. Le lanceur ne ferme plus ses fenêtres d'erreur automatiquement (une console qui clignote
et disparaît, c'est exactement ce qui fait dire « page vide »).
