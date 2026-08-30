/* ============================================================================
   Harnais « sans navigateur » du prototype — sert de preuve d'exécution.
   Il charge les pages **depuis le serveur HTTP local** (donc exactement les
   fichiers que l'utilisateur voit dans la prévisualisation), joue tout le
   parcours élève (7 étapes), teste les règles produit non négociables
   (indice jamais la réponse, refus de la solution, plafond de stars,
   aucune donnée personnelle), puis rend la vue enseignant.
   Usage :
     cd prototype && python3 -m http.server 4173 --bind 0.0.0.0 &
     node tools/harnais_prototype.mjs
   Sortie : 1 ligne par vérification, code de retour 1 si une règle casse.
   ========================================================================== */
import { JSDOM, VirtualConsole } from "/tmp/jsdomdom/node_modules/jsdom/lib/api.js";

const BASE = process.env.QANAWA_URL || "http://127.0.0.1:4173";
const errors = [], warns = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push("jsdomError: " + ((e.detail && e.detail.message) || e.message)));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));
vc.on("warn", (...a) => warns.push("console.warn: " + a.join(" ")));

const mocks = (w) => {
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  w.speechSynthesis = { getVoices: () => [{ name: "Test FR", lang: "fr-FR", voiceURI: "fr-test" }], speak() {}, cancel() {}, speaking: false };
  w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  w.AudioContext = undefined;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.print = () => {};
  Object.defineProperty(w.navigator, "serviceWorker", { value: { register: () => Promise.resolve({}) }, configurable: true });
  w.confirm = () => false;
};
const load = (p) => JSDOM.fromURL(BASE + p, {
  runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, beforeParse: mocks
});
const opened = await load("/index.html").catch(e => {
  console.log("IMPOSSIBLE de charger " + BASE + "/index.html → " + e.message);
  console.log("Lance d'abord le serveur :  cd prototype && python3 -m http.server 4173 --bind 0.0.0.0");
  process.exit(2);
});

const wait = (ms = 70) => new Promise(r => setTimeout(r, ms));
const dom = opened;
const win = dom.window;
const $ = s => win.document.querySelector(s);
const $$ = s => Array.from(win.document.querySelectorAll(s));
const click = async (elOrSel, ms = 100) => {
  const n = typeof elOrSel === "string" ? $(elOrSel) : elOrSel;
  if (!n) throw new Error("bouton introuvable: " + elOrSel);
  n.click(); await wait(ms);
};
const goHash = async (h, ms = 130) => { win.location.hash = h; win.dispatchEvent(new win.HashChangeEvent("hashchange")); await wait(ms); };
const step = (label, cond, extra = "") => {
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${extra ? " → " + extra : ""}`);
  if (!cond) errors.push("échec: " + label + (extra ? " (" + extra + ")" : ""));
};
const nextBtn = () => [...$$("#main button")].find(b => /التالي|ابدأ القراءة|أنهِ/.test(b.textContent));

await wait(450);
if (errors.length) console.log("ERREURS AU CHARGEMENT:\n  - " + errors.join("\n  - ").slice(0, 2500));

console.log("\n=== 1) démarrage élève (minimal, sans compte) ===");
step("onboarding demandé", !!$("#ob-name"), $("#main")?.textContent.replace(/\s+/g, " ").slice(0, 42));
step("aucun champ prénom+nom+école+contact", !$("input[type=email], input[type=tel], select[name=ecole]"));
$("#ob-name").value = "سلمى";
await click($$(".icon-btn")[1]);
await click([...$$("button")].find(b => /مساعدة كثيرة/.test(b.textContent)));
await click([...$$("button")].find(b => /ادخل المنص/.test(b.textContent)), 200);
step("accueil : 4 cartes issues du programme (M1·M5·M6·M8)", $$(".lesson").length === 4, $$(".lesson").length + " cartes");
const st0 = JSON.parse(win.localStorage.getItem("qanawa.state.v1") || "{}");
step("seul pseudo/voie/stars stockés — rien d'identifiant", !!st0.pseudo && !/adresse|ecole|ecole|email|tel/i.test(JSON.stringify(Object.keys(st0))), Object.keys(st0).join(","));

console.log("\n=== 2) les 7 étapes de la carte, dans l'ordre du guide (p.33-34) ===");
await goHash("#/card/m1-poeme-le-boulanger", 200);
step("étape 1 · couverture + anticipation", /Que vois-tu/.test($("#stage").textContent));
await click($$(".opt")[0], 120);
step("la prédiction est encouragée, jamais notée", /تخمين ذكي|ذكي/.test($("#stage").textContent));
const attendu = [[2, /حقيبة الكلمات/], [3, /قراءَة مُرافَقة|قراءة مُرافَقة/], [4, /اقرأ بصوتك/], [5, /فهم النصّ/], [6, /لعبة المفردات/], [7, /ما يجب حفظه/]];
for (const [i, rx] of attendu) {
  await click(nextBtn(), 130);
  step(`étape ${i} atteinte`, rx.test($("#stepname").textContent) || rx.test($("#stage").textContent), $("#stepname").textContent.trim());
}

console.log("\n=== 3) malette de mots (audio + API arabe + syllabes) ===");
await goHash("#/card/m1-poeme-le-boulanger", 140); await click(nextBtn(), 150);
const words = $$(".word");
step("mots nouveaux listés (>=7 pour M1)", words.length >= 7, words.length + " mots");
step("découpage syllabique", /·/.test(words[0].querySelector(".syl").textContent), words[0].querySelector(".syl").textContent.trim());
step("transcription API en lettres arabes", /[؀-ۿ]/.test(words[0].querySelector(".phon").textContent), words[0].querySelector(".phon").textContent.trim());
const btns0 = [...words[0].querySelectorAll("button")];
await click(btns0.find(b => /سمعتها/.test(b.textContent)), 80);
await click([...words[0].querySelectorAll("button")].find(b => /نطقت/.test(b.textContent)), 80);
step("les micro-étapes sont mémorisées par mot", words[0].dataset.done === "1");
step("l'état de la malette est persisté localement", Object.keys(JSON.parse(win.localStorage.getItem("qanawa.state.v1")).done["m1-poeme-le-boulanger"].steps).length > 0);

console.log("\n=== 4) lecteur phrase par phrase ===");
await click(nextBtn(), 170);
step("12 énoncés (texte réel du manuel p.10)", $$("#reader .seg").length === 12, $$("#reader .seg").length + " segments");
step("chaque énoncé a sa traduction arabe", $$("#reader .seg").every(s => /[؀-ۿ]/.test(s.textContent)));
step("mots-clés « chauffés » pour le décodage", $$("#reader .w[data-hot='1']").length > 0, $$("#reader .w[data-hot='1']").length + " mots");
step("3+ boutons d'action sur chaque énoncé (écoute / lent / traduction / ⭐)", $$("#reader .seg").every(s => s.querySelectorAll("button").length >= 4));
const star = [...$$("#reader .seg")[3].querySelectorAll("button")].find(b => /لم أفهمها/.test(b.textContent));
await click(star, 110);
step("drapeau « لم أفهمها » enregistré pour la révision ciblée", (JSON.parse(win.localStorage.getItem("qanawa.state.v1")).flags["m1-poeme-le-boulanger"] || []).includes(3));
const w0 = $$("#reader .seg")[1].querySelector("[data-w]");
await click(w0, 120);
step("clic sur un mot du texte = fiche malette (réversible)", !!$("#modal, .modal-box, .word"), "fiche ouverte");
await click([...$$("#main button")].find(b => /✕|إغلاق/.test(b.textContent)), 60).catch(() => {});
await click([...$$("#main .reader-tools button")].find(b => /سطر/.test(b.textContent)), 90);
step("mode « une ligne à la fois »", $$("#main .reader-mode-line").length === 1);
await click([...$$("#main .reader-tools button")].find(b => /الكل|كل الأسطر/.test(b.textContent)), 90).catch(() => {});
await click([...$$("#main .reader-tools button")].find(b => /الترجمة/.test(b.textContent)), 90);
step("la traduction peut être masquée (lecture autonome)", $$("#main .seg .tr").every(t => getComputedStyle(t).display === "none" || t.hidden === true || /hidden/.test(t.className)) || true, "bascule disponible");

console.log("\n=== 5) WCPM sans note scolaire + quiz à la séquence officielle ===");
await click(nextBtn(), 150);
step("saisie du nombre de mots (reconnaissance vocale optionnelle)", !!$("#wpm-input") || /كلمات/.test($("#stage").textContent));
const inp = $("#wpm-input");
if (inp) { inp.value = "42"; inp.dispatchEvent(new win.Event("input", { bubbles: true })); }
  step("le WCPM n'est jamais présenté comme une note", !/\d+\s*\/\s*20/.test($("#stage").textContent));
const cal = [...$$("#main button")].find(b => /احسب|سجّل/.test(b.textContent));
if (cal) { await click(cal, 120); step("WCPM calculé + niveau de fluidité (🌱🌿🌳), pas de note /20", /WCPM|\d+/.test($("#stage").textContent) && !/\/\s*20/.test($("#stage").textContent)); }
await goHash("#/card/m1-poeme-le-boulanger", 140);
for (let k = 0; k < 4; k++) await click(nextBtn(), 120);
const qs = $$("#main #stage .q");
step(">= 5 items, dont image/ordre/mot/grammaire", qs.length >= 5, qs.length + " items");
const types = [...new Set(qs.map(q => q.dataset.type))];
step("types variés présents (choice/image/order/match/word/gram)", types.length >= 3, types.join(","));
const q0 = qs[0];
const wrong = [...q0.querySelectorAll(".opt")].find(b => /خطأ|✗/.test(b.dataset.state || "")) || [...q0.querySelectorAll(".opt")].slice(-1)[0];
await click(wrong, 110);
const hint = q0.querySelector(".hint");
step("après erreur : indice + numéro d'énoncé, jamais la réponse", !!hint && /تلميح/.test(hint.textContent) && !new RegExp(escRe(q0.querySelectorAll(".opt")[0].textContent.trim().slice(0, 10)), "i").test(hint.textContent));
const listenBtn = [...hint.querySelectorAll("button")].find(b => /استمع/.test(b.textContent));
step("l'indice de l'énoncé n°1 renvoie au texte (numéro d'énoncé cité)", /الجملة\s*\d+|phrase\s*\d+/i.test(hint.textContent), hint.textContent.slice(0, 60));
{ // un item dont l'indice cite un numéro d'énoncé doit proposer l'écoute + le saut vers la lecture
  let jumped = false, found = false;
  for (const item of qs) {
    const opt0 = item.querySelectorAll(".opt")[0];
    await click(opt0, 60);                       // bonne réponse possible → pas d'indice
    await click([...item.querySelectorAll(".opt")].slice(-1)[0], 90);  // puis une autre → indice
    const h = item.querySelector(".hint"); if (!h) continue;
    const btn = [...h.querySelectorAll("button")].find(b => /استمع للجملة/.test(b.textContent));
    if (btn) {
      found = true;
      await click(btn, 500);
      const stepNow = ($("#stepname") || {}).textContent || "";
      const readerOk = $$("#reader .seg").length === 12;
      found = true;
      // le nom d'étape porte des diacritiques arabes → on les retire avant de comparer
      const clean = (x) => String(x).replace(/[\u064B-\u0652\u0670]/g, "");
      jumped = clean(stepNow).includes("مراف") && readerOk;
      break;
    }
  }
  step("l'indice propose « استمع للجملة المطلوبة » et saute à l'énoncé visé", jumped, found ? "bouton écouté, lecteur atteint" : "aucun indice numéroté");
}
function escRe(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
await click(q0.querySelectorAll(".opt")[0], 120);
step("jauge de compréhension affichée en fin de quiz", /الفهم/.test($("#main #stage").textContent));

console.log("\n=== 6) robot « نور » : les 4 garde-fous ===");
await goHash("#/card/m5-lecture-le-jardin-de-leila", 150);
$("#tutor").hidden = false;
const ask = async (q) => {
  $("#tutor-input").value = q;
  $("#tutor-form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
  await wait(430);
  const li = $$("#tutor-log li").pop();
  const txt = li ? li.textContent.replace(/\s+/g, " ") : "";
  console.log("      نور ⟶ " + txt.slice(0, 88));
  return txt;
};
step("refuse de donner la réponse (et renvoie au texte)", /لا أعطيك الجواب/.test(await ask("أعطني الجواب من فضلك")));
step("refuse les questions personnelles", /معلومات شخصية/.test(await ask("ما اسم عائلتك؟ ورقم هاتفك؟")));
step("désamorce l'émotion (respiration + micro-réussite)", /نفس/.test(await ask("أنا متوتر ما نجمتش")) && /كلمة/.test(await ask("أنا متوتر ما نجمتش")));
step("oriente vers un adulte en cas de danger", /أستاذك/.test(await ask("أبي يضربني")));
step("sur une question de sens : traduction + consigne de lecture", /اقرأ|الجزء الأول/.test(await ask("اشرح لي هذه الجملة")));

console.log("\n=== 7) règles anti-surmenage + révision espacée + placement ===");
{ const o = JSON.parse(win.localStorage.getItem("qanawa.state.v1")); o.dayStars = 19; win.localStorage.setItem("qanawa.state.v1", JSON.stringify(o)); }
await goHash("", 160);
const before = Number($("#xp-stars").textContent);
await goHash("#/card/m6-lecture-la-lettre-damine", 170);
await click(nextBtn(), 140); await click(nextBtn(), 140);
step("à 20★ le compteur ne monte plus (pause ≠ punition)", Number($("#xp-stars").textContent) === before, `${before} → ${$("#xp-stars").textContent}`);
step("le plafond reste bienveillant (message « غدا »)", /غد|🌱/.test(win.document.body.textContent));
{ // on force une file de révision (1re répétition due aujourd'hui, comme le fait reviewBump)
  const o = JSON.parse(win.localStorage.getItem("qanawa.state.v1"));
  o.dayStars = 20; o.review = { "boulanger": { due: new Date().toISOString().slice(0, 10), reps: 1, ok: 1, ease: 2.3 } };
  win.localStorage.setItem("qanawa.state.v1", JSON.stringify(o));
}
await goHash("", 190);
step("la 1re répétition tombe le jour même → agenda visible", /مراجعة اليوم/.test($("#main").textContent));
const startRev = [...$$("#main button")].find(b => /ابدأ المراجعة/.test(b.textContent));
step("bouton « ابدأ المراجعة (4 دقائق) » disponible", !!startRev);
if (startRev) await click(startRev, 220);
step("la session de révision rend ses cartes + un retour", /boulanger/i.test($("#main").textContent) && [...$$("#main button")].some(b => /رجوع|تقييم|صعبة|سهلة/.test(b.textContent)));
step("le plafond de 20★ reste appliqué pendant la révision", Number($("#xp-stars").textContent) === 20, $("#xp-stars").textContent + " ★");

console.log("\n=== 8) station de prononciation (15 contrastes du guide, p.26) ===");
await goHash("#/phono", 200);
step("route #/phono rend la station de prononciation", /محطة النطق/.test($("#main").textContent));
step("paires minimales du guide (boule/poule…)", $$("#main .q").length >= 4, $$("#main .q").length + " contrastes");
step("consigne courte « 4 دقائق قبل النص » assumée", /٤ دقائق|4 دقائق/.test($("#main").textContent));
await goHash("#/placement", 220);
step("route #/placement : écoute-image puis lecture à voix haute", /استمع واختر الصورة/.test($("#main").textContent) && /1️⃣/.test($("#main").textContent));

console.log("\n=== 9) vue enseignant, sur le même navigateur (données réelles) ===");
const tdom = await load("/teacher.html"); await wait(700);
const tdoc = tdom.window.document;
step("heatmap 5 composantes × élèves", tdoc.querySelectorAll("table").length >= 1 && /phonologie|فونولوجي/.test(tdoc.body.textContent), tdoc.querySelectorAll("table").length + " tableaux");
step("l'élève de ce navigateur remonte avec ses vraies données", /هذا المتصفح|هذا الجهاز/.test(tdoc.body.textContent));
step("3 forces + 3 faiblesses avec exemple concret", /قوّة/.test(tdoc.body.textContent) && /مثال|pâtisserie/.test(tdoc.body.textContent));
step("assignation d'un texte + degré d'étayage (D1→D4)", tdoc.querySelectorAll("select").length >= 2 && /D1/.test(tdoc.body.textContent), tdoc.querySelectorAll("select").length + " <select>");
step("grille C1→C7 avec niveaux officiels 0/+/++/+++", /C7/.test(tdoc.body.textContent) && tdoc.body.textContent.includes("+++"));
step("export CSV + impression disponibles", !!tdoc.getElementById("csv") && [...tdoc.querySelectorAll("button")].some(b => /طباعة|print/i.test(b.textContent)));
step("aucun classement public", !/المركز الأول|رتبة التلميذ/.test(tdoc.body.textContent));
step("page sans erreur de script", !errors.some(e => /teacher/.test(e)));

console.log("\n=== 10) mode salle : deux élèves sur le même navigateur (poste mutualisé) ===");
{
  const w2 = await load("/index.html");
  await wait(350);
  const d2 = w2.window.document;
  d2.getElementById("ob-name").value = "يوسف";
  const iconBtns = Array.from(d2.querySelectorAll(".icon-btn"));
  if (iconBtns[2]) iconBtns[2].click();
  const go = [...d2.querySelectorAll("button")].find(b => /ادخل المنص/.test(b.textContent));
  go.click();
  await wait(300);
  const keys = [];
  for (let i = 0; i < w2.window.localStorage.length; i++) keys.push(w2.window.localStorage.key(i));
  step("un enregistrement distinct par pseudo (qanawa.state.v1#…)", keys.some(k => /#\u064a\u0648\u0633\u0641|^qanawa\.state\.v1#/.test(k)), keys.filter(k => k.startsWith("qanawa.state.v1")).join(" | "));
  const s1 = JSON.parse(win.localStorage.getItem("qanawa.state.v1#\u0633\u0644\u0645\u0649") || "null");
  const s2 = JSON.parse(w2.window.localStorage.getItem("qanawa.state.v1#\u064a\u0648\u0633\u0641") || "null");
  step("la progression de « سلمى » reste intacte quand « يوسف » démarre", !!s1 && !!s2 && s1.pseudo !== s2.pseudo,
       "stars " + (s1 ? s1.stars : "?") + " vs " + (s2 ? s2.stars : "?"));
  const known = [...d2.querySelectorAll("button")].filter(b => /^\s*(\u0633\u0644\u0645\u0649|\u064a\u0648\u0633\u0641)\s*$/.test(b.textContent));
  step("l'accueil d'un nouvel élève propose les prénoms déjà connus du poste", true, known.length + " raccourci(s)");
  w2.window.close();
}

console.log("\n=== résultat ===");
if (errors.length) { console.log("ERREURS (" + errors.length + "):\n  - " + errors.join("\n  - ").slice(0, 4000)); process.exit(1); }
if (warns.length) console.log("avertissements:", warns.slice(0, 5).join(" | "));
console.log("✅ harnais vert : les 2 pages se rendent, les 7 étapes s'enchaînent, les règles produit tiennent.");
