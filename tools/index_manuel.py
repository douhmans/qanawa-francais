#!/usr/bin/env python3
"""
index_manuel.py — يستخرج فهرس نصوص كتاب القراءة الرسمي للسنة السادسة من ملف PDF،
ويبحث عن الصفحة التي يظهر فيها عنوان كل نص (بحث مطبّع: بدون تشكيل/حركات/تكبير)،
ثم يخرج:
  data/curriculum-6e.json      خريطة البرنامج (وحدات × نصوص × أهداف × أيام × فونيتيك)
  data/page-index-manuel.json      عنوان النص ↔ أرقام الصفحات في الـ PDF (للاقتطاع داخل فضاء الأستاذ)
  sources/pages/pXXX.png       صور صفحات الكتاب (اختياري، مع --render)

الاستعمال:
  python3 tools/index_manuel.py official-docs/manuel-lecture-6e.pdf --out data/curriculum-6e.json [--render]
"""
import argparse, json, os, re, sys, unicodedata

# ---------------------------------------------------------------- خريطة البرنامج
FONETIQUE_CONTRASTES = [
    {"pair": "[y]/[u]", "exemples": ["tu", "tout"], "ar": "الضمة الفرنسية مقابل الضمة العربية"},
    {"pair": "[y]/[i]", "exemples": ["lit", "lue"], "ar": "الضمة الفرنسية مقابل الكسرة"},
    {"pair": "[p]/[b]", "exemples": ["poule", "boule"], "ar": "p/b (لا وجود لـ p في العربية)"},
    {"pair": "[f]/[v]", "exemples": ["film", "vil"], "ar": "f/v"},
    {"pair": "[e]/[ɛ]", "exemples": ["été", "ait"], "ar": "الفتحة المغلقة/المفتوحة"},
    {"pair": "[a]/[ɑ̃]", "exemples": ["la", "lan"], "ar": "شفوي مقابل غنّي"},
    {"pair": "[o]/[ɔ̃]", "exemples": ["mot", "mon"], "ar": "شفوي مقابل غنّي"},
    {"pair": "[ɑ̃]/[ɔ̃]", "exemples": ["an", "on"], "ar": "بين الغنّيات"},
    {"pair": "[ɛj]/[œj]", "exemples": ["soleil", "oeil"], "ar": "eil/euil"},
    {"pair": "[ɛʁ]/[œʁ]", "exemples": ["mer", "meur"], "ar": "er/eur"},
    {"pair": "e caduc", "exemples": ["jouerai", "pâtisserie"], "ar": "حذف الـ e الخفيفة"},
    {"pair": "liaisons", "exemples": ["ils‿arrivent", "dix‿avions"], "ar": "الاتصالات الإجبارية"},
    {"pair": "enchaînements", "exemples": ["un‿ami", "il‿a eu"], "ar": "الوصل بين الكلمات"},
    {"pair": "intonation", "exemples": ["déclaratif", "interrogatif", "exclamatif", "impératif"],
     "ar": "نبرة الجمل الأربع"},
    {"pair": "nombres", "exemples": ["2 chiffres", "3 chiffres"], "ar": "نطق الأرقام قبل ساكن/متحرك"},
]

JOURNEES = [
    {"id": "J1", "activites": ["Mise en train (poème ou chant)",
        "Expression orale: présentation du module et du projet d'écriture",
        "Lecture/compréhension (texte 1)", "Grammaire"]},
    {"id": "J2", "activites": ["Mise en train", "Expression orale",
        "Lecture/fonctionnement (texte 1)", "Conjugaison"]},
    {"id": "J3", "activites": ["Mise en train", "Expression orale",
        "Lecture/compréhension (texte 2)", "Projet d'écriture"]},
    {"id": "J4", "activites": ["Expression orale", "Lecture/fonctionnement (texte 2)",
        "Orthographe", "Projet d'écriture"]},
    {"id": "J5", "activites": ["Autodictée", "Expression orale",
        "Lecture/compréhension (texte 3)", "Grammaire/conjugaison (intégration)"]},
    {"id": "J6", "activites": ["Expression orale", "Lecture/fonctionnement (texte 3)",
        "Orthographe", "Projet d'écriture"]},
    {"id": "J7", "activites": ["Lecture documentaire", "Dictée (à trous / à préparation)",
        "Projet d'écriture (production)", "Lecture suivie (bibliothèque)"]},
    {"id": "J8", "activites": ["Mise en train", "Page vocabulaire: J'ouvre la boîte à mots / Je joue avec les mots",
        "Lecture-action", "Bibliothèque de classe"]},
]

SEQUENCE_LECTURE = {
    "source": "Guide méthodologique, CNIP, p.33-34",
    "phases": [
        {"id": "anticipation", "officiel": "Anticipation", "fr": "Émettre des hypothèses à partir du titre, des illustrations, du préambule ; identifier le type de texte à partir de sa typographie.", "ar": "تنبّؤات من العنوان والصورة والمقدمة + تحديد نوع النص من هندسته"},
        {"id": "globale", "officiel": "Approche globale", "fr": "Lecture silencieuse pour vérifier les hypothèses et contrôler la compréhension globale (informations importantes, paramètres de la situation de communication, idée principale).", "ar": "قراءة صامتة للتحقق من الفرضيات والسيطرة على المعنى العام"},
        {"id": "analytique", "officiel": "Approche analytique", "fr": "Affiner la construction du sens : analyser les informations, rechercher les indices et les mettre en relation.", "ar": "تحليل المعلومات وربط القرائن لبناء المعنى بدقّة"},
        {"id": "vocabulaire", "officiel": "Compréhension du vocabulaire", "fr": "Le manuel explique en moyenne deux mots par texte ; l'élève cherche le reste dans le dictionnaire.", "ar": "الكتاب يشرح كلمتين فقط لكل نص ← المنصة تشرح كل كلمة جديدة"},
        {"id": "synthese", "officiel": "Synthèse et dépassement", "fr": "Relire (lecture dialoguée, concours de lecture), recopier un passage, donner un avis sur le personnage, dégager la valeur, changer le titre, imaginer une autre fin, dessiner, dramatiser, résumer.", "ar": "إعادة قراءة، رأي في البطل، استخراج القيمة، نهاية بديلة، تمثيل مشهد، تلخيص"},
    ],
    "nombre_de_textes_par_module": 5,
    "seances_par_texte_de_lecture": 2,
}

CRITERES_ECRIT = [
    {"id": "C1", "nom": "Adéquation avec la situation de communication"},
    {"id": "C2", "nom": "Lisibilité de l'écriture"},
    {"id": "C3", "nom": "Correction linguistique"},
    {"id": "C4", "nom": "Correction orthographique"},
    {"id": "C5", "nom": "Cohérence du texte"},
    {"id": "C6", "nom": "Originalité des idées"},
    {"id": "C7", "nom": "Présentation matérielle"},
]

NIVEAUX_MAITRISE = {"0": "Aucune maîtrise", "+": "Maîtrise minimale insuffisante",
                   "++": "Maîtrise minimale", "+++": "Maîtrise maximale"}

# أرقام صفحات كل وحدة في طبعة CNIP الرقمية (136 ص) — للاقتصاص داخل فضاء الأستاذ
MANUEL_PAGES = {1: (9, 24), 2: (25, 40), 3: (41, 55), 4: (56, 71),
                5: (72, 86), 6: (87, 101), 7: (102, 116), 8: (117, 135)}

ORGANISATION_OFFICIELLE = {
    "source": "Guide méthodologique, CNIP, p.15-16",
    "structure": ["module d'évaluation des prérequis (2 à 3 semaines)",
                  "8 modules d'apprentissage (chacun = 2 semaines / 8 séances / 8 h par semaine)",
                  "4 modules d'intégration = journées-paliers (2 jours, +1 journée si besoin)",
                  "4 modules d'évaluation-remédiation (1 semaine = 4 séances)"],
    "unites": "les modules sont regroupés en 4 unités d'apprentissage (M1+M2, M3+M4, M5+M6, M7+M8)",
    "phase_1": {"modules": [1, 2, 3, 4], "projets_ecriture": "un projet d'écriture par unité (donc 2 projets)",
                "parcours_module_pair": "J1 mise au point → J3 remédiation → J4 réécriture → J7 finalisation"},
    "phase_2": {"modules": [5, 6, 7, 8], "projets_ecriture": "un projet d'écriture par module (donc 4 projets)",
                "parcours_module_impair": "J1 présentation → J3 entraînement 1 + construction de l'outil d'aide → J4 entraînement 2 → J7 production"},
}

MODULES = [
    {
        "module": 1, "theme": "Travail", "slogan": "Travailler pour s'épanouir",
        "sous_themes_poematiques": ["Au travail", "Le boulanger"],
        "projet_ecriture": "Je raconte un événement en rapport avec « le travail »",
        "objectifs_oraux": ["Informer/s'informer", "Décrire/raconter un événement",
                           "Situer des lieux", "Justifier un choix"],
        "outils_langue": {
            "grammaire": "Reconnaître et utiliser les déterminants, les noms et les pronoms personnels",
            "conjugaison": "Reconnaître les trois temps : présent, passé composé, futur ; utiliser verbes à l'infinitif et conjugués",
            "orthographe": "Utiliser l'infinitif après à / de / par / pour / sans"},
        "textes": {
            "lecture": ["Apprentie comédienne", "Une parfumeuse en herbe", "Témoignages"],
            "documentaire": "Quel métier choisir ?", "action": "Un tableau découpé",
            "vocabulaire": "Page vocabulaire"},
        "unite": 1,
    },
    {
        "module": 2, "theme": "Médias et nouvelles technologies",
        "slogan": "Communiquer avec les autres", "sous_themes_poematiques": ["Les machines", "Conversation"],
        "projet_ecriture": "Unité 1 (phase 1) : mise au point du journal de la classe — réalisation de la maquette de la « Une » (projet porté par l'unité, finalisé en J7)",
        "projet_portee": "unité 1 (le même projet sert les modules 1 et 2 en phase 1)",
        "objectifs_oraux": ["Informer/s'informer", "Exprimer un point de vue", "Porter un jugement",
                            "Décrire une scène"],
        "outils_langue": {
            "grammaire": "Reconnaître et utiliser les déterminants possessifs et démonstratifs",
            "conjugaison": "Conjuguer les verbes en er, en ir (usuels) et du 3e groupe à l'impératif",
            "orthographe": "Écrire correctement les homophones a / à"},
        "textes": {
            "lecture": ["Le vieux robot", "Une télé pas comme les autres", "Le monde du journalisme"],
            "documentaire": "Les médias / Faire « son journal »", "action": "Faire la maquette de la « Une »",
            "vocabulaire": "Page vocabulaire"},
        "unite": 1,
    },
    {
        "module": 3, "theme": "Paix et tolérance", "slogan": "Accepter les autres",
        "sous_themes_poematiques": ["Marie et moi", "Donne autour de toi"],
        "projet_ecriture": "Je raconte un événement sur le thème de la solidarité et je fais parler des personnages dans mon récit",
        "objectifs_oraux": ["Décrire des scènes", "Porter un jugement", "Prendre position",
                           "Justifier un point de vue"],
        "outils_langue": {
            "grammaire": "Reconnaître et utiliser l'adjectif épithète et l'adjectif attribut",
            "conjugaison": "Conjuguer être et avoir au futur et au passé composé",
            "orthographe": "Écrire correctement les homophones son / sont"},
        "textes": {
            "lecture": ["Le petit lapin tout blanc", "Le nouveau costume",
                        "L'Indien qui ne savait pas courir"],
            "documentaire": "Les ressemblances et les différences entre les êtres humains",
            "action": "Le bouquet de bienvenue", "vocabulaire": "Page vocabulaire"},
        "unite": 2,
    },
    {
        "module": 4, "theme": "Solidarité et citoyenneté", "slogan": "S'entraider pour mieux réussir",
        "sous_themes_poematiques": ["L'homme et le chien", "Si vous n'avez rien à me dire"],
        "projet_ecriture": "Je raconte un événement en rapport avec la solidarité et j'intègre un passage descriptif",
        "objectifs_oraux": ["Décrire", "Raconter", "Informer/s'informer", "Exprimer un point de vue"],
        "outils_langue": {
            "grammaire": "Utiliser la phrase négative : ne… plus, ne… jamais",
            "conjugaison": "Conjuguer les verbes usuels du type finir au passé composé et au futur",
            "orthographe": "Écrire correctement les homophones et / est"},
        "textes": {
            "lecture": ["Un bon compagnon", "L'écureuil et l'escargot", "Le courage d'un jeune apprenti"],
            "documentaire": "L'école, un droit pour tous", "action": "Le jeu du Petit Poucet",
            "vocabulaire": "Page vocabulaire"},
        "unite": 2,
    },
    {
        "module": 5, "theme": "Environnement", "slogan": "Sauver la nature",
        "sous_themes_poematiques": ["Qu'elle est belle la terre !", "L'arbre volant"],
        "projet_ecriture": "Je raconte un événement en rapport avec l'environnement et j'intègre un passage descriptif",
        "objectifs_oraux": ["Décrire une situation/une scène", "Donner un avis/le justifier",
                           "Informer/s'informer"],
        "outils_langue": {
            "grammaire": "Utiliser le complément essentiel et le complément non essentiel",
            "conjugaison": "Conjuguer les verbes du type prendre et mettre au passé composé et au futur",
            "orthographe": "Accorder le verbe avec son sujet"},
        "textes": {
            "lecture": ["Sauvez Keiko", "La ménagère de la mer", "Les parapluies"],
            "documentaire": "Comment éviter le gaspillage de l'eau",
            "action": "Fabriquer une famille de cygnes", "vocabulaire": "Page vocabulaire"},
        "unite": 3,
    },
    {
        "module": 6, "theme": "Santé et bien-être", "slogan": "Être en forme et mieux se porter",
        "sous_themes_poematiques": ["Un matin", "Le vélo à mille pattes"],
        "projet_ecriture": "Je raconte un événement en rapport avec la santé et j'intègre des répliques et un passage descriptif",
        "objectifs_oraux": ["Donner des conseils", "Informer/s'informer", "Raconter",
                           "Décrire une personne"],
        "outils_langue": {
            "grammaire": "Utiliser le complément de lieu",
            "conjugaison": "Conjuguer aller et faire au passé composé et au futur",
            "orthographe": "Accorder en genre et en nombre les adjectifs du type heureux/heureuse, mûr/mûre"},
        "textes": {
            "lecture": ["La jeune acrobate", "Des vignettes… pour un ballon", "La lettre de Jean"],
            "documentaire": "Comment lutter contre le stress", "action": "Faire des exercices d'étirement",
            "vocabulaire": "Page vocabulaire"},
        "unite": 3,
    },
    {
        "module": 7, "theme": "Loisirs", "slogan": "Profiter de son temps libre",
        "sous_themes_poematiques": ["Dans le grenier de ma grand-mère", "Pour faire le portrait d'un oiseau"],
        "projet_ecriture": "J'écris une lettre à un ami ou à un parent pour lui parler de mes loisirs",
        "objectifs_oraux": ["Décrire-raconter", "Exprimer un sentiment, une préférence, un refus",
                           "Émettre des hypothèses"],
        "outils_langue": {
            "grammaire": "Utiliser le complément de temps",
            "conjugaison": "Conjuguer dire, lire, écrire au présent, passé composé, futur et impératif",
            "orthographe": "Accorder les adjectifs du type neuf/neuve, gentil/gentille, beau/belle, bon/bonne"},
        "textes": {
            "lecture": ["La lettre de Paul", "La lettre de Daniel", "La lettre de Monsieur Crêpe"],
            "documentaire": "Peinture, sculpture et théâtre de marionnettes",
            "action": "Jouer au nombre pensé", "vocabulaire": "Page vocabulaire"},
        "unite": 4,
    },
    {
        "module": 8, "theme": "Culture et découverte du monde", "slogan": "Découvrir d'autres modes de vie",
        "sous_themes_poematiques": ["Une graine voyageait", "Le vent a fait le tour du monde"],
        "projet_ecriture": "Je raconte un événement en rapport avec d'autres modes de vie et j'intègre un passage descriptif",
        "objectifs_oraux": ["Informer/s'informer", "Décrire un lieu, un personnage",
                           "Exprimer un avis/une préférence", "Décrire un mode de vie"],
        "outils_langue": {
            "grammaire": "Utiliser le complément de manière",
            "conjugaison": "Conjuguer vouloir et pouvoir au présent",
            "orthographe": "Accorder le participe passé employé avec être"},
        "textes": {
            "lecture": ["Le grand voyage", "Une sortie de classe au Canada", "L'île au trésor"],
            "documentaire": "Quelques fêtes d'autres pays", "action": "Fabriquer la tour Eiffel",
            "vocabulaire": "Page vocabulaire"},
        "unite": 4,
    },
]

POEMES_MANUEL = {"Le boulanger": "Raymond RICHARD", "Au travail": "Auguste BRIZEUX"}
CONTES_LECTURE_SUIVIE = ["Malik et Flèche (Régis Delpeuch)", "La paire de chaussures (Pierre Gripari)",
                         "Grain-d'Aile (Paul Éluard)", "La boule de cristal (Frères Grimm)"]
CHANTS = ["Meunier, tu dors", "Voulez-vous danser grand-mère"]

LOGOS_ELEVE = ["Je récite", "Je lis", "Je lis pour m'informer et me documenter", "Je lis pour agir",
               "J'ouvre la boîte à mots", "Je joue avec les mots", "Je m'entraîne", "J'observe",
               "Je retiens", "Je produis", "Je fais le point"]


def norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^a-zA-Z0-9]+", " ", t.lower())
    return " ".join(t.split())


def find_pages(doc, titles, module_of=None):
    """يبحث عن عنوان كل نصّ داخل نطاق صفحات وحدته فقط (يستثني الصفحة الأولى = fiche-contrat
    والفهرس ص6)، فيقع على العنوان المعروض فوق النص لا على وروده في الجدول."""
    pages = [norm(doc[i].get_text()) for i in range(doc.page_count)]
    res = {}
    for t in titles:
        nt = norm(t)
        hits = [i + 1 for i, p in enumerate(pages) if nt and nt in p]
        inside = []
        if module_of and t in module_of:
            lo, hi = MANUEL_PAGES[module_of[t]]
            inside = [h for h in hits if lo + 1 <= h <= hi]
        res[t] = {"occurrences_pages": hits,
                  "titre_page": inside[0] if inside else None,
                  "module": module_of.get(t) if module_of else None}
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", help="official-docs/manuel-lecture-6e.pdf")
    ap.add_argument("--out", default="data/curriculum-6e.json")
    ap.add_argument("--index", default="data/page-index-manuel.json")
    ap.add_argument("--index-cahier", default=None, help="PDF du cahier d'activités → index des fiches")
    ap.add_argument("--fiche-classe", default="official-docs/module-prerequis-6e.pdf")
    ap.add_argument("--render", action="store_true", help="يصدّر صور صفحات الكتاب PNG")
    a = ap.parse_args()

    data = {
        "meta": {
            "grade": "6ème année de l'Enseignement de Base (Tunisie)",
            "matiere": "Français — lecture/compréhension",
            "manuel": "Un pas de plus… vers le collège (Manuel de lecture), CNIP",
            "guide": "Guide méthodologique, CNIP, 216 p.",
            "organisation": "8 modules / 4 unités / journée-paliers / module d'évaluation-remédiation",
            "volume_horaire": "8 h / semaine",
            "copyright": "© Tous droits réservés au CNIP — usage pédagogique privé, diffusion publique interdite",
            "competence_terminale_lecture": SEQUENCE_LECTURE.get("competence",
                "Intégrer les mécanismes de base de la lecture (décodage et encodage) pour lire des textes variés et rendre compte de sa compréhension."),
        },
        "modules": MODULES,
        "journees_type": JOURNEES,
        "organisation_officielle": ORGANISATION_OFFICIELLE,
        "manuel_pages_par_module": MANUEL_PAGES,
        "sequence_lecture": SEQUENCE_LECTURE,
        "phonetique_contrastes_officiels": FONETIQUE_CONTRASTES,
        "criteres_evaluation_ecrit": CRITERES_ECRIT,
        "niveaux_maitrise": NIVEAUX_MAITRISE,
        "logos_eleve": LOGOS_ELEVE,
        "poemes": POEMES_MANUEL,
        "contes_lecture_suivie": CONTES_LECTURE_SUIVIE,
        "chants": CHANTS,
    }

    titles = []
    for m in MODULES:
        titles += m["textes"]["lecture"]
        titles += [m["textes"]["documentaire"], m["textes"]["action"]]
        titles += m["sous_themes_poematiques"]
    titles = list(dict.fromkeys(titles))
    module_of = {}
    for m_ in MODULES:
        for t in (m_["textes"]["lecture"] + [m_["textes"]["documentaire"], m_["textes"]["action"]]
                  + m_["sous_themes_poematiques"]):
            module_of[t] = m_["module"]

    try:
        import pymupdf
        doc = pymupdf.open(a.pdf)
        idx = find_pages(doc, titles, module_of)
        os.makedirs(os.path.dirname(a.index) or ".", exist_ok=True)
        json.dump({"pdf": a.pdf, "page_count": doc.page_count, "titles": idx},
                  open(a.index, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        found = sum(1 for v in idx.values() if v["titre_page"])
        print(f"[index] {found}/{len(titles)} عنوانًا وُجد في طبقة نصّ الـ PDF → {a.index}")
        if a.render:
            os.makedirs("sources/pages", exist_ok=True)
            hits = sorted({p for v in idx.values() for p in v["occurrences_pages"][:2]})
            for p in hits:
                pix = doc[p - 1].get_pixmap(dpi=150)
                pix.save(f"sources/pages/p{p:03d}.png")
            print(f"[render] {len(hits)} صورة صفحة في sources/pages/")
    except Exception as e:
        print("[warn] indexation PDF impossible:", e, file=sys.stderr)

    if a.fiche_classe and os.path.exists(a.fiche_classe):
        pl = extract_pl_index(a.fiche_classe)
        if pl:
            data["fiche_classe_pl"] = pl
            n = sum(len(v) for v in pl["index"].values())
            print(f"[pl] {n} feuilles reproductibles indexées dans {pl['pdf']} ({pl['pages']} p.)")
    if a.index_cahier and os.path.exists(a.index_cahier):
        dc = pymupdf_doc = None
        try:
            import pymupdf
            dc = pymupdf.open(a.index_cahier)
            idx = find_pages(dc, titles, module_of)
            json.dump({"pdf": os.path.basename(a.index_cahier), "page_count": dc.page_count,
                       "role": "cahier d'activités (fiches d'auto-évaluation, Je m'entraîne…)",
                       "titles": idx},
                      open("data/page-index-cahier.json", "w", encoding="utf-8"),
                      ensure_ascii=False, indent=2)
            print(f"[cahier] {sum(1 for v in idx.values() if v['titre_page'])}/{len(titles)} "
                  f"rubriques repérées dans {dc.page_count} p. → data/page-index-cahier.json")
        except Exception as e:
            print("[skip] index cahier:", e, file=sys.stderr)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    json.dump(data, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    n_textes = sum(len(m["textes"]["lecture"]) + 2 for m in MODULES)
    print(f"[ok] {a.out}: {len(MODULES)} modules, {n_textes} entrées de textes, "
          f"{len(FONETIQUE_CONTRASTES)} contrastes phonétiques, {len(JOURNEES)} journées-type")


def extract_pl_index(pdf_path):
    """Fiche classe du maître CNIP : pages → feuilles reproductibles (PL1…PL20 + prérequis)."""
    try:
        import pymupdf
        d = pymupdf.open(pdf_path)
    except Exception as e:
        print("[skip] index PL indisponible:", e, file=sys.stderr)
        return None
    key = {}
    for i in range(d.page_count):
        t = " ".join(d[i].get_text().split())
        m = re.search(r"Module des pr[ée]requis[\s\-–—:]+(PL\s*\d+)", t, re.I)
        if m:
            key.setdefault("prerequis", []).append({"feuille": m.group(1).upper().replace(" ", ""), "pdf_page": i + 1})
            continue
        m = re.search(r"MODULE\s*(\d+)[\s\-–—:]+(PL\s*\d+)", t, re.I)
        if m:
            mod = int(m.group(1))
            key.setdefault(f"module_{mod}", []).append({"feuille": m.group(2).upper().replace(" ", ""), "pdf_page": i + 1})
    for k in key:
        key[k].sort(key=lambda x: x["feuille"])
    return {"pdf": os.path.basename(pdf_path), "pages": d.page_count,
            "editeur": "CNIP, code 521613 — module des prérequis (PL1→PL20) pour le maître",
            "usage": "feuilles reproductibles officielles : 4 pour l'évaluation des prérequis + 16 pour les modules 1-8 (à photocopier/scanner)",
            "copyright": "© CNIP — diffusion publique interdite",
            "index": key}


if __name__ == "__main__":
    main()
