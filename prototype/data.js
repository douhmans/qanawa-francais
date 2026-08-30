/* ============================================================================
   QANAWA_DATA — contenu du modèle premier (aucune dépendance réseau)
   Structure = celle du référentiel officiel (data/curriculum-6e.json) :
   module (1..8) · texte_type · phases (anticipation/globale/analytique/
   vocabulaire/synthese) · malette · quiz · à retenir.
   NB « Le boulanger » (Raymond Richard) figure p.10 du manuel de 6e ; le poète
   est mort en 1958 → dans le domaine public, donc utilisable dans ce démo.
   Les textes M5/M6/M8 sont des productions originales « inspirées du programme »
   (mêmes thèmes, mêmes longueurs, mêmes objectifs de langue).
   ========================================================================== */
window.QANAWA_DATA = {
  meta: {
    programme: "6ème année de l'Enseignement de Base (Tunisie) — 8 modules / 4 unités / J1→J8 / 8 h par semaine",
    source: "manuel de lecture + guide méthodologique, CNIP",
    niveau: "pré-A1 → A1",
    avertissement: "Prototype de test : les cartes M5/M6/M8 sont des textes originaux calibrés sur le programme ; la carte M1 reprend un poème du domaine public."
  },
  phonetique: [
    { pair: "[y] / [u]", fr: ["tu", "tout"], ar: "الضمة الفرنسية ليست مثل الضمة العربية", tip: "شفتيك للأمام مثل «و» لكن بصوت «ي»" },
    { pair: "[p] / [b]", fr: ["poule", "boule"], ar: "p غير موجودة في العربية", tip: "ورق أمام فمك: p تحرّك الورق، b لا" },
    { pair: "[e] / [ɛ]", fr: ["été", "ait"], ar: "فتحة مغلقة/مفتوحة", tip: "«é» مبتسم، «è» الفكّ مفتوح" },
    { pair: "[ɑ̃] / [ɔ̃]", fr: ["an", "on"], ar: "الغنّتان", tip: "الأنف يهتزّ: «آن» مقابل «وْن»" },
    { pair: "liaisons", fr: ["les‿amis", "ils‿arrivent"], ar: "الاتصال الإجباري", tip: "لا تقطع: «لِزَمي»" },
    { pair: "intonation", fr: ["Il lit.", "Il lit ?", "Il lit !"], ar: "النبرة", tip: "الصعود في السؤال، الهبوط في الخبر" }
  ],
  cards: [
  {
    id: "m1-poeme-le-boulanger", module: 1, unite: 1, texte_type: "poeme",
    titre_fr: "Le boulanger", titre_ar: "الخبّاز", auteur: "Raymond Richard (domaine public)",
    manuel_page: 10, objectifs_oraux: ["Informer/s'informer", "Décrire/raconter un événement", "Justifier un choix"],
    outils_langue: { grammaire: "déterminants, noms, pronoms personnels", conjugaison: "présent / passé composé / futur", orthographe: "infinitif après à, de, par, pour, sans" },
    projet_ecriture: "Je raconte un événement en rapport avec « le travail »",
    slogan: "Travailler pour s'épanouir",
    thumb: "🥖", duree: "≈ 7 دقائق", difficulte: 2,
    image_fr: "Que vois-tu sur cette image ? Un boulanger travaille pendant que le village dort.",
    anticipation: [
      { q_fr: "Où travaille cet homme ?", q_ar: "أين يعمل هذا الرجل؟", choices: ["À la boulangerie", "À l’école", "À la ferme"], answer: 0, emoji: ["🥖", "🏫", "🚜"] },
      { q_fr: "À votre avis, il se lève…", q_ar: "برأيك، هو يستيقظ…", choices: ["tôt", "tard", "jamais"], answer: 0, emoji: ["🌅", "🌙", "🚫"] }
    ],
    segments: [
      { fr: "Qu’il est drôle, le boulanger,", ar: "ما أطرف الخبّاز!", syl: 3, hot: ["drôle"],
        notes_fr: "« Qu’il est drôle ! » = il est amusant, bizarre (dans le bon sens).", notes_ar: "تعجّب: إنّه مضحك وطريف." },
      { fr: "Avec ses cheveux couleur de farine", ar: "بشعره بلون الطحين", syl: 3, hot: ["cheveux", "farine"],
        notes_fr: "ses cheveux sont blancs comme la farine.", notes_ar: "شعره أبيض كالطحين (استعارة)." },
      { fr: "Sur ses bras, ses mains et sur sa poitrine", ar: "على ذراعيه وكفّيه وصدره", syl: 4, hot: ["bras", "poitrine"],
        notes_fr: "trois parties du corps : bras, mains, poitrine.", notes_ar: "ثلاث أعضاء من الجسم." },
      { fr: "On dirait qu’il vient de neiger.", ar: "يبدو كأنّ الثلج لتوّه هطل.", syl: 4, hot: ["neiger"],
        notes_fr: "« On dirait que » = cela ressemble à…", notes_ar: "تشبيه: الطحين يشبه الثلج." },
      { fr: "Sans se lasser, d’un geste prompt,", ar: "بلا كلل، بحركة سريعة", syl: 3, hot: ["lasser", "prompt"],
        notes_fr: "prompt = rapide.", notes_ar: "prompt = سريع." },
      { fr: "Tandis qu’au village chacun sommeille", ar: "بينما كل واحد في القرية يَغمَض", syl: 4, hot: ["sommeille"],
        notes_fr: "sommeiller = dormir légèrement.", notes_ar: "sommeiller = نوم خفيف." },
      { fr: "Il moule les pains au creux des corbeilles,", ar: "يشكّل الأرغفة في جوف القفف", syl: 4, hot: ["moule", "corbeilles"],
        notes_fr: "mouler = donner la forme.", notes_ar: "mouler = إعطاء الشكل." },
      { fr: "Pareils à des chats accroupis en rond.", ar: "تشبه قططًا قرفصاء في دائرة.", syl: 5, hot: ["pareils", "accroupis"],
        notes_fr: "comparaison : les pains ronds ressemblent à des chats.", notes_ar: "تشبيه: الأرغفة المستديرة كقطط." },
      { fr: "Puis, dans le four au cœur vermeil,", ar: "ثمّ في الفرن ذي القلب الأحمر", syl: 3, hot: ["four", "vermeil"],
        notes_fr: "vermeil = rouge vif (la braise).", notes_ar: "vermeil = أحمر زاهٍ (الجمر)." },
      { fr: "Il les plonge au bout d’une longue pelle", ar: "يُدخلها بطرف مجرفة طويلة", syl: 5, hot: ["plonge", "pelle"],
        notes_fr: "la pelle du boulanger = la longue planche pour enfourner.", notes_ar: "pelle = خشبة إدخال الخبز." },
      { fr: "Et, bientôt, les miches en ribambelles", ar: "وبعد قليل، الأرغفة في طوابير", syl: 4, hot: ["miches", "ribambelles"],
        notes_fr: "une ribambelle = beaucoup, en ligne.", notes_ar: "ribambelle = صفّ طويل/كثير." },
      { fr: "Sortiront, couleur de soleil.", ar: "ستخرج بلون الشمس.", syl: 3, hot: ["sortiront"],
        notes_fr: "futur simple : sortiront (demain / bientôt).", notes_ar: "زمن المستقبل: ستخرج." }
    ],
    malette: [
      { fr: "boulanger", ar: "خبّاز", tun: "الخبّاز", phon: "بوﻟـﭬـانْجِي", syllabes: ["bou","lan","ger"], emoji: "🥖", ex_fr: "Le boulanger pétrit la pâte.", ex_ar: "الخبّاز يعجن العجين." },
      { fr: "farine", ar: "طحين", tun: "الفرينة", phon: "فارين", syllabes: ["fa","rine"], emoji: "🌾", ex_fr: "Il met la farine dans le pétrin.", ex_ar: "يضع الطحين في المعجن." },
      { fr: "corbeille", ar: "قفّة / سلّة", tun: "القفّة", phon: "كور-بِي", syllabes: ["cor","beille"], emoji: "🧺", ex_fr: "Les pains sont dans la corbeille.", ex_ar: "الخبز داخل القفّة." },
      { fr: "four", ar: "فرن", tun: "الكانون / الفرن", phon: "فور", syllabes: ["four"], emoji: "🔥", ex_fr: "Le four est très chaud.", ex_ar: "الفرن حارّ جدًّا." },
      { fr: "pelle", ar: "مجرفة (خشبة الفرن)", phon: "بيل", syllabes: ["pelle"], emoji: "🪵", ex_fr: "Il enfourne avec la pelle.", ex_ar: "يُدخل الخبز بالمجرفة." },
      { fr: "sommeiller", ar: "يَنَام نومة خفيفة", phon: "سو-مِيـْـيِي", syllabes: ["some","iller"], emoji: "😴", ex_fr: "Le village sommeille à cinq heures.", ex_ar: "القرية نائمة فجرًا." },
      { fr: "se lasser", ar: "يتعب / يملّ", phon: "سو-ﻻـسِّي", syllabes: ["las","ser"], emoji: "🥱", ex_fr: "Il travaille sans se lasser.", ex_ar: "يعمل بلا ملل." }
    ],
    quiz: [
      { type: "choice", phase: "globale", prompt_ar: "متى يعمل الخبّاز في القصيدة؟", prompt_fr: "Quand travaille le boulanger ?", choices: ["بينما القرية نائمة", "عند الظهر", "يوم الأحد فقط"], answer: 0,
        hint: "ابحث في الجملة 1: «Tandis qu’au village chacun sommeille».", why: "القصيدة تقول: يعمل والجميع يَغمَض." },
      { type: "image", phase: "globale", prompt_ar: "أي صورة تناسب هذا الشطر؟", prompt_fr: "« couleur de soleil »", choices: ["🟡", "🔵", "⬛"], answer: 0,
        hint: "« couleur de soleil » = لونها مثل الشمس.", why: "الأرغفة تخرج صفراء كالشمس." },
      { type: "choice", phase: "analytique", prompt_ar: "بمَ يشبّه الشاعر الأرغفة في القفّف؟", choices: ["بقطط قرفصاء", "بقمر", "بحجارة"], answer: 0,
        hint: "اقرأ: «Pareils à des chats accroupis en rond».", why: "تشبيه: الأرغفة المستديرة كالقطط الجالسة." },
      { type: "word", phase: "vocabulaire", prompt_ar: "كلمة «vermeil» تعني…", choices: ["أحمر زاهٍ", "أزرق", "بارد"], answer: 0,
        hint: "« le four au cœur vermeil » : ما لون الجمر؟", why: "vermeil = rouge vif كلون الجمر." },
      { type: "order", phase: "analytique", prompt_ar: "رتّب الأحداث كما وردت في القصيدة",
        items: ["يشكّل الأرغفة في القفّف", "يدخلها في الفرن", "تخرج بلون الشمس", "القرية تَغمَض"], order: [3, 0, 1, 2],
        hint: "عُد إلى الجملة 6 ثم الجملة 7 ثم الجملة 9 ثم الجملة 12.", why: "نوم القرية ← تشكيل ← إدخال الفرن ← خروج الخبز." },
      { type: "gram", phase: "depass", prompt_ar: "« sortiront » يدلّ على…", choices: ["المستقبل", "الماضي", "الأمر"], answer: 0,
        hint: "الفعل ينتهي بـ -ont ويقع بعد « bientôt ».", why: "futur simple: événement à venir." }
    ],
    a_retenir: {
      mots: ["le boulanger", "la farine", "le four", "la corbeille", "la pelle"],
      structures: [
        { fr: "On dirait qu’il vient de neiger.", ar: "يبدو كأنّ الثلج هطل." },
        { fr: "Il travaille sans se lasser.", ar: "يعمل بلا ملل." },
        { fr: "Couleur de soleil.", ar: "بلون الشمس." }
      ],
      valeur: "كل عمل شريف، والمبكّرون يستحقّون شكرنا.", valeur_ar: "« Au travail ! » — كل عمل يخدم الناس جميل."
    }
  },
  {
    id: "m5-lecture-le-jardin-de-leila", module: 5, unite: 3, texte_type: "lecture",
    titre_fr: "Le jardin de Leïla", titre_ar: "حديقة ليلى", auteur: "texte original calibré sur le module 5",
    manuel_page: null, objectifs_oraux: ["Décrire une situation/une scène", "Donner un avis/le justifier", "Informer/s'informer"],
    outils_langue: { grammaire: "complément essentiel / non essentiel", conjugaison: "prendre, mettre au passé composé et futur", orthographe: "accord verbe-sujet" },
    projet_ecriture: "Je raconte un événement sur l’environnement et j’intègre un passage descriptif",
    slogan: "Sauver la nature", thumb: "🌱", duree: "≈ 9 دقائق", difficulte: 2,
    image_fr: "Une fille arrose un petit jardin près d’une maison.",
    anticipation: [
      { q_fr: "Quelle est la saison ?", q_ar: "فصل السنة؟", choices: ["le printemps", "l’été", "l’hiver"], answer: 0, emoji: ["🌸", "☀️", "❄️"] },
      { q_fr: "Leïla va…", q_ar: "ليلى ست…", choices: ["planter", "dormir", "voyager"], answer: 0, emoji: ["🌱", "😴", "✈️"] }
    ],
    segments: [
      { fr: "Chez nous, le jardin est petit.", ar: "حديقتنا صغيرة.", syl: 3, hot: ["jardin"], notes_fr: "« chez nous » = في بيتنا/في بلدنا.", notes_ar: "chez nous = عندنا." },
      { fr: "Leïla met les graines dans la terre.", ar: "تضع ليلى البذور في التراب.", syl: 4, hot: ["graines", "terre"], notes_fr: "mettre = يضع.", notes_ar: "mettre فعل مفيد كثير الاستعمال." },
      { fr: "Elle prend le vieux arrosoir bleu.", ar: "تأخذ الإبريق الأزرق القديم.", syl: 4, hot: ["arrosoir"], notes_fr: "un arrosoir = إناء لسقي الزرع.", notes_ar: "arrosoir: اِسـ/سِقاية." },
      { fr: "Chaque matin, elle arrose deux fois.", ar: "كل صباح تسقي مرّتين.", syl: 4, hot: ["arrose"], notes_fr: "deux fois = مرتين.", notes_ar: "مرّتين: عدد المرّات." },
      { fr: "Mais l’eau manque souvent ici.", ar: "لكنّ الماء يندر عندنا.", syl: 4, hot: ["manque"], notes_fr: "manquer = يندر/ينقص.", notes_ar: "manquer: ينقص." },
      { fr: "Alors Leïla garde l’eau de la douche.", ar: "لذا تحتفظ ليلى بماء الاستحمام.", syl: 5, hot: ["garde", "douche"], notes_fr: "garder = يحفظ/يبقي.", notes_ar: "garder: يُبقي." },
      { fr: "En quelques semaines, tout verdit.", ar: "في أسابيع قليلة، اخضرّ كل شيء.", syl: 4, hot: ["verdit"], notes_fr: "verdir = يصير أخضر.", notes_ar: "verdir: صار أخضر." },
      { fr: "Le voisin dit : « Quelle belle idée ! »", ar: "يقول الجار: يا له من فكرة جميلة!", syl: 4, hot: ["voisin"], notes_fr: "le voisin = الجار.", notes_ar: "voisin: الجار." }
    ],
    malette: [
      { fr: "graine", ar: "بذرة", phon: "غرين", syllabes: ["graine"], emoji: "🌰", ex_fr: "Une graine devient un arbre.", ex_ar: "البذرة تصير شجرة." },
      { fr: "arrosoir", ar: "سِقاية", phon: "ارو-سوار", syllabes: ["ar","ro","soir"], emoji: "🪣", ex_fr: "L’arrosoir est en plastique.", ex_ar: "السّقاية من البلاستيك." },
      { fr: "arroser", ar: "يسقي", phon: "ارو-زِي", syllabes: ["ar","ro","ser"], emoji: "💧", ex_fr: "J’arrose le jardin le soir.", ex_ar: "أسقي الحديقة مساءً." },
      { fr: "terre", ar: "تراب", phon: "تير", syllabes: ["terre"], emoji: "🟫", ex_fr: "La terre est sèche.", ex_ar: "التراب جافّ." },
      { fr: "manquer", ar: "يَنقُص / يندر", phon: "مان كِي", syllabes: ["man","quer"], emoji: "📉", ex_fr: "L’eau manque en été.", ex_ar: "الماء يندر صيفًا." },
      { fr: "garder", ar: "يحفظ / يبقي", phon: "غار دِي", syllabes: ["gar","der"], emoji: "🫙", ex_fr: "Nous gardons l’eau propre.", ex_ar: "نحفظ الماء النظيف." },
      { fr: "verdir", ar: "يخضرّ", phon: "فير دير", syllabes: ["ver","dir"], emoji: "🟢", ex_fr: "L’herbe verdit après la pluie.", ex_ar: "العشب يخضرّ بعد المطر." },
      { fr: "voisin", ar: "جار", tun: "الجار", phon: "فوا-زِن", syllabes: ["voi","sin"], emoji: "🏠", ex_fr: "Le voisin nous aide.", ex_ar: "الجار يساعدنا." }
    ],
    quiz: [
      { type: "choice", phase: "globale", prompt_ar: "مشكل ليلى الرئيسي هو…", choices: ["قلّة الماء", "كبر الحديقة", "برد الطقس"], answer: 0,
        hint: "اقرأ الجملة 5: «Mais l’eau manque souvent ici.»", why: "الماء نادر، فهي تبحث عن حلّ." },
      { type: "image", phase: "globale", prompt_ar: "أي صورة تناسب النصّ؟", choices: ["🌱💧", "🏖️", "⚽"], answer: 0, hint: "النصّ عن زراعة وسقي.", why: "بذرة + ماء = موضوع الحديقة." },
      { type: "choice", phase: "analytique", prompt_ar: "كيف تتصرّف ليلى لتوفير الماء؟", choices: ["تحتفظ بماء الاستحمام", "تشترى ماءً", "لا تسقي"], answer: 0,
        hint: "الجملة 6 فيها كلمة «garde».", why: "إعادة استعمال الماء = حلّ بيئي." },
      { type: "gram", phase: "analytique", prompt_ar: "« dans la terre » في الجملة 2 هو…", choices: ["متعلّق غير أساسي", "فاعل", "نعت"], answer: 0,
        hint: "احذفه: هل يبقى المعنى؟ «Leïla met les graines…»", why: "يمكن حذفه ⇒ complément non essentiel (هدف وحدة 5)." },
      { type: "word", phase: "vocabulaire", prompt_ar: "« verdit » يعني…", choices: ["يصير أخضر", "يصير أصفر", "يجفّ"], answer: 0, hint: "الجذر vert = أخضر.", why: "verdir = devenir vert." },
      { type: "order", phase: "depass", prompt_ar: "رتّب الخطوات كما في النصّ",
        items: ["تسقي مرّتين", "تضع البذور", "الجار يمدح", "تأخذ السّقاية"], order: [1, 3, 0, 2],
        hint: "البذور ← السّقاية ← السقي ← مدح الجار.", why: "هذا ترتيب الأحداث في الجمل 2-4-8." }
    ],
    a_retenir: {
      mots: ["une graine", "la terre", "arroser", "manquer", "garder"],
      structures: [
        { fr: "Chaque matin, elle arrose deux fois.", ar: "كل صباح تسقي مرّتين." },
        { fr: "Il faut garder l’eau.", ar: "يجب حفظ الماء." },
        { fr: "Quelle belle idée !", ar: "يا لها من فكرة جميلة!" }
      ],
      valeur: "لكلّ قطرة ماء قيمة: نعيد الاستعمال ولا نُبذّر.", valeur_ar: "وحدة 5 «Sauver la nature»."
    }
  },
  {
    id: "m6-lecture-la-lettre-damine", module: 6, unite: 3, texte_type: "lecture",
    titre_fr: "La lettre d’Amine", titre_ar: "رسالة أمين", auteur: "texte original calibré sur le module 6",
    manuel_page: null, objectifs_oraux: ["Donner des conseils", "Informer/s'informer", "Raconter", "Décrire une personne"],
    outils_langue: { grammaire: "complément de lieu", conjugaison: "aller, faire au passé composé et futur", orthographe: "accords heureux/heureuse, mûr/mûre" },
    projet_ecriture: "Je raconte un événement sur la santé et j’intègre des répliques",
    slogan: "Etre en forme et mieux se porter", thumb: "🌙", duree: "≈ 6 دقائق", difficulte: 1,
    image_fr: "Un garçon écrit une lettre à son ami.",
    anticipation: [
      { q_fr: "Amine écrit à…", q_ar: "أمين يكتب إلى…", choices: ["son ami", "le directeur", "sa grand-mère"], answer: 0, emoji: ["🧑", "👨‍🏫", "👵"] }
    ],
    segments: [
      { fr: "Cher Yassine,", ar: "عزيزي ياسين،", syl: 2, hot: [], notes_fr: "تحية بداية الرسالة.", notes_ar: "صيغة افتتاح الرسالة." },
      { fr: "je ne dors plus bien depuis la compétition.", ar: "لم أنم جيّدًا منذ المباراة.", syl: 5, hot: ["dors", "compétition"], notes_fr: "dormir ← dors (présent).", notes_ar: "من أفعال الشذوذ." },
      { fr: "Le médecin me donne trois conseils.", ar: "الطبيب يعطيني ثلاث نصائح.", syl: 4, hot: ["médecin", "conseils"], notes_fr: "donner des conseils = ينصح.", notes_ar: "donner un conseil." },
      { fr: "D’abord, je fais vingt minutes de marche.", ar: "أوّلًا، أمشي عشرين دقيقة.", syl: 5, hot: ["d’abord", "marche"], notes_fr: "d’abord = أوّلًا (مراتب).", notes_ar: "أدوات الترتيب." },
      { fr: "Ensuite, je bois de l’eau, pas de soda.", ar: "ثمّ أشرب الماء لا الصودا.", syl: 4, hot: ["ensuite", "soda"], notes_fr: "ensuite = ثمّ.", notes_ar: "ثمّ." },
      { fr: "Enfin, mon téléphone reste dans la cuisine.", ar: "أخيرًا، هاتف يبقى في المطبخ.", syl: 5, hot: ["enfin", "cuisine"], notes_fr: "complément de lieu : dans la cuisine.", notes_ar: "متعلّق المكان (هدف وحدة 6)." },
      { fr: "Cette nuit, je vais mieux dormir.", ar: "هذه اللّيلة سأنام أفضل.", syl: 4, hot: ["cette", "mieux"], notes_fr: "aller + infinitif = futur proche.", notes_ar: "المستقبل القريب." }
    ],
    malette: [
      { fr: "compétition", ar: "مسابقة / مباراة", phon: "كوم-بِي-سِيون", syllabes: ["com","pé","ti","tion"], emoji: "🏁", ex_fr: "La compétition est samedi.", ex_ar: "المسابقة يوم السبت." },
      { fr: "médecin", ar: "طبيب", phon: "ميد-سان", syllabes: ["mé","decin"], emoji: "🩺", ex_fr: "Le médecin est gentil.", ex_ar: "الطبيب لطيف." },
      { fr: "conseil", ar: "نصيحة", phon: "كون-سِي", syllabes: ["con","seil"], emoji: "💡", ex_fr: "Voici un bon conseil.", ex_ar: "هذه نصيحة جيّدة." },
      { fr: "soda", ar: "مشروب غازي", phon: "سودا", syllabes: ["so","da"], emoji: "🥤", ex_fr: "Je ne bois pas de soda.", ex_ar: "لا أشرب المشروبات الغازية." },
      { fr: "cuisine", ar: "مطبخ", phon: "كو-سين", syllabes: ["cui","sine"], emoji: "🍳", ex_fr: "Le pain est dans la cuisine.", ex_ar: "الخبز في المطبخ." }
    ],
    quiz: [
      { type: "choice", phase: "globale", prompt_ar: "مشكلة أمين هي…", choices: ["قلّة النوم", "كسر رجله", "ضائع مدرسي"], answer: 0, hint: "الجملة 2.", why: "لم ينم جيّدًا منذ المباراة." },
      { type: "order", phase: "analytique", prompt_ar: "رتّب النصائح الثلاث بأدواتها", items: ["الهاتف في المطبخ", "المشي عشرين دقيقة", "شرب الماء"], order: [1, 2, 0], hint: "D’abord → Ensuite → Enfin.", why: "أدوات الترتيب تحفظ تسلسل النص." },
      { type: "gram", phase: "analytique", prompt_ar: "« dans la cuisine » يجيب عن سؤال…", choices: ["أين؟", "متى؟", "كيف؟"], answer: 0, hint: "جرب: Où reste mon téléphone ?", why: "complément de lieu (برنامج وحدة 6)." },
      { type: "word", phase: "vocabulaire", prompt_ar: "« conseils » تعني…", choices: ["نصائح", "أدوية", "أسئلة"], answer: 0, hint: "donner des conseils.", why: "المعنى مرتبط بالطبيب." },
      { type: "image", phase: "depass", prompt_ar: "لو كنت مكان أمين، ما أوّل ما تفعله؟", choices: ["أمشي", "ألعب إلى منتصف الليل", "أشرب صودا"], answer: 0, hint: "النصيحة الأولى في الرسالة.", why: "الحركة تُحسّن النوم — وهذا ما تقوله القصّة." }
    ],
    a_retenir: {
      mots: ["donner un conseil", "d’abord… ensuite… enfin", "se coucher"],
      structures: [
        { fr: "Je vais mieux dormir.", ar: "سأنام أفضل (مستقبل قريب)." },
        { fr: "Mon téléphone reste dans la cuisine.", ar: "متعلّق المكان." }
      ],
      valeur: "ننصح صديقنا بجملة واحدة لطيفة لا بأوامر كثيرة.", valeur_ar: "هدف وحدة 6: donner des conseils."
    }
  },
  {
    id: "m8-doc-fetes-dailleurs", module: 8, unite: 4, texte_type: "documentaire",
    titre_fr: "Quatre fêtes d’autres pays", titre_ar: "أعياد في بلدان أخرى", auteur: "texte original calibré sur le module 8",
    manuel_page: null, objectifs_oraux: ["Informer/s'informer", "Décrire un lieu, un personnage", "Exprimer un avis/une préférence"],
    outils_langue: { grammaire: "complément de manière", conjugaison: "vouloir / pouvoir au présent", orthographe: "participe passé avec être" },
    projet_ecriture: "Je raconte un événement sur d’autres modes de vie et j’intègre un passage descriptif",
    slogan: "Découvrir d’autres modes de vie", thumb: "🌍", duree: "≈ 8 دقائق", difficulte: 3,
    image_fr: "Des enfants de plusieurs pays, chacun avec sa fête.",
    anticipation: [
      { q_fr: "Tu veux découvrir…", q_ar: "تودّ اكتشاف…", choices: ["d’autres pays", "ta rue", "la lune"], answer: 0, emoji: ["🌍", "🏘️", "🌕"] }
    ],
    segments: [
      { fr: "Au Canada, en décembre, les rues brillent de lumières.", ar: "في كندا، في ديسمبر، تلمع الشوارع بالأضواء.", syl: 6, hot: ["brillent", "lumières"], notes_fr: "briller = يلمع.", notes_ar: "حالة وصف (passage descriptif)." },
      { fr: "Au Japon, en janvier, on offre des cartes vœux.", ar: "في اليابان، في جانفي، يهدي الناس بطاقات التهاني.", syl: 5, hot: ["cartes", "vœux"], notes_fr: "une carte de vœux = بطاقة تهنئة.", notes_ar: "تقليد مختلف عنّا." },
      { fr: "En Inde, en novembre, les maisons s’allument de petites lampes.", ar: "في الهند، في نوفمبر، تُضاء البيوت بقناديل صغيرة.", syl: 6, hot: ["s’allument", "lampes"], notes_fr: "s’allumer = يُضاء (فعل منصرف).", notes_ar: "se/ s’ : فعل انفعالي." },
      { fr: "Chez nous, à l’Aïd, on rend visite aux grands-parents.", ar: "عندنا في العيد، نزور الأجداد.", syl: 5, hot: ["rend visite"], notes_fr: "rendre visite à = يزور.", notes_ar: "تعبير ثابت." },
      { fr: "Les fêtes changent, la joie est la même.", ar: "الأعياد تختلف والفرح واحد.", syl: 4, hot: ["changent"], notes_fr: "changer = يختلف/يتغيّر.", notes_ar: "خلاصة النص الوثائقي." },
      { fr: "Nous pouvons apprendre cinq mots de chaque pays.", ar: "يمكننا أن نتعلّم خمس كلمات من كل بلد.", syl: 6, hot: ["pouvons"], notes_fr: "pouvoir + infinitif.", notes_ar: "pouvoir au présent (هدف وحدة 8)." }
    ],
    malette: [
      { fr: "lumières", ar: "أضواء", phon: "لو-ميير", syllabes: ["lu","mières"], emoji: "💡", ex_fr: "Les lumières de la ville.", ex_ar: "أضواء المدينة." },
      { fr: "carte de vœux", ar: "بطاقة تهنئة", phon: "كارت دو فو", syllabes: ["carte","vœux"], emoji: "💌", ex_fr: "J’écris une carte de vœux.", ex_ar: "أكتب بطاقة تهنئة." },
      { fr: "lampe", ar: "قنديل / مصباح", phon: "لامب", syllabes: ["lampe"], emoji: "🪔", ex_fr: "Une petite lampe en terre.", ex_ar: "قنديل صغير من طين." },
      { fr: "rendre visite", ar: "يزور", phon: "راند فيزيت", syllabes: ["rendre","visite"], emoji: "🚪", ex_fr: "Nous rendons visite à mamie.", ex_ar: "نزور جدّتنا." },
      { fr: "pouvoir", ar: "يمكنه / يقدر", phon: "بو-فوار", syllabes: ["pou","voir"], emoji: "💪", ex_fr: "Je peux lire ce texte.", ex_ar: "أستطيع قراءة هذا النصّ." }
    ],
    quiz: [
      { type: "choice", phase: "globale", prompt_ar: "النصّ الوثائقي يقارن بين…", choices: ["أعياد في بلدان", "رياضات", "أطباق"], answer: 0, hint: "العنوان: «quatre fêtes».", why: "موضوع وحدة 8: أنماط عيش أخرى." },
      { type: "match", phase: "analytique", prompt_ar: "صِل البلد بالفصل المناسب", pairs: [["Canada","décembre"],["Japon","janvier"],["Inde","novembre"]],
        hint: "كل جملة تذكر البلد ثم الشهر.", why: "الربط بين المكان والزمان = معلومة وثائقية." },
      { type: "choice", phase: "analytique", prompt_ar: "« la joie est la même » تعني أنّ…", choices: ["الفرح مشترك", "الأعياد متشابهة تمامًا", "لا عيد في كندا"], answer: 0,
        hint: "الجملة 5 تقارن وتُختم بخلاصة.", why: "الطقوس تختلف، الشعور واحد." },
      { type: "gram", phase: "vocabulaire", prompt_ar: "« Nous pouvons apprendre » : pouvoir هنا يدلّ على…", choices: ["القدرة/الإمكان", "الوجوب", "الماضي"], answer: 0,
        hint: "pouvoir + infinitif.", why: "برنامج وحدة 8: conjuguer vouloir/pouvoir au présent." },
      { type: "word", phase: "depass", prompt_ar: "« s’allument » : الفعل هنا…", choices: ["منصرف (يُضاء)", "أمر", "اسم"], answer: 0, hint: "se/s’ قبل الفعل.", why: "verbe pronominal (ملاحظة رسمية: تُدرس طوال السنة)." }
    ],
    a_retenir: {
      mots: ["une fête", "offrir", "visiter", "le même / la même"],
      structures: [
        { fr: "Les fêtes changent, la joie est la même.", ar: "الأعياد تختلف، الفرح واحد." },
        { fr: "Nous pouvons apprendre cinq mots.", ar: "يمكننا تعلّم خمس كلمات." }
      ],
      valeur: "نفهم الآخرين حين نكتشف عاداتهم.", valeur_ar: "هدف وحدة 8: découvrir d’autres modes de vie."
    }
  }
  ],
  teacher_demo: {
    classe: "6è ب — مدرسة Ibn Rachik (بيانات مضلّلة)", eleves: [
      { pseudo: "قارئ-14", WCPM: 62, comprehension: 0.81, phonologie: 3, lexique: 2, syntaxe: 1, fluidite: 3, comprehension_n: 3,
        forces: ["يحترم النبرات في السؤال", "يميّز [y]/[u]", "يقرأ جملة كاملة دون توقّف"],
        faiblesses: ["الغنّتان [ɑ̃]/[ɔ̃]", "الوصل les‿amis", "e muet في pâtisserie"],
        exemples: [["lue","lu"],["les amis","لِي زَمي"],["pâtisserie","باتيسري"]] },
      { pseudo: "قارئ-22", WCPM: 38, comprehension: 0.55, phonologie: 1, lexique: 1, syntaxe: 2, fluidite: 1, comprehension_n: 2,
        forces: ["يجيب عن أسئلة الصورة", "يحفظ 12 كلمة في الحديقة", "يطلب المساعدة بدل الاستسلام"],
        faiblesses: ["[p]/[b]", "تقطيع الكلمات الطويلة", "زمن sortiront (مستقبل)"],
        exemples: ["boule/poule", "ri-bam-belle", "sortiront ← présent"] },
      { pseudo: "قارئ-07", WCPM: 74, comprehension: 0.9, phonologie: 3, lexique: 3, syntaxe: 2, fluidite: 3, comprehension_n: 3,
        forces: ["تلخيص من 3 جمل", "نطق [ʁ] سليم", "يستخدم المعجم بنفسه"],
        faiblesses: ["يتسرّع في الفهم", "يتخطّى علامات الترقيم", "قلّة شرح رأيه"],
        exemples: ["—", "virgule ignorée", "avis non justifié"] }
    ],
    criteres: ["C1 الملاءمة", "C2 وضوح الخطّ", "C3 الصحة اللغوية", "C4 الصحة الإملائية", "C5 انسجام النصّ", "C6 أصالة الأفكار", "C7 التقديم المادي"]
  }
};
