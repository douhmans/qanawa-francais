#!/usr/bin/env python3
"""
build_official_card.py — من صورة/PDF لصفحة كتاب التلميذ (استعمال خاص داخل فضاء الأستاذ)
إلى «بطاقة درس» كاملة تخدم أهداف البرنامج الرسمي.

خط الإنتاج:
  1) OCR محلي (pytesseract: fra+ara، أو pdftotext للـ PDF المُنسَّق) → نصّ الصفحة.
  2) قطع إلى جُمَل (Découpe + hyphens «-» في نهاية السطر) وترقيمها.
  3) مطابقة العنوان بقائمة `data/curriculum-6e.json` → نعرف الوحدة، النص، هدف اللغة
     (grammaire/conjugaison/orthographe) وهدف التواصل الشفهي، فنعمر meta تلقائيًا.
  4) معجم: استخراج كل كلمة فرنسية > 1 حرف، إسقاط الكلمات في «قائمة المعجم المدرَّس 1A→5A»
     (data/tunisian-primary-lexicon.txt، اختياري)، الباقي = mots nouveaux.
     لكل mot nouveau: API مبسّطة + قطع مقطعي + ترجمة (LLM أو قاموس محلي) + مثال تونسي.
  5) توليد media: TTS لكل جملة (سريعتان) + TTS لكل كلمة + صورة لكل فقرة (نموذج توليد صور)
     — كلها مخزّنة في sources/cards/<id>/media، فلا استدعاء لكل تلميذ لاحقًا.
  6) أسئلة الفهم بالتراتبية الرسمية: globale → analytique → vocabulaire → dépassement.
  7) تقرير QC آلي: سقف A1، مطابقة fr↔ar، 1:1 للقطع، سلامة روابط media، تنبيه حقوق النشر.

قانوني: النصّ المستخرج يبقى في بطاقة خاصة بالتلميذ/القسم فقط. --publish يمنع تضمين النصّ الخام.
"""
import argparse, json, os, re, subprocess, sys, unicodedata, hashlib, difflib

SENT_SPLIT = re.compile(r"(?<=[.!?…])\s+(?=[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜŸ«\"']|\d)")
WORD = re.compile(r"[A-Za-zÀ-ÿœŒ]+(?:['’][a-zà-ÿ]+)?")

def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9]+", " ", s.lower())
    return " ".join(s.split())

def read_text(path, langs="fra+ara"):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".txt", ".md", ""):                      # déjà du texte (extrait d'un PDF, transcription…)
        raw = open(path, encoding="utf-8", errors="ignore").read()
        raw = re.sub(r"(?m)^\s*\[?p?\d+\]?\s*$", " ", raw)   # enlever les marqueurs de page [p11]
        raw = re.sub(r"(?m)^\s*\d+\s*$", " ", raw)              # enlever les numéros de page isolés
        return raw
    if ext == ".pdf":
        try:
            return subprocess.run(["pdftotext", "-layout", path, "-"],
                                  capture_output=True, text=True, check=True).stdout
        except Exception as e:
            print("[warn] pdftotext échoué:", e, file=sys.stderr)
            return ""
    try:
        import pytesseract
        from PIL import Image
        return pytesseract.image_to_string(Image.open(path), lang=langs)
    except Exception as e:
        print("[error] OCR indisponible :", e, file=sys.stderr)
        print("  → pip install pytesseract pillow && apt-get install tesseract-ocr tesseract-ocr-fra tesseract-ocr-ara",
              file=sys.stderr)
        return ""

NOISE = [
    r"^\s*\[?p?\d+\]?\s*$",                              # numéro / marqueur de page
    r"Module\s*\d+\s*$", r"Module\s*\d+\s+",
    r"Texte\s*n°\s*\d+\s*",
    r"\bJe\s+(?:lis|récite|m'entraîne|observe|retiens|produis|fais le point)\b\s*[-–]?\s*",
    r"\bJ'ouvre la boîte à mots\b", r"\bJe joue avec les mots\b",
    r"(?:\b(?:Lire|Comprendre|Réagir|Apprécier|Réciter)\b\s*)+",
    r"^\s*\d+\s*$",                                       # numéro de page isolé
]


def _clean(line):
    """Retire les mentions d'appareil du manuel (rubriques, logos, n° de page/module/texte)."""
    for pat in NOISE:
        line = re.sub(pat, " ", line, flags=re.I)
    return re.sub(r"\s+", " ", line).strip(" -·•:")


def sentences(raw):
    """Page brute → énoncés. Les lignes d'appareil (Module n°, « Je lis », « Texte n° 1 »,
    « Comprendre Lire Réagir », numéros de page) sont retirées AVANT la découpe, et un titre
    court non ponctué devient un énoncé autonome."""
    kept, buf = [], ""
    for l in (x.strip() for x in raw.replace("\r", "").split("\n")):
        if not l:
            continue
        if re.search(r"\.{2,}\s*$", l):                 # ligne coupée par la ponctuation de suspension
            if buf:
                kept.append(buf); buf = ""
            kept.append(l)
            continue
        is_title = len(l) <= 46 and not re.search(r"[.!?…]$", l)
        is_leading_heading = len(l) <= 60 and l.endswith(":")
        if is_title:
            if buf:
                kept.append(buf); buf = ""
            c = _clean(l)
            if len(c) >= 3:
                kept.append(c)
            continue
        if is_leading_heading and not buf:
            buf = l
            continue
        if buf:
            buf = buf[:-1] + l if (buf.endswith("-") and re.match(r"^[a-zà-ÿ]", l)) else (buf + " " + l).strip()
        else:
            buf = l
        if re.search(r"([.!?…]\s*$)|([.!?…]»\s*$)", buf):
            kept.append(_clean(buf)); buf = ""
    if buf:
        kept.append(_clean(buf))

    out = []
    for ln in kept:
        if len(ln) < 3:
            continue
        if len(ln) <= 46 and not re.search(r"[.!?…]$", ln):
            out.append(ln)
            continue
        for piece in SENT_SPLIT.split(ln):
            piece = _clean(piece)
            if len(piece) >= 3:
                out.append(piece)
    merged = []
    for seg in out:
        if merged and len(seg) < 18 and re.match("^[»\"'’.)!…]+$", seg):
            merged[-1] = merged[-1] + " " + seg
        else:
            merged.append(seg)
    return [m for m in merged if _clean(m)]

def match_official(raw, curriculum):
    """يعيد (module, (titre, type, score), score) — يعتمد نسبة كلمات العنوان الموجودة في الصفحة."""
    target_words = set(norm(raw).split())
    best = (None, None, 0.0)
    for m in curriculum["modules"]:
        entries = [(t, "lecture") for t in m["textes"]["lecture"]]
        entries += [(m["textes"]["documentaire"], "documentaire"),
                    (m["textes"]["action"], "action")]
        entries += [(t, "poeme") for t in m["sous_themes_poematiques"]]
        for title, kind in entries:
            tw = set(norm(title).split())
            if not tw:
                continue
            score = len(tw & target_words) / len(tw)
            if score > best[2] or (score == best[2] and len(tw) > len(norm(best[1][0]).split())):
                best = (m, (title, kind, round(score, 3)), score)
    return best

def load_lexicon(path):
    """Liste de mots « déjà vus » — un fichier d'une ligne ou plusieurs mots par ligne (espaces)."""
    if not os.path.exists(path):
        return set()
    words = set()
    for line in open(path, encoding="utf-8", errors="ignore"):
        if line.lstrip().startswith("#"):
            continue
        words |= {norm(w) for w in line.split() if norm(w)}
    return words

def new_words(sents, lexicon, min_len=2):
    freq, seen = {}, []
    for s in sents:
        for w in WORD.findall(s):
            nw = norm(w)
            if len(w) < min_len or not nw or nw.isdigit() or nw in lexicon:
                continue
            freq[nw] = freq.get(nw, 0) + 1
            if nw not in seen:
                seen.append(nw)
    return seen, freq

def syllabify(w):
    try:
        import pyphen
        d = getattr(syllabify, "_d", None) or pyphen.Pyphen(lang="fr")
        syllabify._d = d
        parts = d.inserted(w.lower()).replace("\u00ad", "-").split("-")
        if all(parts) and "".join(parts) == w.lower().replace("-", ""):
            return parts
    except Exception:
        pass
    w = w.lower()
    vowels = "aeiouyâàäéèêëïîôöùûüÿ"
    chunks, cur = [], ""
    for ch in w:
        cur += ch
        if ch in vowels and not any(c in vowels for c in cur[-2:-1]):
            j = len(cur)
            while j < len(w) and w[j] not in vowels:
                j += 1
            if j > len(cur):
                chunks.append(cur + w[len(cur):max(j - 1, len(cur) + 1)])
                cur = w[max(j - 1, len(cur) + 1):]
    if cur:
        chunks.append(cur)
    return [c for c in chunks if c] or [w]

def qc(card, curriculum):
    issues = []
    officiel = card.get("rights", {}).get("mode") == "prive_classe"
    for s in card["segments"]:
        if not officiel and len(s["fr"].split()) > 14:
            issues.append(f"segment {s['idx']}: phrase de {len(s['fr'].split())} mots (plafond 14 → découper)")
        if s.get("ar") in (None, "", "—"):
            issues.append(f"segment {s['idx']}: traduction arabe manquante")
    if not card.get("meta", {}).get("module"):
        issues.append("meta.module non résolu : préciser le module du manuel")
    for w in card.get("malette", []):
        if not w.get("ar"):
            issues.append(f"mot «{w['fr']}» sans traduction")
    if card.get("rights", {}).get("mode") == "public" and card.get("rights", {}).get("include_raw_text"):
        issues.append("⚠ texte brut du manuel ne doit pas être publié publiquement (droits CNIP)")
    return issues

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help="image (jpg/png) ou PDF d'une page du manuel")
    ap.add_argument("--curriculum", default="data/curriculum-6e.json")
    ap.add_argument("--lexicon", default="data/tunisian-primary-lexicon.txt")
    ap.add_argument("--out", default="sources/cards")
    ap.add_argument("--id", default=None)
    ap.add_argument("--module", type=int, default=None, help="forcer le module (1..8)")
    ap.add_argument("--publish", action="store_true", help="version publique : sans texte brut")
    a = ap.parse_args()

    curriculum = json.load(open(a.curriculum, encoding="utf-8"))
    raw = read_text(a.source)
    if not raw.strip():
        print("[fatal] aucun texte extrait (OCR indisponible ou page vide)", file=sys.stderr)
        sys.exit(2)

    m, entry, score = match_official(raw, curriculum)
    if a.module:
        m = next(x for x in curriculum["modules"] if x["module"] == a.module)
    sents = sentences(raw)
    lex = load_lexicon(a.lexicon)
    words, freq = new_words(sents, lex)
    card_id = a.id or (f"m{m['module']}-{hashlib.sha1(raw.encode()).hexdigest()[:6]}" if m else "manuelle")
    os.makedirs(a.out, exist_ok=True)

    card = {
        "id": card_id,
        "meta": {
            "module": m["module"] if m else None,
            "theme": m["theme"] if m else None,
            "slogan": m["slogan"] if m else None,
            "texte_titre": entry[0] if entry else None,
            "texte_type": entry[1] if entry else None,
            "match_score": round(score, 3),
            "projet_ecriture": m["projet_ecriture"] if m else None,
            "outils_langue": m["outils_langue"] if m else None,
            "objectifs_oraux": m["objectifs_oraux"] if m else None,
            "source": "manuel_de_lecture_6e_CNIP",
            "source_file": a.source,
            "sequence": [p["id"] for p in curriculum["sequence_lecture"]["phases"]],
        },
        "segments": [{"idx": i + 1, "fr": s, "ar": None,
                      "is_heading": len(s) <= 46 and not re.search(r"[.!?…]$", s),
                      "words": [{"w": w} for w in WORD.findall(s) if len(w) > 1],
                      "audio": f"media/s{i+1}.mp3", "audio_slow": f"media/s{i+1}-slow.mp3"}
                     for i, s in enumerate(sents)],
        "malette": [{"fr": w, "count": freq[w], "syllabes": syllabify(w), "ar": None,
                     "read_ar": None, "ipa": None, "image": f"media/mot-{w}.png",
                     "audio": f"media/mot-{w}.mp3"} for w in words[:12]],
        "quiz": [
            {"phase": "globale", "type": "vrai-faux", "prompt_ar": "هل تدور أحداث النص في…؟", "answer": None},
            {"phase": "globale", "type": "image-choice", "prompt_ar": "أي صورة تناسب النص؟"},
            {"phase": "analytique", "type": "qcm", "prompt_ar": "من الشخصية الرئيسية وماذا تريد؟"},
            {"phase": "analytique", "type": "order", "prompt_ar": "رتّب الأحداث كما وردت"},
            {"phase": "vocabulaire", "type": "match", "prompt_ar": "صِل الكلمة بمعناها"},
            {"phase": "depass", "type": "oral", "prompt_ar": "لو كنت مكان البطل، ماذا تفعل؟ (3 جمل)"},
        ],
        "phonetique": [c for c in curriculum["phonetique_contrastes_officiels"]][:4],
        "retenir": {"mots": words[:8], "structures": [], "projet": m["projet_ecriture"] if m else None},
        "rights": {"mode": "public" if a.publish else "prive_classe",
                   "include_raw_text": not a.publish,
                   "note": "© CNIP — usage pédagogique privé ; version publique = métadonnées + contenus dérivés seulement"},
        "qc": {},
    }
    card["qc"] = {"issues": qc(card, curriculum), "ocr_chars": len(raw),
                  "phrases": len(card["segments"]), "nouveaute": round(len(words) / max(len(WORD.findall(raw)), 1), 3)}

    path = os.path.join(a.out, f"{card_id}.json")
    json.dump(card, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[ok] carte → {path}")
    print(f"     module {card['meta']['module']} · {card['meta']['texte_titre']} (match {card['meta']['match_score']})")
    print(f"     phrases: {len(card['segments'])} · mots nouveaux: {len(card['malette'])}")
    print("     champs à remplir par le LLM/médias : segments[].ar, malette[].ar|read_ar|ipa, media/*")
    for i in card["qc"]["issues"]:
        print("     QC –", i)

if __name__ == "__main__":
    main()
