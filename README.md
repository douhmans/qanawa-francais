# منصة «قَنَوة» — تسهيل فهم وقراءة الفرنسية لتلاميذ السنة السادسة أساسي بتونس

مجلّد تأسيس للمشروع: **البرومت الموجَّه لوكيل البرمجة + مرجع البرنامج الرسمي المُستخرَج من وثائق وزارة التربية / المركز الوطني البيداغوجي (CNIP)**.

## المشكل · الحل · الآلية

- **المشكل:** تلاميذ الابتدائي في تونس يتعثّرون في قراءة نصوص كتاب الفرنسية الرسمي: لا نموذج صوتي سليم، لا ترجمة مرئية، لا دعم منزلي ← عزوف عن المادة.
- **الحل:** منصة رقمية PWA تعرض كل نصّ جملةً جملة مع سماع + ترجمة عربية + صورة + نطق مُقيَّم، ويرافق التلميذ روبوت مشجّع، ويقيّم الأستاذ من لوحة قسم.
- **الآلية:** pré-lecture (تنبّؤ + حقيبة كلمات) → قراءة karaoke → «اقرأ بصوتك» مع تصحيح النطق → أسئلة فهم متدرّجة → لعبة مفردات → «ما يجب حفظه» بمراجعة مباعدة → تحفيز بالنجوم وحديقة الكلمات.

## البنية

```
├── prompt-plateforme-francais-6a.md   ← البرومت الكامل (الأم + 8 برومبات تابعة + نسخة إنجليزية)
├── prompt-master.txt                    ← البرومت الأم وحده (322 سطرًا) للنسخ المباشر في أداة البرمجة
├── docs-curriculum-6e.md                ← تحليل رسمي: البنية، الأهداف، الأيام الثمانية، الفونيتيك، التقييم
├── docs-sources-officiels.md            ← التحقق من هوية كل وثيقة رسمية
├── official-docs/                       ← الوثائق الرسمية الخمس من CNIP + كتالوجها
├── data/curriculum-6e.json              ← مرجع الحقيقة الآلي (وحدات × نصوص × أهداف × وسائل)
├── data/page-index-manuel.json          ← عنوان كل نصّ رسمي ↔ رقم صفحته في كتاب التلميذ
├── data/page-index-cahier.json          ← rubriques du cahier d'activités ↔ صفحاته
├── data/tunisian-primary-lexicon.txt    ← «ما دُرس سابقًا» (517 كلمة) لتمييز الكلمات الجديدة
├── tools/index_manuel.py                ← PDF الكتاب → خريطة البرنامج + فهرسة الصفحات + أوراق PL
├── tools/build_official_card.py         ← صفحة الكتاب (صورة/PDF/نص) → بطاقة درس JSON + تقرير QC
├── tools/check_curriculum.py            ← فحص تطابق المرجع مع البرنامج (موصول بـ CI)
├── examples/p11-raw.txt                 ← صفحة 11 الحقيقية من كتاب التلميذ (نصّ مُستخرَج)
├── examples/cards/m1-466ae4.json        ← بطاقة مولّدة منها (إثبات عمل الحلقة)
└── ops/curriculum.yml     ← CI يعيد التوليد ويقارن
```

## إعادة الإنتاج والتحقق (كلها شُغِّلت فعليًا في هذا المستودع)

```bash
pip install pymupdf pyphen                      # التبعات المستعمَلة هنا
python3 tools/index_manuel.py official-docs/manuel-lecture-6e.pdf \
        --out data/curriculum-6e.json --index data/page-index-manuel.json \
        --index-cahier official-docs/cahier-activites-6e.pdf
# [index] 42/56 عنوانًا تحت نصّها · [pl] 24 feuilles indexées · [cahier] 20/56 rubriques · [ok] 8 modules

python3 tools/check_curriculum.py
# ✅ référentiel conforme au programme officiel (8 modules / 5 textes / J1-J8 / C1-C7)

python3 tools/build_official_card.py examples/p11-raw.txt --module 1 --out examples/cards
# module 1 · Apprentie comédienne (match 1.0) · phrases: 9 · mots nouveaux: 12
```

للصور/الصوت/OCR (تُلحَق في سباق البناء، تتطلّب أدوات خارجية): `pip install pytesseract pillow`
+ `apt-get install tesseract-ocr tesseract-ocr-fra tesseract-ocr-ara`، ثم مرّر صورة صفحة بدل ملف نصّي.

## الحقائق الرسمية التي بُني عليها كل شيء (لا افتراضات)

- **8 وحدات (modules)** في **4 وحدات إدماجية (unités)**؛ كل وحدة = أسبوعان/8 أيام-دراسة، **8 ساعات أسبوعيًا** (الدليل ص20).
- لكل وحدة **5 نصوص** (3 «Je lis» على حصّتين: compréhension ثم fonctionnement، + «Je lis pour m'informer» ي-7، + «Je lis pour agir» ي-8) + قصيدة «Je récite» + «Page vocabulaire» + مشروع كتابة؛ ويومان-حاجز وأسابيع تقييم/معالجة + 2-3 أسابيع للتقييم القبلي.
- **لا ثلاثيات في التنظيم البيداغوجي**؛ التنقيط للنصوص الثلاثية فقط، ودرجات الإتقان `0 / + / ++ / +++`.
- **مراحل استغلال النصّ** (الدليل ص33-34): Anticipation → Approche globale → Approche analytique → Vocabulaire → Synthèse/dépassement؛ والكتاب يشرح «**en moyenne deux mots par texte**» فقط ← هذه فجوة الدعم التي تملؤها المنصّة.
- الدليل ينصّ على **غياب حصة فونيتيك في التوقيت** (ص26) ويحدّد **15 تباينًا صوتيًا عربي/فرنسي** ← مادة «محطة النطق» في المنصّة.
- تقييم الكتابة بـ **7 معايير C1→C7**؛ **portfolio** هو جسر التلميذ/الأستاذ/الأولياء؛ و**24 ورقة PL رسمية** (4 للتقييم القبلي + PL5→PL20 للوحدات) صارت مرقمنة.
- أسماء شرائح فضاء التلميذ مأخوذة حرفيًا من الكتاب: *Je récite / Je lis / Je lis pour m'informer et me documenter / Je lis pour agir / J'ouvre la boîte à mots / Je joue avec les mots / Je m'entraîne / J'observe / Je retiens / Je produis / Je fais le point* + «fiche d'auto-évaluation» كل وحدتين.

## حقوق النشر

الوثائق © CNIP («Tous droits réservés au Centre National Pédagogique»). القاعدة في هذا المشروع:
البنية والأهداف وعناوين النصوص وصور الصفحات تُستعمل داخليًا في **فضاء الأستاذ/القسم الخاص**؛ أما **المنصّة العمومية** فتنشر البيانات الوصفية والمحتوى المشتَقّ (تمارين، بطاقات مفردات، صور، صوت) لا النصّ الخام للكتاب — يضمن ذلك `rights.mode` + فحص QC في `tools/build_official_card.py`. الكود والمرجع مرخّصان AGPL-3.0 (انظر `LICENSE`).

## الخطوة الموالية المقترحة

`S-1` من البرومت: تثبيت هذا المرجع في `main` مع CI، ثم توليد **8 بطاقات (نصّ من كل وحدة)** عبر `tools/build_official_card.py`، وبناء اختبار التشخيص على أوراق PL1→PL4، وتجريبها مع **20 تلميذًا لأسبوعين** مع قياس WCPM ونسبة الفهم قبل/بعد.
