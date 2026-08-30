# `prototype/` — نموذج أولي يعمل في المتصفح (بدون بناء، بدون اعتمادات)

غرضه الوحيد: **أن تُجرّب تجربة التلميذ وتراها بعينك** قبل بناء التطبيق الحقيقي بالسباقات S0→S10.
لا خادم، لا npm، لا مفاتيح API: ملف HTML + بيانات ثابتة + صوت المتصفّح.

## السباقات المُمثَّلة هنا

| سباق | ما هو موجود في النموذج |
|---|---|
| S2 القارئ | قراءة جملة بجملة، سماع عادي/🐢 بطيء، سطر معزول، نقرة على الكلمة = سماعها، ضغطة على ترجمة الكلمة، ⭐ «لم أفهمها» |
| S3 الحقيبة + FSRS | malette لكل كلمة: مقطعي + API مبسّطة + MSA/دارجة + emoji + مثال تونسي؛ أجندة مراجعة تلقائية (`due`) |
| S4 الفهم | 5–6 عناصر بالترتيب الرسمي (globale → analytique → vocabulaire → dépassement) وتلميح لا يكشف الجواب |
| S5 النطق | محطة نطق بالتباينات الـ15 التي نصّ عليها الدليل ص26 |
| S6 الروبوت | «نور» بقواعد محلية: طمأنة، تلميح بدل الجواب، رفض طلب الحل، منع أسئلة المعلومات الشخصية |
| S7 التحفيز | نجوم بسقف 20/يوم، سلسلة لا تنكسر بيوم راحة، حديقة كلمات، بلا ترتيب بين التلاميذ |
| S8 الأستاذ | heatmap، 3 قوّة/3 ضعف بمثال فعلي، إسناد نصّ + درجة دعم، شبكة C1→C7، تصدير CSV/طباعة، صفّ QC |
| S10 | اختبار توجيه مصغّر (استماع/قراءة/فهم/ثقة) يعطي مسار A/B/C بلا علامة للتلميذ |

## التشغيل

Ce prototype est **vérifié par machine**, pas seulement ouvert à l'œil :

```bash
node tools/check_prototype.mjs      # schéma des cartes + règle « un indice ne contient jamais la réponse »
node tools/harnais_prototype.mjs    # rejoue TOUT le parcours (élève + enseignant) sur http://127.0.0.1:4173
```

Le second outil charge les pages depuis le serveur, clique ~40 fois et échoue si une règle produit casse
(état actuel : ✅ vert). Il a d'ailleurs attrapé deux vrais bugs avant la première utilisation humaine
(`teacher.js` plantait sur les exemples d'un élève réel ; `#/phono` et `#/placement` n'avaient pas de route).

```bash
cd prototype && python3 -m http.server 4173 --bind 0.0.0.0
# puis http://localhost:4173/   (et  http://localhost:4173/teacher.html)
```

## التحقق آليًا

```bash
node tools/check_prototype.mjs      # 4 cartes · 33 énoncés · 26 mots · 22 items · 6 contrastes
node -e "for (const f of ['app.js','data.js','teacher.js','sw.js']) new Function(require('fs').readFileSync('prototype/'+f,'utf8')); console.log('syntax OK')"
python3 tools/check_curriculum.py   # le référentiel du programme reste conforme
```

## حدود النموذج (ما لا يفعله بعد)

- **الصوت** من محرّك المتصفّح فقط (`speechSynthesis`)؛ إن لم يكن صوت فرنسي مثبّتًا في نظامك تسمّع اللهجة الافتراضية، والتظليل **تقديري** (زمن/عدد أحرف) لا `word boundary` حقيقي — في النسخة النهائية يوفّره Azure/Google.
- **لا ميكروفون مسجَّل**: القراءة الجهرية تُقاس بعدّ كلمات صحيحة يدويًا أو عبر `SpeechRecognition` (يطلب إذنًا، ولا يُرفع شيء للخادم).
- **بياناتك لا تغادر الجهاز**: لا حساب، لا خادم، localStorage فقط — التصفير من ⚙️ «تصفير بياناتي».
- **الروبوت** بقواعد ثابتة (بدون LLM) ليُختبَر التدفّق لا الذكاء.
- النصوص: M1 قصيدة من الكتاب **في الملك العام** (Raymond Richard، ت 1958)؛ M5/M6/M8 نصوص أصلية محاكية للبرنامج. لا نصّ خاضع لحقوق CNIP هنا.

## نسخة Windows

`win32/Qanawa.exe` (source lisible : `QanawaLauncher.cs` + `QanawaIcon.cs` + `build_exe.bat`) sert ce
dossier sur `http://localhost:8137/` puis ouvre le navigateur : localStorage fiable, service worker
autorisé, aucun droit admin. Notice d'installation : `win32/README-WINDOWS.md`.
Le job `release-windows.yml` (à copier dans `.github/workflows/`) construit et publie le binaire sur
`windows-latest`, en rejouant `tools/harnais_prototype.mjs` **contre le .exe lui-même**.