/* Reproduction du cas de ل'utilisateur : ouverture par double-clic (file://) avec localStorage refusé.
   But : dire si le champ du prénom est utilisable, et ce que voit l'élève.
   node tools/test_file_mode.mjs          (aucun serveur nécessaire) */
import { JSDOM, VirtualConsole } from "/tmp/jsdomdom/node_modules/jsdom/lib/api.js";
import fs from "node:fs";

const errs = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errs.push(((e.detail && e.detail.message) || e.message)));

function build(blockStorage, url) {
  const html = fs.readFileSync("prototype/index.html", "utf8")
    .replace(/<script src="([^"]+)"><\/script>/g, (m, f) => "<script>" + fs.readFileSync("prototype/" + f, "utf8") + "</script>");
  return new JSDOM(html, {
    runScripts: "dangerously", virtualConsole: vc, url: url || "file:///C:/Qanawa/prototype/index.html",
    pretendToBeVisual: true,
    beforeParse(w) {
      if (blockStorage) {
        Object.defineProperty(w, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
      }
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      w.speechSynthesis = { getVoices: () => [], speak() {}, cancel() {} };
      w.SpeechSynthesisUtterance = class {};
      w.HTMLElement.prototype.scrollIntoView = () => {};
      w.HTMLElement.prototype.focus = function () { this.ownerDocument.__focused = this; };
    }
  });
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

for (const blocked of [true, false]) {
  const label = blocked ? "localStorage REFUSÉ (le cas Chrome/Edge en file://)" : "localStorage accepté (serveur local — cas normal)";
  console.log("\n=== " + label + " ===");
  errs.length = 0;
  const dom = build(blocked, blocked ? null : "http://localhost:8137/index.html");
  await wait(450);
  const d = dom.window.document;
  const inp = d.getElementById("ob-name");
  console.log("  champ prénom trouvé :", !!inp);
  if (!inp) { console.log("  erreurs :", errs.join(" | ")); continue; }
  console.log("  INPUT readonly/disabled :", inp.readOnly, "/", inp.disabled);
  console.log("  dir du champ :", inp.getAttribute("dir"), "| placeholder :", (inp.getAttribute("placeholder") || "").slice(0, 44));
  // on « tape » comme le ferait l'élève
  inp.focus();
  inp.value = "سلمى";
  inp.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  console.log("  valeur après frappe :", JSON.stringify(inp.value));
  const enter = new dom.window.KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true });
  inp.dispatchEvent(enter);
  await wait(320);
  const btn = [...d.querySelectorAll("button")].find(b => /ادخل المنص/.test(b.textContent));
  console.log("  après Entrée : cartes affichées =", d.querySelectorAll(".lesson").length);
  if (btn) { btn.click(); await wait(320); }
  console.log("  après clic sur le bouton : cartes =", d.querySelectorAll(".lesson").length);
  console.log("  bandeau « pas de sauvegarde » affiché :", !!d.getElementById("storage-warn"), "(attendu: vrai si blocage, faux sinon)",
              "|", (d.querySelector("#storage-warn b") || {}).textContent || "(aucun)");
  console.log("  focus automatique sur le champ :", d.__focused === inp ? "oui" : "non");
  console.log("  dir/placeholder du champ :", inp.getAttribute("dir"), "/", JSON.stringify(inp.getAttribute("placeholder")));
  console.log("  erreurs de script :", errs.length ? errs.slice(0, 3).join(" | ") : "aucune");
  dom.window.close();
}
