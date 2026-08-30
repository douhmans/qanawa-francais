// Vérification du contenu du prototype (aucun navigateur requis).
import fs from "node:fs";
const window = {};
const src = fs.readFileSync(new URL("../prototype/data.js", import.meta.url), "utf8");
new Function("window", src)(window);
const D = window.QANAWA_DATA;
const err = [], warn = [];
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
if (!Array.isArray(D.cards) || !D.cards.length) err.push("aucune carte");
const ids = new Set();
for (const c of D.cards) {
  if (ids.has(c.id)) err.push(c.id + ": id dupliqué"); ids.add(c.id);
  for (const k of ["id","module","titre_fr","titre_ar","slogan","projet_ecriture","outils_langue","objectifs_oraux","segments","malette","quiz","a_retenir","thumb","duree","difficulte"])
    if (c[k] == null) err.push(`${c.id}: champ manquant ${k}`);
  if (!(c.module >= 1 && c.module <= 8)) err.push(`${c.id}: module hors 1..8`);
  if (!Array.isArray(c.segments) || c.segments.length < 4) err.push(`${c.id}: <4 énoncés`);
  c.segments.forEach((s, i) => {
    if (!s.fr || !s.ar) err.push(`${c.id} seg${i + 1}: fr ou ar manquant`);
    if (/(TODO|\?\?\?|lorem)/i.test(s.fr + s.ar)) err.push(`${c.id} seg${i + 1}: placeholder`);
  });
  const body = norm(c.segments.map(s => s.fr).join(" "));
  const stem = (t) => { t = norm(t); return t.length > 5 ? t.slice(0, Math.max(4, t.length - 3)) : t; };
  c.malette.forEach(w => {
    for (const k of ["fr","ar","phon","syllabes","emoji","ex_fr","ex_ar"]) if (w[k] == null) err.push(`${c.id}: malette.${k} manquant (${w.fr})`);
    if (!w.fr.split(/\s+/).every(tok => body.includes(stem(tok)))) warn.push(`${c.id}: mot «${w.fr}» non retrouvé en racine dans le texte (flexion ?)`);
  });
  c.quiz.forEach((q, qi) => {
    if (!q.prompt_ar) err.push(`${c.id} q${qi + 1}: consigne arabe manquante`);
    if (!q.hint) err.push(`${c.id} q${qi + 1}: hint manquant (politique «indice, jamais la réponse»)`);
    if (["choice","image","word","gram"].includes(q.type)) {
      if (!Array.isArray(q.choices) || q.choices.length < 3) err.push(`${c.id} q${qi + 1}: <3 choix`);
      if (!(q.answer >= 0 && q.answer < q.choices.length)) err.push(`${c.id} q${qi + 1}: answer hors bornes (${q.answer})`);
      if (q.hint && norm(q.choices[q.answer]).length > 3 && norm(q.hint).includes(norm(q.choices[q.answer]))) err.push(`${c.id} q${qi + 1}: le hint contient la réponse`);
    }
    if (q.type === "order") {
      if (q.items.length !== q.order.length) err.push(`${c.id} q${qi + 1}: items/order de tailles différentes`);
      if (new Set(q.order).size !== q.order.length) err.push(`${c.id} q${qi + 1}: order non permutations`);
    }
    if (q.type === "match" && (!q.pairs || q.pairs.length < 2)) err.push(`${c.id} q${qi + 1}: match sans paires`);
  });
  if (c.quiz.length < 5) err.push(`${c.id}: ${c.quiz.length} items (attendu ≥5)`);
  if (c.a_retenir.structures.length < 2) err.push(`${c.id}: structures <2`);
  if (!c.a_retenir.valeur) err.push(`${c.id}: valeur éducative absente`);
}
if (D.phonetique.length < 5) err.push("banque phonétique trop courte");
console.log(`cartes: ${D.cards.length} · énoncés: ${D.cards.reduce((a,c)=>a+c.segments.length,0)} · mots: ${D.cards.reduce((a,c)=>a+c.malette.length,0)} · items: ${D.cards.reduce((a,c)=>a+c.quiz.length,0)} · contrastes: ${D.phonetique.length}`);
if (warn.length) console.log("AVERTISSEMENTS:\n  - " + warn.join("\n  - "));
if (err.length) { console.log("ERREURS:\n  - " + err.join("\n  - ")); process.exit(1); }
console.log("✅ prototype data conforme au schéma");
