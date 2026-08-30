# الأرشيف الرسمي المستعمل — نسخة مختصرة (التفصيل في official-docs/README.md)

| ملف | العنوان الرسمي | التحقق من الهوية |
|---|---|---|
| `official-docs/manuel-lecture-6e.pdf` | *Un pas de plus… vers le collège — Manuel de lecture*, 6ème année, CNIP (136 ص) | ص1 «République Tunisienne — Ministère de l'Éducation» · sha `8e2bc4ed5b9c` |
| `official-docs/cahier-activites-6e.pdf` | نفس الكتاب — *Cahier d'activités* (112 ص) | نفس الكتّاب والمقيّمين · sha `22628c45b70e` |
| `official-docs/guide-methodologique-6e.pdf` | *Guide Méthodologique*, CNIP (216 ص) | ص1 «Guide Méthodologique… 6ème année» · sha `37af1887dee9` |
| `official-docs/fichier-classe-6e.pdf` | *6ème année — Approche par compétences — Fichier classe, Français* (438 ص) | ص1 «centre national pedagogique… 6eme annee enseignement de base» · sha `b50d3dd86a28` |
| `official-docs/module-prerequis-6e.pdf` | CNIP **code 521613** — *Module des prérequis*, feuilles PL1→PL20 (25 ص) | ص1 «code 521613… Ministère de l'éducation» · sha `b18de38a7efc` |

مُولَّد آليًا بـ:
```bash
python3 tools/index_manuel.py official-docs/manuel-lecture-6e.pdf \
        --out data/curriculum-6e.json --index data/page-index-manuel.json
# [index] 42/56 عنوانًا تحت نصّها · [pl] 24 feuilles reproductibles indexées · [ok] 8 modules
python3 tools/check_curriculum.py     # ✅ référentiel conforme au programme officiel
```

© Tous droits réservés au CNIP — البنية والأهداف وعناوين النصوص تُستعمل كمرجع تصميم؛ نصّ الكتاب يُعالَج داخل
**فضاء الأستاذ/القسم الخاص** ولا يُنشَر علنًا عبر المنصّة.
