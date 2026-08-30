/* ============================================================================
   قَنَوة — app.js (modèle premier, zéro dépendance)
   Sprints couverts ici : S2 (lecteur karaoke/TTS) · S3 (malette + révision
   espacée) · S4 (quiz à la séquence officielle) · S6 (robot « نور », règles
   locales) · S7 (ludification plafonnée) · S5 (station de prononciation)
   + ébauche S10 (placement) et S8 (espace enseignant).
   ========================================================================== */
(function () {
"use strict";

const D = window.QANAWA_DATA;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const el = (tag, attrs = {}, html) => {
  const n = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") n.className = attrs[k];
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
  }
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const today = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ état
   Mode « salle » (serveur de l'école, plusieurs élèves sur le même navigateur) :
   un enregistrement par pseudo. La machine se souvient du dernier élève, et l'écran
   d'accueil propose « changer d'élève » sinon on écraserait la progression d'un camarade. */
const KEY = "qanawa.state.v1";
const LAST = KEY + "#last";
let WHO = "";
const keyFor = (p) => KEY + "#" + String(p || "").trim().toLowerCase().replace(/\s+/g, "-");
const readRaw = (k) => { try { return localStorage.getItem(k); } catch { return null; } }
const writeRaw = (k, v) => localStorage.setItem(k, v);   // save() enveloppe d'un try/catch
/* tous les pseudos déjà enregistrés sur ce navigateur (mode salle) */
function studentKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.indexOf(KEY + "#") === 0 && k !== LAST && readRaw(k)) out.push(decodeURIComponent(k.slice((KEY + "#").length)));
    }
  } catch { }
  return out;
}
const blank = () => ({
  pseudo: "", avatar: "🦊", voie: null,
  stars: 0, day: today(), dayStars: 0, streak: 0, lastDay: "",
  done: {},               /* id carte -> {steps:[..], bestQuiz, wcpm} */
  garden: [],             /* mots maîtrisés */
  review: {},             /* fr -> {due, reps, ok} */
  flags: {},              /* id -> [idx phrases non comprises] */
  sfx: true, showAr: true, reduce: false, rate: 0.85, voiceURI: ""
});
let S = blank();
try { S = load(); } catch { S = blank(); }   // file:// peut refuser localStorage

/* Détection du stockage : Chrome/Edge refusent localStorage en file:// → l'appli tourne mais
   n'enregistre rien. On le dit à l'élève (au lieu de le laisser croire que la saisie est cassée)
   et on le dit à l'adulte, avec la commande exacte qui répare. */
const STORAGE = (() => {
  try { localStorage.setItem("qanawa.probe", "1"); localStorage.removeItem("qanawa.probe"); }
  catch (e) { return (e && e.name === "SecurityError") ? "blocked" : "unavailable"; }
  return "ok";
})();
function load(pseudo) {
  const p = pseudo === undefined ? readRaw(LAST) : pseudo;
  if (p) try { WHO = String(JSON.parse(readRaw(keyFor(p)) || "{}").pseudo || p) || p; } catch { WHO = p; }
  const raw = (p ? readRaw(keyFor(p)) : null) || readRaw(KEY);      // migration du brouillon mono-poste
  try { return Object.assign(blank(), JSON.parse(raw || "{}")); }
  catch { return blank(); }
}
function save() {
  let j; try { j = JSON.stringify(S); } catch { return; }
  const p = String(S.pseudo || "").trim();
  try {
    if (p) { writeRaw(keyFor(p), j); writeRaw(LAST, p); if (WHO !== p) WHO = p; }
    writeRaw(KEY, j);                    // lu par فضاء الأستاذ / export
  } catch (e) {
    // le stockage vient de se refuser en cours de séance : on prévient, on ne plante pas la leçon
    if (STORAGE === "ok") { STORAGE = "blocked"; showStorageWarning(true); }
  }
  paintTop();
}
function dayRoll() {
  if (S.day !== today()) { S.day = today(); S.dayStars = 0; }
}
function addStars(n, why) {
  dayRoll();
  const room = 20 - S.dayStars;           /* plafond quotidien anti-surmenage */
  if (room <= 0) { toast("رصيد اليوم مكتمل — جرّب غدًا 🌱"); return; }
  n = Math.min(n, room);
  S.stars += n; S.dayStars += n;
  const y = new Date(today()), l = S.lastDay ? new Date(S.lastDay) : null;
  if (!l || (y - l) > 86400000 * 2) S.streak = 1; else if ((y - l) <= 86400000 * 2) S.streak = Math.max(S.streak, (l && (y - l) < 172800000) ? S.streak + 1 : 1);
  S.lastDay = today();
  save(); confetti(); toast(`+${n} ★ ${why}`);
}

/* ------------------------------------------------------------------ sons */
let voices = [];
function initVoices() {
  if (!("speechSynthesis" in window)) return false;
  const pick = () => { voices = speechSynthesis.getVoices(); };
  pick(); speechSynthesis.onvoiceschanged = pick;
  return true;
}
function frVoice() {
  if (S.voiceURI) { const v = voices.find(x => x.voiceURI === S.voiceURI); if (v) return v; }
  return voices.find(v => /fr[-_]/i.test(v.lang)) || voices.find(v => /^fr/i.test(v.name)) || null;
}
let activeUtter = null, cancelToken = 0;
function speak(text, opts = {}) {
  const my = ++cancelToken;
  if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function") {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR"; const v = frVoice(); if (v) u.voice = v;
    u.rate = opts.slow ? clamp(S.rate - 0.25, 0.4, 1) : clamp(S.rate, 0.4, 1.2);
    u.pitch = 1;
    if (opts.onword) {
      const segs = Array.from(text.matchAll(/\S+/g));
      const spans = opts.spans || segs.map(m => [m.index, m.index + m[0].length]);
      const total = Math.max(text.length, 1);
      const cps = 13.5 * u.rate;                       /* estimation cps */
      let t0 = performance.now(), forced = 0;
      const tick = () => {
        if (my !== cancelToken) return;
        let frac = clamp((performance.now() - t0) / (total / cps * 1000), 0, 1);
        let i = clamp(Math.max(Math.floor(frac * spans.length), forced), 0, spans.length - 1);
        if (segs[i]) { opts.onword(segs[i][0], i); }
        forced = i;
        if (!window.speechSynthesis.speaking) return;
        requestAnimationFrame(tick);
      };
      u.onstart = () => { t0 = performance.now(); requestAnimationFrame(tick); };
      u.onboundary = (e) => {
        if (e.name !== "word" && e.charIndex === undefined) return;
        let i = spans.findIndex(s => e.charIndex >= s[0] - 1 && e.charIndex < s[1] + 1);
        if (i < 0) i = spans.findIndex(s => s[0] >= e.charIndex);
        if (i >= 0 && segs[i]) { forced = i; opts.onword(segs[i][0], i); }
      };
    }
    u.onend = () => { if (my === cancelToken && opts.onend) opts.onend(); };
    activeUtter = u; speechSynthesis.speak(u);
    return true;
  }
  if (opts.onend) setTimeout(opts.onend, 600);
  return false;
}
function stopSpeak() { cancelToken++; if ("speechSynthesis" in window) speechSynthesis.cancel(); }
function beep(freq = 660, ms = 90) {
  if (!S.sfx) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext; const c = new C();
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = freq; g.gain.value = 0.06;
    o.connect(g); g.connect(c.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
    setTimeout(() => { o.stop(); c.close(); }, ms + 30);
  } catch {}
}

/* ------------------------------------------------------------------ UI bits */
function toast(msg) {
  const t = el("div", { class: "toast" }, esc(msg));
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 1500);
  setTimeout(() => t.remove(), 1900);
}
function confetti() {
  if (S.reduce) return;
  const box = el("div", { class: "confetti", "aria-hidden": "true" });
  const cols = ["#1B4F8C", "#17B0A0", "#F6C64B", "#7A1F3D"];
  for (let i = 0; i < 26; i++) {
    box.appendChild(el("i", { style: `left:${Math.random() * 100}%;background:${cols[i % 4]};animation-delay:${(Math.random() * .5).toFixed(2)}s;` }));
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
}
function paintTop() {
  $("#xp-stars").textContent = S.stars;
  const b = $("#btn-offline");
  b.textContent = navigator.onLine ? "🌐 متصل" : "📴 دون اتصال";
  b.dataset.on = navigator.onLine ? "0" : "1";
}
window.addEventListener("online", paintTop); window.addEventListener("offline", paintTop);

function sheet(titleHTML, bodyNode, footNode) {
  const modal = $("#modal"); const box = $("#modal-box");
  box.innerHTML = "";
  box.appendChild(el("div", { class: "row between" }, `<div>${titleHTML}</div>`))
    .appendChild(el("button", { class: "icon-btn", onclick: closeSheet }, "✕"));
  box.appendChild(bodyNode);
  if (footNode) box.appendChild(footNode);
  modal.hidden = false;
  function closeSheet() { modal.hidden = true; stopSpeak(); }
  modal.onclick = (e) => { if (e.target === modal) closeSheet(); };
  return { close: closeSheet };
}

/* ------------------------------------------------------------ progression */
const STEPS = [
  { id: "couverture", ar: "١ · الغلاف والتنبّؤ" },
  { id: "malette", ar: "٢ · حقيبة الكلمات" },
  { id: "lecture", ar: "٣ · قراءة مُرافَقة" },
  { id: "amoi", ar: "٤ · اقرأ بصوتك" },
  { id: "quiz", ar: "٥ · فهم النصّ" },
  { id: "jeu", ar: "٦ · لعبة المفردات" },
  { id: "retenir", ar: "٧ · ما يجب حفظه" }
];
function doneOf(id) { return S.done[id] || (S.done[id] = { steps: [], bestQuiz: 0, wcpm: 0 }); }
function isDone(id, step) { return (S.done[id]?.steps || []).includes(step); }
function markDone(id, step) {
  const d = doneOf(id);
  const fresh = !d.steps.includes(step);
  if (fresh) d.steps.push(step);
  if (fresh && d.steps.length === STEPS.length && !d.confetti) { d.confetti = 1; addStars(15, "أنهيت نصًّا كاملًا 🎉"); }
  else if (fresh) addStars(5, "");
  save();
}

/* ------------------------------------------------------------------ Accueil */
/* ------------------------------------------------- avertissement de stockage
   affiché dès que le navigateur refuse localStorage (ouverture en file://) :
   l'élève peut travailler, mais rien ne sera retenu au rechargement. */
function showStorageWarning(force) {
  if (typeof document === "undefined") return;
  if (!force && STORAGE === "ok") return;
  if (document.getElementById("storage-warn")) return;
  const bar = el("div", { id: "storage-warn", class: "warn-bar" });
  bar.innerHTML = `<b>⚠️ هذا الجهاز لا يحفظ التقدّم الآن</b>
    <span>فتحتَ الملفّ مباشرة (<code>file://</code>) فيرفض المتصفّح يرفض التخزين ⇒ النجوم والحديقة ستُفقد عند إعادة التحميل.</span>
    <span class="row" style="flex-wrap:wrap;margin-top:6px">
      <button class="btn sm" id="sw-ok">تقديم بلا حفظ</button>
      <button class="btn sm ghost" id="sw-how">كيف أُصلح ذلك؟</button>
    </span>
    <div id="sw-fix" hidden class="fr" dir="ltr">Sur Windows : double-cliquez <code>Qanawa.exe</code> (il lance
      <code>http://localhost:8137/</code>), ou, dans le dossier <code>prototype</code> :
      <code>python -m http.server 8137</code> puis ouvrez <code>http://localhost:8137/</code>.
      Le stockage fonctionne aussi sous Firefox en <code>file://</code>.</div>`;
  const anchor = document.getElementById("main") || document.querySelector("main");
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor);
  else document.body.insertBefore(bar, document.body.firstChild);
  const x = bar.querySelector("#sw-ok"); x && (x.onclick = () => bar.remove());
  const h = bar.querySelector("#sw-how"); const f = bar.querySelector("#sw-fix");
  h && f && (h.onclick = () => { f.hidden = !f.hidden; });
}

function viewHome(root) {
  dayRoll();
  root.innerHTML = "";
  if (!S.pseudo) return onboarding(root);
  const hi = el("section", { class: "card" });
  hi.appendChild(el("div", { class: "row between" },
    `<h1>${S.avatar} مرحبًا ${esc(S.pseudo)} — ${S.voie ? `مسار ${S.voie}` : "لم تُجرِ اختبار التوجيه"}</h1>
     <span class="pill sun">سلسلة ${S.streak} يوم</span>`));
  hi.appendChild(el("div", { class: "row" }, `<small>★ ${S.stars} · رصيد اليوم ${S.dayStars}/20</small>`));
  const meter = el("div", { class: "meter", style: "margin-top:10px" }, `<i style="width:${(S.dayStars / 20) * 100}%"></i>`);
  hi.appendChild(meter);
  hi.appendChild(el("div", { class: "row", style: "margin-top:12px" }, `<small>🌳 حديقتك: <b>${S.garden.length}</b> كلمة متقنة</small>`));
  root.appendChild(hi);

  const due = reviewQueue();
  if (due.length) {
    const box = el("section", { class: "card tight" });
    box.innerHTML = `<h2>🔁 مراجعة اليوم <small>(${due.length})</small></h2>`;
    const b = el("button", { class: "btn teal block", onclick: () => runReview(due) }, "ابدأ المراجعة (4 دقائق)");
    box.appendChild(b); root.appendChild(box);
  }

  const chal = el("section", { class: "card" });
  chal.appendChild(el("div", { class: "row between" }, `<h2>🎯 تحدّي اليوم</h2><span class="pill teal">12–15 دقيقة</span>`));
  const next = D.cards.find(c => !isDone(c.id, "lecture")) || D.cards[0];
  chal.appendChild(el("p", { class: "muted" }, `نقترح: <b>${esc(next.titre_fr)}</b> — ${esc(next.titre_ar)} (وحدة ${next.module} «${esc(next.slogan)}»)`));
  chal.appendChild(el("button", { class: "btn block", onclick: () => location.hash = "#/card/" + next.id }, "افتح النصّ"));
  root.appendChild(chal);

  const grid = el("section", { class: "grid" });
  grid.appendChild(el("h2", {}, "📚 نصوص المنهاج — السنة السادسة"));
  D.cards.forEach(c => {
    const d = doneOf(c.id);
    const a = el("a", { class: "lesson", href: "#/card/" + c.id });
    a.innerHTML = `<div class="thumb" style="display:grid;place-items:center;font-size:3rem">${c.thumb}</div>
      <div class="row between"><h3>${esc(c.titre_fr)}</h3><span class="stars-rate">${"★".repeat(c.difficulte)}${"☆".repeat(5 - c.difficulte)}</span></div>
      <small>وحدة ${c.module} · ${c.texte_type} · ${c.duree}${c.manuel_page ? ` · ص ${c.manuel_page} من الكتاب` : ""}</small>
      <div class="meter sun" style="margin-top:8px"><i style="width:${(d.steps.length / STEPS.length) * 100}%"></i></div>
      <small class="muted">${d.steps.length}/${STEPS.length} خطوة · أفضل فهم ${Math.round((d.bestQuiz || 0) * 100)}%${d.wcpm ? ` · ${d.wcpm} كلمة/د` : ""}</small>`;
    grid.appendChild(a);
  });
  root.appendChild(grid);

  const extra = el("section", { class: "grid two", style: "margin-top:14px" });
  extra.appendChild(el("button", { class: "btn ghost", onclick: () => { location.hash = "#/phono"; } }, "🔊 محطة النطق"));
  extra.appendChild(el("button", { class: "btn ghost", onclick: () => { location.hash = "#/placement"; } }, "🧭 اختبار التوجيه (7 د)"));
  root.appendChild(extra);
  root.appendChild(el("p", { class: "media-note", style: "margin-top:14px" },
    `ℹ️ ${esc(D.meta.avertissement)}`));
}

function onboarding(root) {
  const box = el("section", { class: "card" });
  box.innerHTML = `<h1>لنبدأ من اسمك ودقيقة واحدة 🌱</h1>
    <p class="muted">لا نطلب اسم العائلة ولا المدرسة ولا رقم الهاتف. يكفي اسم تُعرف به عندنا.</p>`;
  const inp = el("input", {
    id: "ob-name", type: "text", enterkeyhint: "go", inputmode: "text",
    dir: "auto", lang: "ar", autocomplete: "off",
    placeholder: "اكتب اسمًا تعرفنا به — مثال: Salma / سلمى",
    style: "min-height:56px;width:100%;border-radius:14px;border:1px solid var(--line);padding:0 14px;font:inherit;background:#fff;color:#111"
  });
  box.appendChild(inp);
  setTimeout(() => { try { inp.focus(); } catch { } }, 60);          // directement prêt à écrire
  const enter = () => { inp.dataset.commit = "1"; go.click(); };      // Entrée = même chose que le bouton
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); enter(); } });
  if (STORAGE !== "ok") showStorageWarning(true);
  {
    const known = studentKeys();
    if (known.length) {
      const row = el("div", { class: "row", style: "flex-wrap:wrap;margin-top:10px" });
      row.appendChild(el("small", { class: "muted" }, "موجودون على هذا الجهاز — اختر اسمك:"));
      known.slice(0, 10).forEach(n => row.appendChild(el("button", { class: "btn sm ghost", onclick: () => { inp.value = n; } }, n)));
      box.appendChild(row);
    }
  }
  const av = el("div", { class: "row", style: "margin-top:10px;flex-wrap:wrap" });
  ["🦊", "🐢", "🦉", "🐝", "🐬", "🦜"].forEach(e => {
    av.appendChild(el("button", { class: "icon-btn", style: "font-size:1.5rem", onclick: (ev) => { S.avatar = e; $$("button", av).forEach(b => b.style.outline = ""); ev.currentTarget.style.outline = "3px solid var(--teal)"; } }, e));
  });
  box.appendChild(av);
  const lvl = el("div", { class: "grid mini", style: "margin-top:12px" });
  [["A", "أحتاج مساعدة كثيرة 🙂", "بدأت الآن"], ["B", "أقرأ جُمَلًا بسيطة 🙂", "أعرف كلمات"], ["C", "أقرأ وحدي 😎", "أفهم بسرعة"]]
    .forEach(([v, t, s]) => lvl.appendChild(el("button", { class: "btn ghost", onclick: () => { S.voie = v; save(); } },
      `<div style="text-align:right"><b>${t}</b><br><small class="muted">${s}</small></div>`)));
  box.appendChild(lvl);
  const go = el("button", {
    class: "btn block", style: "margin-top:14px",
    onclick: () => {
      // on n'abandonne jamais l'élève sur un champ vide : un prénom par défaut vaut mieux qu'un blocage
      const v = String(inp.value || "").trim();
      S.pseudo = (v || "قارئ").slice(0, 16);
      save();
      showStorageWarning(STORAGE !== "ok");   // seulement si le stockage est réellement refusé
      toast("أهلًا بك " + S.pseudo); viewHome($("#main"));
    }
  }, "ادخل المنصّة");
  box.appendChild(go);
  box.appendChild(el("p", { class: "muted", style: "margin-top:8px" },
    STORAGE !== "ok"
      ? "يمكنك الدخول فورًا: اضغط Enter بعد كتابة الاسم."
      : "اكتب الاسم ثم Enter (أو اضغط الزرّ). لا نطلب أي معلومة شخصية."));
  root.innerHTML = ""; root.appendChild(box);
}

/* --------------------------------------------------------------- Carte : flow */
let CUR = null, CURSTEP = 0;
function viewCard(id) {
  const card = D.cards.find(c => c.id === id);
  if (!card) return viewHome($("#main"));
  CUR = card; CURSTEP = 0;
  const root = $("#main"); root.innerHTML = "";
  const bar = el("div", { class: "progress-steps" });
  STEPS.forEach((s, i) => bar.appendChild(el("b", { "data-done": isDone(id, s.id) ? "1" : "0", title: s.ar })));
  root.appendChild(bar);
  const head = el("div", { class: "row between" });
  head.innerHTML = `<div><span class="kicker">وحدة ${card.module} · ${esc(card.slogan)} · ${esc(card.texte_type)}</span>
    <h1>${esc(card.titre_fr)} <small class="muted">— ${esc(card.titre_ar)}</small></h1></div>`;
  head.appendChild(el("button", { class: "btn sm ghost", onclick: () => { location.hash = ""; } }, "خروج"));
  root.appendChild(head);
  const stage = el("section", { class: "card", id: "stage" });
  root.appendChild(stage);
  const nav = el("div", { class: "row between", style: "margin-top:12px" });
  const prev = el("button", { class: "btn ghost", onclick: () => { stopSpeak(); CURSTEP = clamp(CURSTEP - 1, 0, STEPS.length - 1); renderStep(); } }, "→ السابق");
  const next = el("button", { class: "btn", onclick: () => { stopSpeak(); markDone(card.id, STEPS[CURSTEP].id); CURSTEP = clamp(CURSTEP + 1, 0, STEPS.length - 1); renderStep(); } }, "التالي ←");
  nav.append(prev, el("small", { class: "muted", id: "stepname" }), next);
  root.appendChild(nav);
  window.renderStep = function () {
    $$("#main .progress-steps b").forEach((b, i) => { b.dataset.cur = i === CURSTEP ? "1" : "0"; b.dataset.done = isDone(card.id, STEPS[i].id) ? "1" : "0"; });
    $("#stepname").textContent = STEPS[CURSTEP].ar;
    const fns = { couverture: stepCouverture, malette: stepMalette, lecture: stepLecture, amoi: stepAmoi, quiz: stepQuiz, jeu: stepJeu, retenir: stepRetenir };
    (fns[STEPS[CURSTEP].id] || stepRetenir)(stage, card);
  };
  renderStep();
}

/* ---- 1. couverture + anticipation (= Anticipation du guide, p.33-34) */
function stepCouverture(stage, card) {
  stage.innerHTML = "";
  stage.appendChild(el("div", { style: "text-align:center;font-size:4.4rem;line-height:1.2" }, card.thumb));
  stage.appendChild(el("h2", { style: "text-align:center" }, card.titre_fr));
  stage.appendChild(el("p", { class: "muted", style: "text-align:center" }, esc(card.image_fr)));
  stage.appendChild(el("p", { class: "pill", style: "display:block;text-align:center" }, `هدفك اليوم: ${esc(card.projet_ecriture)}`));
  (card.anticipation || []).forEach((a, i) => {
    const q = el("div", { class: "q", style: "margin-top:12px" });
    q.appendChild(el("div", { class: "prompt" }, `🔎 ${esc(a.q_ar || "")} <span class="fr-hint">${esc(a.q_fr || "")}</span>`));
    const opts = el("div", {});
    a.choices.forEach((c, idx) => {
      const b = el("button", { class: "opt" }, `<span class="emoji">${a.emoji ? a.emoji[idx] : "💭"}</span><span>${esc(c)}</span>`);
      b.onclick = () => {
        $$("button", opts).forEach(x => x.removeAttribute("data-state"));
        b.dataset.state = "ok";
        speak(a.choices[idx]);
        q.appendChild(el("div", { class: "hint" }, "رائز! هذا تخمين ذكي — سنرى بعد القراءة إن كان صحيحًا 🌟 (لا نقاط على التنبّؤ)"));
        addStars(1, "");
      };
      opts.appendChild(b);
    });
    q.appendChild(opts); stage.appendChild(q);
  });
}

/* ---- 2. malette de mots */
function stepMalette(stage, card) {
  stage.innerHTML = "";
  stage.appendChild(el("h2", {}, "🧰 حقيبة الكلمات"));
  stage.appendChild(el("p", { class: "muted" }, "اسمع، قطّع، انطق، ثم اقرأ. الكتاب المدرسي يشرح كلمتين فقط لكل نصّ — نحن نشرح كل كلمة جديدة."));
  const grid = el("div", { class: "grid" });
  card.malette.forEach((w, i) => {
    const c = el("div", { class: "word", "data-i": i });
    c.innerHTML = `<div class="row between"><div><div class="fr">${esc(w.fr)}</div>
        <div class="syl">${(w.syllabes || []).join(" · ")}</div></div>
        <div class="img">${w.emoji || "📘"}</div></div>
      <div class="ar">${esc(w.ar)}${w.tun ? ` <small class="muted">/ بالدارجة: ${esc(w.tun)}</small>` : ""}</div>
      <div><span class="phon">🗣️ ${esc(w.phon || "")}</span></div>
      <div class="ex">${esc(w.ex_fr || "")}<br><span class="muted">${esc(w.ex_ar || "")}</span></div>`;
    const acts = el("div", { class: "row" });
    acts.appendChild(el("button", { class: "btn sm teal", onclick: () => speak(w.fr) }, "🔊 عادي"));
    acts.appendChild(el("button", { class: "btn sm ghost", onclick: () => speak(w.fr, { slow: true }) }, "🐢 بطيء"));
    const seen = el("button", { class: "btn sm ghost", onclick: () => { mark(c, "heard", "سمعتها"); } }, "👂 سمعتها");
    const said = el("button", { class: "btn sm ghost", onclick: () => { mark(c, "said", "نطقتها"); reviewBump(w.fr, 1); } }, "🗣️ نطقتُها");
    const hot = el("button", { class: "btn sm sun", onclick: () => { mark(c, "garden", "في حديقتي"); reviewBump(w.fr, 2); if (!S.garden.includes(w.fr)) S.garden.push(w.fr); save(); } }, "🌳 حفظتها");
    function mark(node, k, label) {
      const set = JSON.parse(node.dataset.marks || "{}");
      set[k] = 1; node.dataset.marks = JSON.stringify(set);
      if (set.heard && set.said) node.dataset.done = "1";
      toast(label + " ✓");
      if (node.dataset.done === "1" && !node.dataset.scored) { node.dataset.scored = "1"; addStars(2, ""); }
      if ($$(".word[data-done='1']", grid).length === card.malette.length) {
        stage.appendChild(el("div", { class: "hint", style: "margin-top:10px" }, "🎉 جاهز! كل كلمات الحقيبة أصبحت مألوفة — قراءة النصّ ستكون أسهل."));
      }
    }
    acts.append(seen, said, hot);
    c.appendChild(acts);
    grid.appendChild(c);
  });
  stage.appendChild(grid);
  stage.appendChild(el("button", { class: "btn block ghost", style: "margin-top:10px", onclick: () => card.malette.forEach(w => speak(w.fr + ". " + (w.ex_fr || ""), { slow: false })) }, "▶️ اسمع القائمة كاملة"));
}

/* ---- 3. lecture guidée (karaoke) */
function stepLecture(stage, card) {
  stage.innerHTML = "";
  const tools = el("div", { class: "reader-tools" });
  let mode = "all", showAr = S.showAr, idx = 0, oneLine = false;
  const speed = el("input", { type: "range", min: "0.5", max: "1.1", step: "0.05", value: String(S.rate), title: "السرعة" });
  speed.oninput = () => { S.rate = +speed.value; save(); };
  const selAr = el("select", { title: "الترجمة" });
  [["all", "fr + arabe"], ["fr", "فرنسية فقط"], ["toggle", "إخفاء/إظهار"]].forEach(([v, t]) => selAr.appendChild(el("option", { value: v }, t)));
  const btnAr = el("button", { class: "btn sm ghost" }, "🌐 الترجمة: إظهار");
  const btnAll = el("button", { class: "btn sm ghost" }, "▶️ اقرأ الكل");
  const btnLine = el("button", { class: "btn sm ghost" }, "📏 سطّر سطرًا");
  const btnStop = el("button", { class: "btn sm ghost" }, "⏹️ إيقاف");
  tools.append(el("span", { class: "pill" }, "🐢"), speed, el("span", { class: "pill" }, "🐇"), selAr, btnAr, btnAll, btnLine, btnStop);
  stage.appendChild(tools);
  const wrap = el("div", { id: "reader" });
  stage.appendChild(wrap);
  stage.appendChild(el("p", { class: "media-note" }, "💡 نقرة على الكلمة = سماعها · ضغطة مطوّلة = ترجمتها · ⭐ = «أعِد هذه الجملة لاحقًا»"));
  const flags = S.flags[card.id] || (S.flags[card.id] = []);

  card.segments.forEach((s, i) => {
    const line = el("div", { class: "seg" });
    line.dataset.idx = i;
    const heading = (s.fr.length <= 28 && !/[.!?…]$/.test(s.fr)) ? ' data-heading="1"' : "";
    line.innerHTML = `<div class="fr" dir="ltr" tabindex="0">${highlight(s)}</div>
      <div class="ar" ${showAr ? "" : "hidden"}>${esc(s.ar)}</div>
      <div class="seg-acts"></div>`;
    const acts = $(".seg-acts", line);
    acts.appendChild(el("button", { class: "btn sm teal", onclick: () => play(i) }, "🔊 استمع"));
    acts.appendChild(el("button", { class: "btn sm ghost", onclick: () => play(i, true) }, "🐢 ببطء"));
    acts.appendChild(el("button", { class: "btn sm ghost", onclick: () => { line.querySelector(".ar").hidden = !line.querySelector(".ar").hidden; } }, "🌐 ترجمة"));
    const star = el("button", { class: "btn sm ghost", onclick: () => {
      const on = !flags.includes(i); if (on) flags.push(i); else flags.splice(flags.indexOf(i), 1);
      star.style.outline = on ? "3px solid var(--sun)" : ""; save(); toast(on ? "سنعود لهذه الجملة أولًا ⭐" : "أُلغيت");
    } }, "⭐ لم أفهمها");
    acts.appendChild(star);
    if (flags.includes(i)) star.style.outline = "3px solid var(--sun)";
    $(".fr", line).addEventListener("click", (e) => {
      const w = e.target.closest("[data-w]"); if (!w) return;
      speak(w.dataset.w);
      const tr = card.malette.find(m => norm(m.fr) === norm(w.dataset.w));
      if (tr) sheet(`<b>${esc(tr.fr)}</b>`, el("div", { class: "word" },
        `<div class="syl">${(tr.syllabes || []).join(" · ")}</div><div class="ar">${esc(tr.ar)}</div>
         <div><span class="phon">🗣️ ${esc(tr.phon)}</span></div><div class="ex">${esc(tr.ex_fr)}</div>`));
    });
    wrap.appendChild(line);
  });

  function highlight(s) {
    let out = "", pos = 0;
    const words = Array.from(s.fr.matchAll(/\S+/g));
    words.forEach(m => {
      out += esc(s.fr.slice(pos, m.index));
      const raw = m[0], clean = norm(raw);
      const hot = (s.hot || []).some(h => norm(h) === clean);
      out += `<span class="w" data-w="${esc(raw)}" ${hot ? 'data-hot="1"' : ""}>${esc(raw)}</span>`;
      pos = m.index + raw.length;
    });
    out += esc(s.fr.slice(pos));
    return out;
  }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }

  function play(i, slow) {
    idx = i; paint();
    const seg = card.segments[i];
    const node = $$("[data-idx]", wrap)[i];
    const spans = Array.from(seg.fr.matchAll(/\S+/g)).map(m => [m.index, m.index + m[0].length]);
    $$(".w", node).forEach(w => w.classList.remove("now"));
    speak(seg.fr, {
      slow,
      onword: (w) => { $$(".w", node).forEach(x => x.classList.toggle("now", x.dataset.w === w)); },
      onend: () => { if (mode === "all" && i < card.segments.length - 1) play(i + 1, slow); else { stopHighlight(node); } }
    });
  }
  function stopHighlight(node) { $$(".w", node).forEach(x => x.classList.remove("now")); }
  function paint() { $$("[data-idx]", wrap).forEach((n, k) => n.dataset.active = (k === idx && mode === "all") || mode === "one" ? (k === idx ? "1" : "0") : "0"); if (mode === "one") { const n = $$("[data-idx]", wrap)[idx]; $$("[data-idx]", wrap).forEach(x => x.dataset.active = x === n ? "1" : "0"); } }
  btnAll.onclick = () => { mode = "all"; play(0); };
  btnLine.onclick = () => { mode = "one"; oneLine = !oneLine; wrap.parentElement.classList.toggle("reader-mode-line", oneLine); paint(); };
  btnStop.onclick = () => { stopSpeak(); mode = "off"; $$("[data-idx]", wrap).forEach(n => { n.dataset.active = "0"; stopHighlight(n); }); };
  btnAr.onclick = () => { showAr = !showAr; S.showAr = showAr; save(); btnAr.textContent = showAr ? "🌐 الترجمة: إظهار" : "🌐 الترجمة: إخفاء"; $$(".ar", wrap).forEach(n => n.hidden = !showAr); };
  selAr.onchange = () => { showAr = selAr.value !== "fr"; $$(".ar", wrap).forEach(n => n.hidden = !showAr); };
}

/* ---- 4. à moi de lire (score de lecture oralisée + mots-secret) */
function stepAmoi(stage, card) {
  stage.innerHTML = "";
  stage.appendChild(el("h2", {}, "🎙️ اقرأ بصوتك — من غير نقط"));
  stage.appendChild(el("p", { class: "muted" }, "لا نعطيك علامة: نحسب فقط <b>كم كلمة صحيحة في الدقيقة</b> (WCPM) ونختار 3 «كلمات-سرّ» لتعاد. والأستاذ يرى الرقم في لوحته."));
  const pick = card.segments.filter(s => s.fr.length > 30)[0] || card.segments[0];
  const target = pick.fr;
  const disp = el("div", { class: "seg" }, `<div class="fr" dir="ltr">${esc(target)}</div><div class="ar">${esc(pick.ar)}</div>`);
  stage.appendChild(disp);
  const box = el("div", { class: "row", style: "margin-top:10px" });
  const btnDemo = el("button", { class: "btn ghost", onclick: () => { const t0 = Date.now(); speak(target, { slow: true, onend: () => finish(target.split(/\s+/).length, Date.now() - t0, "modèle") }); } }, "🐢 اسمع النموذج");
  const btnMic = el("button", { class: "btn teal", onclick: startMic }, "🎤 اقرأ الآن (4 جُمَل)");
  const manual = el("input", { type: "number", min: "0", max: "200", placeholder: "أو اكتب عدد الكلمات الصحيحة التي قرأتها", style: "min-height:56px;border-radius:14px;border:1px solid var(--line);padding:0 12px;font:inherit;width:100%" });
  const btnManual = el("button", { class: "btn", onclick: () => { const t0 = +manual.dataset.t0 || Date.now(); finish((+manual.value || 0) || countWords(target), Date.now() - t0, "manuel"); } }, "احسب");
  box.append(btnDemo, btnMic);
  const row2 = el("div", { class: "row", style: "margin-top:8px" }); row2.append(manual, btnManual);
  stage.appendChild(box); stage.appendChild(row2);
  const out = el("div", { id: "ami-result" }); stage.appendChild(out);
  function countWords(t) { return t.split(/\s+/).length; }
  function startMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("متصفحك لا يدعم التعرّف الصوتي — استعمل الطريقة اليدوية"); manual.dataset.t0 = Date.now(); return; }
    const r = new SR(); r.lang = "fr-FR"; r.continuous = true; r.interimResults = true;
    const t0 = Date.now(); let heard = "";
    r.onresult = (ev) => { let s = ""; for (let i = ev.resultIndex; i < ev.results.length; i++) s += ev.results[i][0].transcript; heard += s; out.innerHTML = `<p class="muted">أسمعك…</p><div class="q"><div class="fr-hint">${esc(heard.trim())}</div></div>`; };
    r.onerror = () => toast("تعذّر استخدام الميكروفون (اذن؟) — استخدم الطريقة اليدوية");
    r.onend = () => { const dt = Date.now() - t0; finish(scoreWords(target, heard), dt, "reconnaissance"); };
    try { r.start(); btnMic.textContent = "🔴 أقرأ…"; } catch {}
  }
  function scoreWords(tgt, heard) {
    const a = norm2(tgt).split(" ").filter(Boolean), b = norm2(heard).split(" ").filter(Boolean);
    if (!b.length) return a.length ? 0 : 0;
    let hit = 0; const sa = new Set(a); b.forEach(w => { if (sa.has(w)) hit++; });
    return Math.round(hit / a.length * countWords(tgt));
  }
  function norm2(s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " "); }
  function finish(words, ms, how) {
    const wcpm = Math.max(0, Math.round(words / Math.max(ms, 1200) * 60000));
    const d = doneOf(card.id); d.wcpm = Math.max(d.wcpm || 0, wcpm); save();
    const secrets = card.malette.filter(w => (pick.hot || []).includes(w.fr)).slice(0, 3);
    out.innerHTML = "";
    const box2 = el("div", { class: "q" });
    box2.innerHTML = `<div class="row between"><h3>📊 ${wcpm} كلمة صحيحة/دقيقة <small class="muted">(${how})</small></h3>
      <span class="pill ${wcpm >= 60 ? "teal" : wcpm >= 30 ? "sun" : "wine"}">${wcpm >= 60 ? "🌳 ممتاز" : wcpm >= 30 ? "🌿 في الطريق" : "🌱 نتمرّن"}</span></div>
      <div class="meter"><i style="width:${clamp(wcpm, 0, 100)}%"></i></div>
      <p class="muted" style="margin-top:8px">${wcpm >= 60 ? "أنت تقرأ بطلاقة مقبولة لهذا المستوى — سنزيد الصعوبة قليلًا." : "لا بأس إطلاقًا. سرعتك ستتحسّن بإعادة القراءة مرتين فقط."}</p>`;
    if (secrets.length) {
      box2.appendChild(el("h3", {}, "🔑 كلمات-سرّ for هذه الجلسة"));
      const g = el("div", { class: "grid two" });
      secrets.forEach(w => {
        const c = el("div", { class: "word" }, `<div class="fr">${esc(w.fr)}</div><div class="syl">${(w.syllabes || []).join(" · ")}</div><div class="ar">${esc(w.ar)}</div>`);
        const a = el("div", { class: "row" });
        a.append(el("button", { class: "btn sm teal", onclick: () => speak(w.fr, { slow: true }) }, "🐢"),
                 el("button", { class: "btn sm ghost", onclick: () => speak(w.fr) }, "🔊"),
                 el("button", { class: "btn sm sun", onclick: () => { reviewBump(w.fr, 3); toast("ستعود غدًا في المراجعة 🔁"); } }, "🔁 أتدرّب عليها"));
        c.appendChild(a); g.appendChild(c);
      });
      box2.appendChild(g);
    }
    out.appendChild(box2);
    addStars(10, "قراءة مسموعة كاملة");
  }
}

/* ---- 5. quiz (mêmes phases que le guide) */
function stepQuiz(stage, card) {
  stage.innerHTML = "";
  stage.appendChild(el("h2", {}, "✅ فهم النصّ"));
  stage.appendChild(el("p", { class: "muted" }, "٥–٧ عناصر تبدأ بالمعنى العام ثم التفاصيل ثم الكلمة ثم تجاوز النص. الخطأ هنا يعني «تحتاج تلميحًا»، لا «رسبت»."));
  const state = { answered: 0, correct: 0 };
  card.quiz.forEach((q, qi) => {
    const box = el("div", { class: "q" });
    box.dataset.type = q.type;
    box.appendChild(el("div", { class: "prompt" }, `${qi + 1}. ${esc(q.prompt_ar)}`));
    if (q.prompt_fr) box.appendChild(el("div", { class: "fr-hint", dir: "ltr" }, esc(q.prompt_fr)));
    const body = el("div", {});
    box.appendChild(body);
    if (q.type === "order") {
      const shuffled = q.items.map((t, i) => ({ t, i })).sort(() => Math.random() - .5);
      const list = el("div", { class: "order" });
      shuffled.forEach(o => {
        const item = el("div", { class: "item" }, `<span class="fr" dir="ltr">${esc(o.t)}</span>`);
        item.dataset.i = o.i;
        const mv = el("div", { class: "row" });
        mv.append(el("button", { class: "icon-btn", onclick: () => { const p = item.previousElementSibling; if (p) list.insertBefore(item, p); } }, "▲"),
                  el("button", { class: "icon-btn", onclick: () => { const n = item.nextElementSibling; if (n) list.insertBefore(n, item); } }, "▼"));
        item.appendChild(mv); list.appendChild(item);
      });
      body.appendChild(list);
      const check = el("button", { class: "btn sm", style: "margin-top:8px" }, "تحقّق");
      check.onclick = () => {
        const orderNow = Array.from(list.children).map(n => +n.dataset.i);
        const ok = JSON.stringify(orderNow) === JSON.stringify(q.order);
        feedback(box, q, ok);
      };
      body.appendChild(check);
    } else if (q.type === "match") {
      const rows = el("div", { class: "grid" });
      q.pairs.forEach(([a, b], pi) => {
        const r = el("div", { class: "row" });
        r.appendChild(el("span", { class: "pill" }, esc(a)));
        const sel = el("select", { style: "min-height:48px;border-radius:12px;border:1px solid var(--line);font:inherit;padding:0 10px" });
        const all = q.pairs.map(p => p[1]);
        all.forEach((c, i) => sel.appendChild(el("option", { value: i }, c)));
        sel.onchange = () => { r.dataset.ok = (all[+sel.value] === b) ? "1" : "0"; r.style.borderColor = r.dataset.ok === "1" ? "var(--ok)" : "var(--warn)"; };
        r.appendChild(sel); rows.appendChild(r);
      });
      body.appendChild(rows);
      body.appendChild(el("button", { class: "btn sm", style: "margin-top:8px", onclick: () => {
        const ok = Array.from(rows.children).every(x => x.dataset.ok === "1");
        feedback(box, q, ok);
      } }, "تحقّق"));
    } else {
      const opts = el("div", {});
      q.choices.forEach((c, ci) => {
        const b = el("button", { class: "opt" }, (q.type === "image" ? `<span class="emoji">${c}</span>` : `<span class="mark">◻️</span>`) + `<span>${esc(c)}</span>`);
        b.onclick = () => {
          const ok = ci === q.answer;
          b.dataset.state = ok ? "ok" : "close";
          $(".mark", b) && ($(".mark", b).textContent = ok ? "✅" : "👀");
          feedback(box, q, ok);
        };
        opts.appendChild(b);
      });
      body.appendChild(opts);
    }
    stage.appendChild(box);
  });
  function feedback(box, q, ok) {
    let h = box.querySelector(".hint");
    if (!h) { h = el("div", { class: "hint" }); box.appendChild(h); }
    if (ok) {
      h.innerHTML = `أحسنت 👏 ${esc(q.why || "")}`; beep(880, 80);
      if (!box.dataset.counted) { box.dataset.counted = "1"; state.correct++; state.answered++; tally(); }
      return;
    }
    box.dataset.counted && (box.dataset.counted = "");
    const key = (q.hint || "").slice(0, 80);
    h.innerHTML = `🔎 <b>تلميح:</b> ${esc(key)}<br><small class="muted">لا أعطيك الجواب — ابحث في النصّ عن هذا الأثر ثم جرّب مجددًا.</small>`;
    const go = /الجملة\s*(\d+)|(phrase)\s*(\d+)/i.exec(q.hint || "");
    if (go) {
      h.appendChild(el("button", { class: "btn sm ghost", style: "margin-top:6px", onclick: () => {
        const i = +(go[1] || go[2]) - 1; const seg = card.segments[i];
        if (seg) { CURSTEP = 2; renderStep(); setTimeout(() => { const node = $$("[data-idx]", $("#reader"))[i]; node && node.scrollIntoView({ behavior: "smooth", block: "center" }); playAndFlag(i); }, 260); }
      } }, "🔊 استمع للجملة المطلوبة"));
    }
    function playAndFlag(i) {
      const node = $$("[data-idx]", $("#reader")); if (!node[i]) return;
      node.forEach(n => n.dataset.active = "0"); node[i].dataset.active = "1";
      speak(card.segments[i].fr, { slow: true });
    }
    if (!box.dataset.miss) { box.dataset.miss = "1"; state.answered++; tally(); }
  }
  function tally() {
    const d = doneOf(card.id);
    const score = state.correct / Math.max(card.quiz.length, 1);
    d.bestQuiz = Math.max(d.bestQuiz || 0, score); save();
    let p = stage.querySelector("#quiz-score");
    if (!p) { p = el("div", { id: "quiz-score", class: "card tight" }); stage.appendChild(p); }
    p.innerHTML = `<div class="row between"><b>الفهم الآن: ${Math.round(score * 100)}%</b>
      <span class="pill ${score >= .7 ? "teal" : "wine"}">${score >= .7 ? "🌳 نجحت الهدف (≥70%)" : "🌿 أعد المحاولة — لا يوجد وقت محدّد"}</span></div>
      <div class="meter"><i style="width:${Math.round(score * 100)}%"></i></div>`;
    if (score >= .7 && !p.dataset.awarded) { p.dataset.awarded = "1"; addStars(10, "فهم ≥ 70%"); confetti(); }
  }
}

/* ---- 6. jeu (loto sonore / memory) */
function stepJeu(stage, card) {
  stage.innerHTML = "";
  stage.appendChild(el("h2", {}, "🎲 لعبة المفردات"));
  stage.appendChild(el("p", { class: "muted" }, "نفس الكلمات، في قناع لعبة. الهدف: سماع الصوت وربطه بالمعنى والصورة."));
  const ws = card.malette.slice(0, 6);
  let hits = 0, tries = 0;
  const grid = el("div", { class: "grid two" });
  const speakBtn = el("button", { class: "btn sun block" }, "🔊 اسمع الكلمة واخترها");
  let cur = -1;
  const next = () => { cur = Math.floor(Math.random() * ws.length); speak(ws[cur].fr); };
  speakBtn.onclick = next;
  ws.forEach((w, i) => {
    const b = el("button", { class: "opt" }, `<span class="emoji">${w.emoji || "📘"}</span><span>${esc(w.fr)}</span>`);
    b.onclick = () => {
      tries++;
      if (i === cur) { hits++; b.dataset.state = "ok"; beep(990, 70); reviewBump(w.fr, 1); addStars(2, ""); if (ws.find(x => x.fr === w.fr) && !S.garden.includes(w.fr)) { S.garden.push(w.fr); save(); } }
      else { b.dataset.state = "close"; beep(300, 120); }
      const p = stage.querySelector("#score-game") || (() => { const d = el("div", { id: "score-game", class: "muted", style: "margin-top:8px" }); stage.appendChild(d); return d; })();
      p.textContent = `نِقاط اللعب: ${hits}/${tries}` + (hits >= 4 ? " — رائع! 🌳" : "");
      setTimeout(next, 520);
    };
    grid.appendChild(b);
  });
  stage.append(el("div", {}, speakBtn), grid);
  setTimeout(() => { if (ws.length) next(); }, 300);
}

/* ---- 7. à retenir + entrée en révision */
function stepRetenir(stage, card) {
  stage.innerHTML = "";
  const r = card.a_retenir;
  stage.appendChild(el("h2", {}, "📌 ما يجب حفظه"));
  const mots = el("div", { class: "row" });
  r.mots.forEach(m => mots.appendChild(el("button", { class: "pill", onclick: () => speak(m) }, esc(m))));
  stage.appendChild(mots);
  const st = el("div", { class: "grid" });
  r.structures.forEach(s => {
    const c = el("div", { class: "q" }, `<div class="fr-hint" dir="ltr" style="font-size:1.15rem;color:#2a2620">${esc(s.fr)}</div><div class="muted">${esc(s.ar)}</div>`);
    c.appendChild(el("button", { class: "btn sm teal", style: "margin-top:6px", onclick: () => speak(s.fr) }, "🔊 استمع"));
    st.appendChild(c);
  });
  stage.appendChild(st);
  stage.appendChild(el("div", { class: "hint" }, `💬 <b>القيمة:</b> ${esc(r.valeur)} — ${esc(r.valeur_ar)}`));
  const retell = el("div", { class: "q" });
  retell.appendChild(el("h3", {}, "🎤 احكِ على طريقتك (3 جمل)"));
  const ta = el("textarea", { rows: 3, placeholder: "Au début… puis… à la fin…  (اكتب بالفرنسية ولو بكلمات متقطّعة)", style: "width:100%;min-height:88px;border-radius:12px;border:1px solid var(--line);padding:10px;font:inherit;font-family:var(--fr);direction:ltr" });
  retell.appendChild(ta);
  retell.appendChild(el("div", { class: "row", style: "margin-top:6px" }, ""));
  const rrow = el("div", { class: "row" });
  rrow.append(el("button", { class: "btn sm teal", onclick: () => speak(ta.value || card.segments[0].fr) }, "🔊 اسمع جُملي"),
                el("button", { class: "btn sm ghost", onclick: () => { if (ta.value.trim().split(/\s+/).length >= 6) { addStars(8, "أعدت الحكي"); toast("ممتاز! حفظتُ حِكايتك في محفظتك 📁"); } else toast("اكتب 6 كلمات على الأقل، وأنا أنصت 🌱"); } }, "أرسل للأستاذ"));
  retell.appendChild(rrow);
  stage.appendChild(retell);
  card.malette.slice(0, 5).forEach(w => reviewBump(w.fr, 0));
  stage.appendChild(el("button", {
    class: "btn block", style: "margin-top:12px",
    onclick: () => { markDone(card.id, "retenir"); toast("أنهيت البطاقة 🌟"); location.hash = ""; }
  }, "أنهيتُ النصّ ✔"));
}

/* ------------------------------------------------------- révision espacée */
function reviewBump(fr, grade) {
  const r = S.review[fr] || (S.review[fr] = { due: today(), reps: 0, ok: 0, ease: 2.3 });
  r.reps++; r.ok = clamp(r.ok + (grade >= 2 ? 1 : grade === 1 ? .6 : -1), 0, 3);
  const ivl = Math.round([0, 1, 3, 7, 16, 35][Math.min(r.reps, 5)] * (1 + (r.ok - 1) * .3));
  const d = new Date();
  // 1re répétition le jour même : la station de révision se découvre aujourd'hui, pas demain.
  d.setDate(d.getDate() + (r.reps <= 1 ? 0 : Math.max(1, ivl)));
  r.due = d.toISOString().slice(0, 10);
  save();
}
function reviewQueue() {
  const t = today();
  return Object.entries(S.review).filter(([, r]) => r.due <= t).map(([fr]) => fr);
}
function runReview(words) {
  const pool = [];
  words.forEach(fr => D.cards.forEach(c => c.malette.forEach(w => { if (norm2(w.fr) === norm2(fr)) pool.push({ w, c }); })));
  if (!pool.length) { toast("لا شيء مستحقًّا للمراجعة اليوم 🙂"); return; }
  let i = 0, good = 0;
  const stage = $("#main"); stage.innerHTML = "";
  const box = el("section", { class: "card" });
  stage.appendChild(box);
  next();
  function norm2(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
  function next() {
    box.innerHTML = "";
    if (i >= pool.length) {
      box.innerHTML = `<h2>🌳 انتهت المراجعة</h2><p>أجبتَ صحيحًا <b>${good}/${pool.length}</b>.</p>`;
      box.appendChild(el("button", { class: "btn block", onclick: () => { location.hash = ""; } }, "رجوع"));
      if (good / pool.length >= .7) addStars(8, "مراجعة كاملة");
      return;
    }
    const { w, c } = pool[i];
    const q = el("div", { class: "q" });
    q.innerHTML = `<small class="muted">بطاقة ${i + 1}/${pool.length} · ${esc(c.titre_fr)}</small>
      <div class="fr" style="font-family:var(--fr);direction:ltr;font-size:1.5rem;font-weight:700;color:var(--ink)">${esc(w.fr)}</div>`;
    const acts = el("div", { class: "row" });
    acts.appendChild(el("button", { class: "btn sm teal", onclick: () => speak(w.fr, { slow: true }) }, "🔊 اسمع"));
    const reveal = el("button", { class: "btn sm ghost" }, "👀 أظهر المعنى");
    const ans = el("div", { class: "ar", hidden: true, style: "margin-top:8px" }, `${esc(w.ar)} <span class="muted">/ ${esc(w.ex_fr || "")}</span>`);
    const g = el("div", { class: "row", style: "margin-top:8px", hidden: true });
    [["صعبة", 0, "wine"], ["مقبولة", 1, "sun"], ["سهلة", 2, "teal"]].forEach(([lab, gr, cls]) => {
      g.appendChild(el("button", { class: `btn sm ${cls === "wine" ? "ghost" : cls}`, onclick: () => { if (gr >= 1) good++; reviewBump(w.fr, gr); i++; next(); } }, lab));
    });
    reveal.onclick = () => { ans.hidden = false; g.hidden = false; reveal.hidden = true; };
    q.append(acts, ans, reveal, g);
    box.appendChild(el("h2", {}, "🔁 المراجعة"));
    box.appendChild(q);
    speak(w.fr);
  }
}

/* ------------------------------------------------------------ phono (S5) */
function viewPhono() {
  const stage = $("#main"); stage.innerHTML = "";
  const card = el("section", { class: "card" });
  card.appendChild(el("h2", {}, "🔊 محطة النطق"));
  card.appendChild(el("p", { class: "muted" }, "الدليل الرسمي يقول: لا حصة فونيتيك في التوقيت الأسبوعي، والتصحيح يكون ضمن القراءة. هنا نأخذ 4 دقائق قبل كل نصّ، ونستعمل قائمة التباينات التي حدّدها الدليل (ص26)."));
  D.phonetique.forEach((p, i) => {
    const b = el("div", { class: "q" });
    b.innerHTML = `<div class="prompt">${esc(p.pair)} <small class="muted">— ${esc(p.ar)}</small></div>
      <div class="fr-hint" dir="ltr">${p.fr.map(x => `<b>${esc(x)}</b>`).join(" ↔ ")}</div>
      <div class="hint">💡 ${esc(p.tip)}</div>`;
    const acts = el("div", { class: "row", style: "margin-top:8px" });
    acts.appendChild(el("button", { class: "btn sm teal", onclick: () => p.fr.forEach(w => speak(w)) }, "▶️ اسمع التباين"));
    acts.appendChild(el("button", { class: "btn sm ghost", onclick: () => { speak(p.fr.join(" , "), { slow: true }); toast("قلّدني بصوت عالٍ 🎤"); } }, "🐢 أنا أقلّد"));
    b.appendChild(acts); card.appendChild(b);
  });
  card.appendChild(el("button", { class: "btn ghost block", onclick: () => { location.hash = ""; } }, "رجوع"));
  stage.appendChild(card);
}

/* ----------------------------------------------------------- placement (S10) */
function viewPlacement() {
  const stage = $("#main"); stage.innerHTML = "";
  const box = el("section", { class: "card" });
  box.innerHTML = `<h2>🧭 اختبار التوجيه — 7 دقائق</h2>
    <p class="muted">مبني على «module des prérequis» الرسمي (أوراق PL1→PL4). لا درجات معروضة لك، فقط مسار ومساعدات.</p>`;
  let st = 0, listen = 0, comp = 0, wcpm = 0;
  const body = el("div", {}); box.appendChild(body); stage.appendChild(box);
  render();
  function render() {
    body.innerHTML = "";
    if (st === 0) {
      body.appendChild(el("h3", {}, "1️⃣ استمع واختر الصورة"));
      const q = [{ w: "le four", c: ["🔥", "🌧️", "🐄"], a: 0 }, { w: "la corbeille", c: ["🧺", "🚲", "🖍️"], a: 0 }, { w: "neiger", c: ["❄️", "🌊", "🌪️"], a: 0 }];
      let i = 0; const nextQ = () => {
        body.querySelectorAll(".opt").forEach(x => x.remove());
        if (i >= q.length) { st = 1; return render(); }
        const row = el("div", {});
        row.appendChild(el("button", { class: "btn sm teal", onclick: () => speak(q[i].w, { slow: true }) }, "🔊 " + q[i].w));
        q[i].c.forEach((c, ci) => {
          const b = el("button", { class: "opt", style: "margin-top:6px" }, `<span class="emoji">${c}</span><span>${esc(q[i].w)}</span>`);
          b.onclick = () => { if (ci === q[i].a) { listen++; b.dataset.state = "ok"; } else b.dataset.state = "close"; i++; setTimeout(nextQ, 400); };
          row.appendChild(b);
        });
        body.appendChild(row); speak(q[i].w);
      };
      nextQ();
    } else if (st === 1) {
      body.appendChild(el("h3", {}, "2️⃣ اقرأ الجملة بصوتك (اكتب الكلمات الصحيحة)"));
      const t = "Le boulanger met les pains au four.";
      body.appendChild(el("div", { class: "q" }, `<div class="fr-hint" dir="ltr" style="font-size:1.3rem;color:#2a2620">${esc(t)}</div>`));
      const inp = el("input", { type: "number", min: 0, max: 20, placeholder: "كم كلمة قرأتها صحيحة؟", style: "min-height:56px;width:100%;border-radius:14px;border:1px solid var(--line);padding:0 12px;font:inherit" });
      body.appendChild(inp);
      body.appendChild(el("button", { class: "btn block", style: "margin-top:8px", onclick: () => { wcpm = (+inp.value || 0) * 12; st = 2; render(); } }, "التالي"));
    } else if (st === 2) {
      body.appendChild(el("h3", {}, "3️⃣ فهم + مفردات"));
      const q = [{ p: "« On dirait qu’il vient de neiger » — الطحين…", c: ["أبيض كالثلج", "حارّ", "ثقيل"], a: 0 },
                 { p: "« prompt » تعني…", c: ["سريع", "بطيء", "كبير"], a: 0 },
                 { p: "الفعل « Sortiront » هو…", c: ["مستقبل", "ماضي", "أمر"], a: 0 }];
      let i = 0;
      const nextQ = () => {
        $$(".q", body).forEach(x => x.remove());
        if (i >= q.length) { st = 3; return render(); }
        const card = el("div", { class: "q" });
        card.appendChild(el("div", { class: "prompt" }, esc(q[i].p)));
        q[i].c.forEach((c, ci) => {
          const b = el("button", { class: "opt" }, `<span class="mark">◻️</span><span>${esc(c)}</span>`);
          b.onclick = () => { if (ci === q[i].a) comp++; i++; setTimeout(nextQ, 300); };
          card.appendChild(b);
        });
        body.appendChild(card);
      };
      nextQ();
    } else if (st === 3) {
      body.appendChild(el("h3", {}, "4️⃣ كيف تشعر من القراءة بالفرنسية؟"));
      [["😟 أخاف أن أخطأ", "A"], ["😐 أحاول وأحتاج مساعدة", "B"], ["😎 أثق بنفسي", "C"]].forEach(([t, v]) => {
        body.appendChild(el("button", { class: "btn ghost block", style: "margin-top:8px", onclick: () => finish(v) }, t));
      });
    }
    function finish(conf) {
      const score = (listen / 3) * .35 + comp / 3 * .35 + clamp(wcpm / 70, 0, 1) * .3;
      const voie = (score + (conf === "C" ? .15 : conf === "A" ? -.12 : 0)) > .68 ? "C" : (score > .35 ? "B" : "A");
      S.voie = voie; save();
      body.innerHTML = `<h3>🌱 نتيجتك</h3>
        <p>مسارك: <b>${voie}</b> — ${voie === "A" ? "نبدأ بالدعم الكامل (ترجمة+صورة+صوت) ونخفّفه حين تنجح 3 مرّات متتالية." : voie === "B" ? "صوت+صورة، الترجمة عند الطلب." : "صوت فقط، ثم قراءة مستقلّة."}</p>
        <div class="meter"><i style="width:${Math.round(score * 100)}%"></i></div>
        <p class="muted">لا علامة مدرسية هنا. الأستاذ يرى الأرقام في لوحته، وأنت ترى مسارك فقط.</p>`;
      body.appendChild(el("button", { class: "btn block", onclick: () => { location.hash = ""; } }, "إلى النصّ الأول"));
    }
  }
}

/* ------------------------------------------------------------------ robot */
const TUTOR = {
  mood: /(متوتر|خايف|ما نجمت|ما نفهمتش|غبي|تعبت|حرام|n\u2019arrive|dégo)/i,
  // « أعطني الجواب » passe avant « اشرح » : les deux parlent du texte, la différence est pédagogique
  answer: /(أ?عطني|اعطيني|قول[ي]? ?لي|ما هو|وش|أرني|give me|tell me|what is).{0,14}(الجواب|الحل|الإجابة|la r[ée]ponse|the answer|le secret)/i,
  personal: /(عائلك|سكنى|هاتف|numéro|اسم عائلتك|photo|عنوان)/i,
  offtopic: /(فيس|foot|كرة|أغنية|يوتيوب)/i,
  danger: /(ضرب|عنف|أذى|أوجع|انتحار)/i
};
function tutorReply(q, ctx) {
  const hint = (ctx.q && ctx.q.hint) || "عُد إلى النص وابحث عن قرينة صغيرة.";
  if (TUTOR.personal.test(q)) return { ar: "لا نسأل عن معلومات شخصية — ولا نحتاجها هنا 🌱 لنُكمل النصّ.", fr: "" };
  if (TUTOR.danger.test(q)) return { ar: "هذا مهمّ — حدّث أستاذك أو أحد والديك الآن، وأنا أنتظرك هنا.", fr: "" };
  if (TUTOR.mood.test(q)) return { ar: "خذ نفسًا: شهيق ٤ · حبس ٤ · زفير ٤. الآن اقرأ كلمة واحدة فقط نجحت فيها 👏 ثم نكمل.", fr: "Un mot à la fois.", calm: true };
  if (TUTOR.answer.test(q)) return { ar: "لا أعطيك الجواب، لكنّ هذا يكفي لتجده بنفسك 🔎 " + hint + (ctx.attempted ? " وقد جرّبتَ فعلًا ⇒ " + (ctx.q && ctx.q.why ? "تأكّد من هذا: " + ctx.q.why : "أحسنت المحاولة.") : ""), fr: "" };
  if (TUTOR.offtopic.test(q)) return { ar: "بعدين نلعب 🙂 الآن عندنا جملة تنتظر: «" + esc(ctx.fr || "") + "» — اسمعها ثم قلّها.", fr: ctx.fr || "" };
  return { ar: "سؤال جيّد 👌 " + (ctx.trad_ar ? "هذه الجملة تقول: «" + ctx.trad_ar + "». جرّب الآن أن تقرأ الجزء الأول فقط." : "عُد للجملة " + ((ctx.i ?? 0) + 1) + " واستمع لها ببطء، ثم أخبرني بالكلمة التي لم تفهمها."), fr: ctx.fr || "" };
}
function openTutor() {
  const t = $("#tutor"); t.hidden = false;
  $("#tutor-input").focus();
}
$("#tutor-close").onclick = () => { $("#tutor").hidden = true; };
$("#tutor-avatar").onclick = () => speak("Salut !");
$("#tutor-form").onsubmit = (e) => {
  e.preventDefault();
  const inp = $("#tutor-input"); const q = inp.value.trim(); if (!q) return;
  log(q, true); inp.value = "";
  const ctx = tutorCtx();
  const r = tutorReply(q, ctx);
  setTimeout(() => {
    log(`${r.ar}${r.fr ? ` <span class="fr">${esc(r.fr)}</span>` : ""}`);
    if (r.calm) { $("#tutor-avatar").textContent = "🫧"; setTimeout(() => $("#tutor-avatar").textContent = "🌟", 2200); addStars(1, "تنفّست وعدت"); }
    if (r.fr) speak(r.fr, { slow: true });
  }, 320);
};
$$("#tutor-quick button").forEach(b => b.onclick = () => {
  const map = { explain: "اشرح لي هذه الجملة", word: "ماذا تعني هذه الكلمة؟", slow: "نطّقها لي ببطء", test: "اختبرني", scare: "أنا متوتر، شجّعني" };
  $("#tutor-input").value = map[b.dataset.q];
  $("#tutor-form").requestSubmit();
  if (b.dataset.q === "slow" && CUR) { const seg = CUR.segments[currentSeg()]; if (seg) speak(seg.fr, { slow: true }); }
  if (b.dataset.q === "test") { CURSTEP = 4; const c = $("#main #stage"); if (c) renderStep(); }
});
function currentSeg() { const a = $("#main [data-active='1']"); return a ? +a.dataset.idx : 0; }
function tutorCtx() {
  const c = CUR; if (!c) return {};
  const i = currentSeg(), seg = c.segments[i] || c.segments[0];
  const step = STEPS[CURSTEP] ? STEPS[CURSTEP].id : "";
  const q = (step === "quiz") ? (c.quiz[$$("#main .q").length - 1 - 0] || c.quiz[0]) : null;
  return { fr: seg.fr, trad_ar: seg.ar, i, q, attempted: $("#main .q[data-counted]") || $("#main .q[data-miss]") };
}
function log(html, me) {
  const ul = $("#tutor-log");
  ul.appendChild(el("li", { class: me ? "me" : "" }, html));
  ul.scrollTop = ul.scrollHeight;
}

/* --------------------------------------------------------------- réglages */
$("#btn-settings").onclick = () => {
  const body = el("div", { class: "grid" });
  const v = el("select", { style: "min-height:52px;border-radius:12px;border:1px solid var(--line);font:inherit;padding:0 10px" });
  v.appendChild(el("option", { value: "" }, "صوت فرنسي تلقائي"));
  voices.filter(x => /fr/i.test(x.lang) || /^fr/i.test(x.name)).forEach(x => v.appendChild(el("option", { value: x.voiceURI }, `${x.name} (${x.lang})`)));
  v.value = S.voiceURI; v.onchange = () => { S.voiceURI = v.value; save(); };
  const chk = (label, k) => { const i = el("input", { type: "checkbox" }); i.checked = S[k]; i.onchange = () => { S[k] = i.checked; save(); }; const l = el("label", { class: "row" }); l.append(i, el("span", {}, label)); return l; };
  const range = el("input", { type: "range", min: "0.4", max: "1.1", step: "0.05", value: S.rate });
  range.oninput = () => { S.rate = +range.value; save(); };
  const reset = el("button", { class: "btn ghost block", onclick: () => {
    if (confirm("نحذف تقدّم «" + (S.pseudo || "؟") + "» ونجومه؟")) {
      writeRaw(keyFor(S.pseudo), ""); writeRaw(LAST, ""); localStorage.removeItem(KEY);
      if (location.reload) location.reload(); else location.assign(location.pathname);
    }
  } }, "🗑️ تصفير بياناتي");
  /* poste partagé de la salle : on rend le changement d'élève évident (sinon on écrase un camarade) */
  const others = studentKeys().filter(k => k !== String(S.pseudo));
  const sw = el("button", { class: "btn ghost block", onclick: () => {
    writeRaw(LAST, ""); location.hash = ""; location.reload ? location.reload() : location.assign(location.pathname);
  } }, "🔄 تلميذ آخر (نفس الجهاز/المتصفّح)");
  const who = others.length ? el("div", { class: "row", style: "flex-wrap:wrap;margin-top:6px" },
      el("small", { class: "muted" }, "على هذا الجهاز: " + studentKeys().map(esc).join(" · "))) : null;
  body.append(el("div", {}, "<b>الصوت الفرنسي</b>", v),
                el("div", {}, "<b>سرعة القراءة</b>", range),
                chk("إظهار الترجمة العربية افتراضيًا", "showAr"),
                chk("مؤثرات صوتية", "sfx"),
                chk("إيقاف الحركات (تقليل الحركة)", "reduce"),
                el("div", { class: "muted" }, "التقدّم محفوظ داخل هذا المتصفّح وحده (لا حساب، لا اسم عائلة، لا إرسال على الشبكة). على خادم المدرسة: تسجيل لكل تلميذ بنفس الاسم، وفضاء الأستاذ يرى أسماء هذا الجهاز."),
                sw, who, reset);
  sheet("<b>الإعدادات</b>", body);
};

/* ------------------------------------------------------------------ route */
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  paintTop();
  if (h.startsWith("card/")) return viewCard(h.split("/")[1]);
  if (h.startsWith("phono")) return viewPhono();
  if (h.startsWith("placement")) return viewPlacement();
  return viewHome($("#main"));
}
window.addEventListener("hashchange", route);

initVoices();
try {
  if (navigator && navigator.serviceWorker && navigator.serviceWorker.register && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
} catch (e) { /* pas de SW dans cet environnement : le prototype fonctionne quand même */ }
route();
})();
