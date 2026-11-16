#!/usr/bin/env python3
"""Re-checks every DentVideo Google Ads import file in this folder.

Checks: character limits (Google counting: wide/full-width chars = 2), forbidden words
(superlatives, guarantees, urgency, discount/free words, legal-certainty and law-naming),
"!" anywhere, prices and currency per market against the live site, campaign settings,
keyword hygiene, negative-vs-keyword conflicts, budget cap, Final URL suffix slug rule,
and that every Final URL (bare and with the suffix) returns HTTP 200 on dentvideo.com.

2026-11-16: allowed prices are read from web/src/lib/dentvid/pricing.ts (no hard-coded list), every
"from" price must be the lowest (Starter) price, budgets and Max CPCs are checked in EUR (account
currency), 4-8 sitelinks per campaign, and the owner-facing docs (LAUNCH.md, ../RUNBOOK.md,
../listings, ../profile) are scanned for retired prices and stale conversion values.

Usage: python3 -I validate.py [--offline] [path/to/pricing.ts]      Exit code 0 = all checks passed.
"""
import csv, glob, os, re, ssl, sys, unicodedata, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", "..", "..", ".."))
OFFLINE = "--offline" in sys.argv
errors, warnings, info = [], [], []

def load(name):
    with open(os.path.join(HERE, name), encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def glen(s):
    return sum(2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1 for ch in s)

def norm(s):
    return s.replace("İ", "i").lower()

MARKET = {"tr-search-core": "TR", "de-search-core": "DE", "us-search-test": "US"}
CHECKER_ADGROUPS = {"TR-3 Reklam kuralları", "DE-3 Werberecht"}
# List prices from the source of truth, web/src/lib/dentvid/pricing.ts (DV_LIST_PRICES).
PRICING_TS = next((a for a in sys.argv[1:] if a.endswith(".ts")),
                  os.path.join(REPO, "web", "src", "lib", "dentvid", "pricing.ts"))
def load_prices(path):
    src = open(path, encoding="utf-8").read()
    block = re.search(r"DV_LIST_PRICES[^=]*=\s*\{(.*?)\n\};", src, re.S)
    out = {}
    for tier, body in re.findall(r"(\w+)\s*:\s*\{([^}]*)\}", block.group(1) if block else ""):
        out[tier] = {c: int(v) for c, v in re.findall(r"(USD|EUR|TRY)\s*:\s*(\d+)", body)}
    if set(out) != {"starter", "practice"} or any(set(v) != {"USD", "EUR", "TRY"} for v in out.values()):
        raise SystemExit("cannot read DV_LIST_PRICES from %s: %r" % (path, out))
    return out
PRICES = load_prices(PRICING_TS)
def _tl(n): return "{:,}".format(n).replace(",", ".") + "TL"
ALLOWED_PRICES = {"TR": {_tl(p["TRY"]) for p in PRICES.values()},
                  "DE": {"%d€" % p["EUR"] for p in PRICES.values()},
                  "US": {"$%d" % p["USD"] for p in PRICES.values()}}
LOWEST = {"TR": _tl(min(p["TRY"] for p in PRICES.values())),
          "DE": "%d€" % min(p["EUR"] for p in PRICES.values()),
          "US": "$%d" % min(p["USD"] for p in PRICES.values())}
FROM_RE = re.compile(r"(\bfrom\b|\bab\b|'den başlar|'dan başlar|başlayan)", re.I)
info.append("Prices from %s: %s" % (os.path.relpath(PRICING_TS, REPO), PRICES))
# Account currency is EUR; plan caps are in USD and converted at the ECB rate of 2026-11-16.
USD_PER_EUR = 1.1014
PRICE_RE = re.compile(r"(\$\s?\d[\d.,]*\d|\$\s?\d|\d[\d.,]*\s?\$|€\s?\d[\d.,]*|\d[\d.,]*\s?€|\d[\d.,]*\s?(?:TL|₺)(?![A-Za-zçğıöşü])|\b(?:USD|EUR|TRY)\b)")

FORBIDDEN = {
    "superlative": [r"\ben iyi", r"\ben ucuz", r"\ben uygun", r"\ben hızlı", r"\ben kaliteli", r"\ben güven",
                    r"\blider", r"\bbir numara", r"\b1 numara", r"\beşsiz", r"\bmükemmel", r"\bbenzersiz",
                    r"\bbeste[nrms]?\b", r"\bgünstigste", r"\bführend", r"\bnr\.? ?1\b", r"\beinzigartig",
                    r"\bperfekt", r"\bmarktführer", r"\bbest\b", r"#1", r"\bnumber one\b", r"\bleading\b",
                    r"\bcheapest\b", r"\bfastest\b", r"\bultimate\b", r"\bunbeatable\b", r"\bworld-class\b"],
    "guarantee": [r"garanti", r"\bkesin sonuç", r"%\s?100", r"100\s?%", r"garantiert", r"garantie", r"guarantee",
                  r"risikolos", r"risk-free", r"schmerzfrei", r"acısız", r"ağrısız", r"painless"],
    "urgency": [r"\bson gün", r"\bsınırlı", r"\bhemen\b", r"\bacele", r"\bkaçırma", r"\bşimdi\b", r"\bbugün\b",
                r"\bson fırsat", r"\bjetzt\b", r"\bnur heute", r"\bbegrenzt", r"\bsofort\b", r"\bletzte chance",
                r"\bnow\b", r"\btoday only", r"\blimited\b", r"\bhurry", r"\blast chance", r"\bact fast",
                r"\bdon't miss", r"\bends soon"],
    "discount": [r"indirim", r"\bkampanya", r"\bkupon", r"promosyon", r"\bfırsat", r"\bbedava", r"\bhediye",
                 r"deneme süresi", r"\brabatt", r"gutschein", r"\baktion", r"\bangebot", r"\bspar", r"\bgratis",
                 r"probemonat", r"testphase", r"discount", r"coupon", r"\bpromo", r"\bdeal\b", r"\bsave\b",
                 r"\btrial\b", r"\d\s?%", r"%\s?\d", r"\boff\b", r"\bsale\b"],
    "legal-certainty": [r"\byasal\b", r"yasal güvence", r"yönetmeliğe uygun", r"mevzuata uygun", r"\buygun\b",
                        r"\bhukuken", r"güvence", r"rechtssicher", r"abmahnsicher", r"konform", r"rechtlich sicher",
                        r"compliant", r"\blegally\b", r"\blegal\b", r"hipaa", r"\bftc\b", r"\bapproved\b",
                        r"certified", r"zertifiziert", r"sertifikalı"],
    "law-named-as-checked": [r"\bhwg\b", r"heilmittelwerbegesetz", r"berufsordnung", r"yönetmeli", r"33075", r"\bzäg\b"],
}
FREE_WORDS = [r"ücretsiz", r"kostenlos", r"kostenfrei", r"\bfree\b"]

def scan(text, where, allow_free=False):
    t = norm(text)
    if "!" in text:
        errors.append("%s: contains '!': %r" % (where, text))
    for cat, pats in FORBIDDEN.items():
        for p in pats:
            if re.search(p, t):
                errors.append("%s: forbidden (%s) /%s/: %r" % (where, cat, p, text))
    if not allow_free:
        for p in FREE_WORDS:
            if re.search(p, t):
                errors.append("%s: 'free' word outside the ad-checker context: %r" % (where, text))

def prices(text, market, where):
    found = [re.sub(r"\s", "", m) for m in PRICE_RE.findall(text)]
    for tok in found:
        if tok not in ALLOWED_PRICES[market]:
            errors.append("%s: price/currency %r not allowed in %s (allowed: %s): %r"
                          % (where, tok, market, sorted(ALLOWED_PRICES[market]), text))
    # a "from …" price must be the lowest list price (Starter)
    if found and FROM_RE.search(norm(text)) and found[0] != LOWEST[market]:
        errors.append("%s: 'from' price %r is not the lowest list price %r: %r" % (where, found[0], LOWEST[market], text))

def limit(text, n, where):
    if glen(text) > n:
        errors.append("%s: %d chars > %d: %r" % (where, glen(text), n, text))

urls = {}  # url -> where
SLUG = re.compile(r"^[a-z0-9][a-z0-9._-]{0,39}$")

# ------------------------------------------------------------------ campaigns
camps = load("1-campaigns.csv")
camp_names = {c["Campaign"] for c in camps}
monthly_ready = 0.0
for c in camps:
    n = c["Campaign"]; w = "campaign %s" % n
    if n not in MARKET: errors.append("%s: unknown market" % w)
    if c["Campaign Status"] != "Paused": errors.append("%s: must be Paused" % w)
    if c["Networks"] != "Google search": errors.append("%s: Networks must be 'Google search' only" % w)
    if c["Campaign Type"] != "Search": errors.append("%s: type must be Search" % w)
    if c["Bid Strategy Type"] != "Manual CPC": errors.append("%s: bid strategy must be Manual CPC" % w)
    if c["Targeting method"] != "Location of presence": errors.append("%s: targeting must be presence only" % w)
    if c["Budget type"] != "Daily": errors.append("%s: budget type must be Daily" % w)
    langs = set(c["Languages"].split(";"))
    want = {"TR": {"tr", "en"}, "DE": {"de", "en"}, "US": {"en"}}[MARKET.get(n, "US")]
    if langs != want: errors.append("%s: languages %s != %s" % (w, langs, want))
    q = urllib.parse.parse_qs(c["Final URL suffix"])
    camp_val = q.get("utm_campaign", [""])[0]
    if camp_val != n or not SLUG.match(camp_val):
        errors.append("%s: utm_campaign %r must equal the campaign name and match %s" % (w, camp_val, SLUG.pattern))
    if "{keyword}" in c["Final URL suffix"]: errors.append("%s: {keyword} must not be in the suffix" % w)
    for k in ("utm_source", "utm_medium"):
        if not SLUG.match(q.get(k, [""])[0]): errors.append("%s: %s fails slug rule" % (w, k))
    if n != "us-search-test":
        monthly_ready += float(c["Budget"]) * 30.4
CAP_EUR = 450 / USD_PER_EUR  # the plan's $450 month-1 cap in EUR (about 408.57)
if monthly_ready > CAP_EUR:
    errors.append("TR+DE max monthly spend EUR %.2f > cap EUR %.2f ($450)" % (monthly_ready, CAP_EUR))
info.append("Budgets (EUR): TR+DE daily %s; Google's monthly ceiling (daily x 30.4) = EUR %.2f (cap EUR %.2f = $450)"
            % (" + ".join(c["Budget"] for c in camps if c["Campaign"] != "us-search-test"), monthly_ready, CAP_EUR))

locs = load("2-locations.csv")
for n in camp_names:
    if not [l for l in locs if l["Campaign"] == n]: errors.append("campaign %s: no location" % n)

# ------------------------------------------------------------------ ad groups
ags = load("3-adgroups.csv")
CPC_CEIL = {k: round(v / USD_PER_EUR, 2) for k, v in {"TR": 0.80, "DE": 2.50, "US": 1.50}.items()}  # plan caps (USD) in EUR
ag_keys = set()
for a in ags:
    w = "ad group %s/%s" % (a["Campaign"], a["Ad Group"])
    ag_keys.add((a["Campaign"], a["Ad Group"]))
    if a["Campaign"] not in camp_names: errors.append("%s: campaign missing" % w)
    cpc = float(a["Max CPC"])
    if cpc <= 0 or cpc > CPC_CEIL[MARKET[a["Campaign"]]]:
        errors.append("%s: Max CPC %.2f outside (0, %.2f]" % (w, cpc, CPC_CEIL[MARKET[a["Campaign"]]]))

# ------------------------------------------------------------------ keywords + negatives
kws = load("4-keywords.csv")
BAD_KW_CHARS = set("!@%^*()={};~`<>?\\|")
seen = set()
for k in kws:
    w = "keyword %s/%s [%s]" % (k["Campaign"], k["Ad Group"], k["Keyword"])
    if (k["Campaign"], k["Ad Group"]) not in ag_keys: errors.append("%s: ad group missing" % w)
    if k["Criterion Type"] not in ("Exact", "Phrase"): errors.append("%s: match type %s not allowed" % (w, k["Criterion Type"]))
    if glen(k["Keyword"]) > 80 or len(k["Keyword"].split()) > 10: errors.append("%s: too long" % w)
    if BAD_KW_CHARS & set(k["Keyword"]): errors.append("%s: invalid character" % w)
    if k["Keyword"] != k["Keyword"].lower(): warnings.append("%s: not lowercase" % w)
    key = (k["Campaign"], k["Ad Group"], k["Keyword"], k["Criterion Type"])
    if key in seen: errors.append("%s: duplicate" % w)
    seen.add(key)

negs = load("6-negatives-campaign-adgroup.csv")
shared = load("7a-shared-negative-lists.csv")
links = load("7b-shared-list-campaign-links.csv")
neg_by = {}  # (campaign, adgroup or None) -> [neg]
for r in negs:
    if r["Criterion Type"] == "Campaign Negative Phrase":
        neg_by.setdefault((r["Campaign"], None), []).append((r["Keyword"], "campaign"))
    elif r["Criterion Type"] == "Negative Phrase":
        if (r["Campaign"], r["Ad Group"]) not in ag_keys: errors.append("negative %r: ad group missing" % r)
        neg_by.setdefault((r["Campaign"], r["Ad Group"]), []).append((r["Keyword"], "ad group"))
    else:
        errors.append("negative %r: unexpected criterion type" % r)
lists = {}
for r in shared:
    if r["Criterion Type"] != "Negative Phrase": errors.append("shared negative %r: must be Negative Phrase" % r)
    lists.setdefault(r["Shared set name"], []).append(r["Keyword"])
for l in links:
    if l["Shared set name"] not in lists: errors.append("link %r: list missing" % l)
    for kw in lists.get(l["Shared set name"], []):
        neg_by.setdefault((l["Campaign"], None), []).append((kw, l["Shared set name"]))

def tokens(s): return norm(s).split()
def phrase_in(neg, kw):
    n, k = tokens(neg), tokens(kw)
    return any(k[i:i + len(n)] == n for i in range(len(k) - len(n) + 1))
conflicts = 0
for k in kws:
    for scope in ((k["Campaign"], None), (k["Campaign"], k["Ad Group"])):
        for neg, src in neg_by.get(scope, []):
            if phrase_in(neg, k["Keyword"]):
                conflicts += 1
                errors.append("conflict: negative %r (%s) blocks keyword %r in %s/%s"
                              % (neg, src, k["Keyword"], k["Campaign"], k["Ad Group"]))

# ------------------------------------------------------------------ RSAs
ads = load("5-responsive-search-ads.csv")
per_ag = {}
for i, a in enumerate(ads, 2):
    mk = MARKET[a["Campaign"]]
    w = "RSA row %d (%s/%s)" % (i, a["Campaign"], a["Ad Group"])
    per_ag[(a["Campaign"], a["Ad Group"])] = per_ag.get((a["Campaign"], a["Ad Group"]), 0) + 1
    allow_free = a["Ad Group"] in CHECKER_ADGROUPS
    heads = [(j, a["Headline %d" % j], a["Headline %d position" % j]) for j in range(1, 16) if a["Headline %d" % j]]
    descs = [a["Description %d" % j] for j in range(1, 5) if a["Description %d" % j]]
    if len(heads) < 3 or len(descs) < 2: errors.append("%s: needs >=3 headlines and >=2 descriptions" % w)
    if len({h for _, h, _ in heads}) != len(heads): errors.append("%s: duplicate headline" % w)
    if len(set(descs)) != len(descs): errors.append("%s: duplicate description" % w)
    pinned = [p for _, _, p in heads if p]
    if any(p not in ("1", "2", "3") for p in pinned): errors.append("%s: bad pin value" % w)
    if len(pinned) >= len(heads): errors.append("%s: all headlines pinned" % w)
    for j, h, _ in heads:
        limit(h, 30, "%s H%d" % (w, j)); scan(h, "%s H%d" % (w, j), allow_free); prices(h, mk, "%s H%d" % (w, j))
    for j, d in enumerate(descs, 1):
        limit(d, 90, "%s D%d" % (w, j)); scan(d, "%s D%d" % (w, j), allow_free); prices(d, mk, "%s D%d" % (w, j))
    for p in ("Path 1", "Path 2"):
        limit(a[p], 15, "%s %s" % (w, p)); scan(a[p], "%s %s" % (w, p), allow_free)
    if (a["Campaign"], a["Ad Group"]) not in ag_keys: errors.append("%s: ad group missing" % w)
    urls.setdefault(a["Final URL"], set()).add(a["Campaign"])
for key in ag_keys:
    n = per_ag.get(key, 0)
    if not 1 <= n <= 3: errors.append("ad group %s/%s has %d RSAs (want 1-3)" % (key[0], key[1], n))

# ------------------------------------------------------------------ assets
sls = load("8a-sitelinks.csv")
by_c = {}
for s in sls:
    w = "sitelink %s/%r" % (s["Campaign"], s["Link Text"])
    by_c.setdefault(s["Campaign"], []).append(s["Final URL"])
    allow_free = "ad-checker" in s["Final URL"]
    limit(s["Link Text"], 25, w); scan(s["Link Text"], w, allow_free); prices(s["Link Text"], MARKET[s["Campaign"]], w)
    for d in ("Description Line 1", "Description Line 2"):
        limit(s[d], 35, w + " " + d); scan(s[d], w + " " + d, allow_free); prices(s[d], MARKET[s["Campaign"]], w)
    urls.setdefault(s["Final URL"], set()).add(s["Campaign"])
for c, us in by_c.items():
    if not 4 <= len(us) <= 8: errors.append("campaign %s: %d sitelinks (want 4-8)" % (c, len(us)))
    if len(set(us)) != len(us): errors.append("campaign %s: sitelink URLs not unique" % c)
    if any("#" in u for u in us): errors.append("campaign %s: sitelink URL with #fragment" % c)
for r in load("8b-callouts.csv"):
    w = "callout %s/%r" % (r["Campaign"], r["Callout text"])
    limit(r["Callout text"], 25, w); scan(r["Callout text"], w); prices(r["Callout text"], MARKET[r["Campaign"]], w)
for r in load("8c-structured-snippets.csv"):
    vals = r["Values"].split(";")
    if len(vals) < 3: errors.append("snippet %s: needs >=3 values" % r["Campaign"])
    for v in vals:
        w = "snippet %s/%r" % (r["Campaign"], v)
        limit(v, 25, w); scan(v, w); prices(v, MARKET[r["Campaign"]], w)

# ------------------------------------------------------------------ URLs
def ctx():
    for p in (os.environ.get("SSL_CERT_FILE"), os.environ.get("REQUESTS_CA_BUNDLE"), "/root/.ccr/ca-bundle.crt"):
        if p and os.path.exists(p):
            return ssl.create_default_context(cafile=p)
    return ssl.create_default_context()
CTX = ctx()
def fetch(u):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (url-check)"}, method="GET")
    with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
        return r.status, r.geturl()

url_report = []
if OFFLINE:
    warnings.append("URL checks skipped (--offline)")
else:
    sfx = {c["Campaign"]: c["Final URL suffix"].replace("{targetid}", "kwd-123").replace("{adgroupid}", "456")
           .replace("{creative}", "789") for c in camps}
    for u in sorted(urls):
        if not u.startswith("https://dentvideo.com"):
            errors.append("URL %s: not on https://dentvideo.com" % u); continue
        for c in sorted(urls[u])[:1]:
            for test in (u, u + ("&" if "?" in u else "?") + sfx[c]):
                try:
                    st, final = fetch(test)
                except Exception as e:
                    st, final = getattr(e, "code", "ERR %s" % e), ""
                host = urllib.parse.urlparse(final).netloc if final else ""
                ok = st == 200 and host == "dentvideo.com"
                url_report.append("%s %s%s" % (st, test, "" if final in ("", test) else "  -> " + final))
                if not ok: errors.append("URL %s returned %s (final %s)" % (test, st, final))

# ------------------------------------------------------------------ owner-facing docs
# Retired prices and conversion values must not appear in the docs the owner or the Mac session follows.
# ads-plan.md and ads-redteam.md are history (dated sections) and are not scanned.
RETIRED = [r"4\.490", r"\b149\s?€", r"€\s?149\b", r"\$\s?149\b", r"2\.490 TL'den", r"\bab 79\s?€", r"\bfrom \$79\b",
           r"\$\s?29\b", r"250 USD", r"dv_paid 250", r"\bGMT\+03:00\) İstanbul"]
docs = [os.path.join(HERE, "LAUNCH.md"), os.path.join(HERE, "..", "RUNBOOK.md")] + \
       sorted(glob.glob(os.path.join(HERE, "..", "listings", "*.md"))) + \
       sorted(glob.glob(os.path.join(HERE, "..", "profile", "*.*")))
for path in docs:
    if not os.path.exists(path):
        warnings.append("doc missing: %s" % os.path.relpath(path, HERE)); continue
    for n, line in enumerate(open(path, encoding="utf-8"), 1):
        for pat in RETIRED:
            if re.search(pat, line, re.I):
                errors.append("%s:%d: retired price/value /%s/: %s" % (os.path.relpath(path, HERE), n, pat, line.strip()[:120]))
# Conversion values in LAUNCH.md must match web/src/lib/dentvid/ad-conversions.ts
conv_src = open(os.path.join(REPO, "web", "src", "lib", "dentvid", "ad-conversions.ts"), encoding="utf-8").read()
m_sign = re.search(r"dv_signup:\s*\{\s*value:\s*(\d+)", conv_src)
m_paid = re.search(r"dv_paid:\s*\{\s*value:\s*(\d+)", conv_src)
m_tr = re.search(r'"TR"\s*\?\s*(\d+)\s*:', conv_src)
if not (m_sign and m_paid and m_tr):
    errors.append("cannot read conversion values from ad-conversions.ts")
else:
    launch = open(os.path.join(HERE, "LAUNCH.md"), encoding="utf-8").read()
    for v in (m_sign.group(1), m_paid.group(1), m_tr.group(1)):
        if "**%s USD**" % v not in launch:
            errors.append("LAUNCH.md does not state the conversion value **%s USD** (ad-conversions.ts)" % v)
    info.append("Conversion values (ad-conversions.ts): dv_signup %s USD, dv_paid %s USD (TR %s USD)"
                % (m_sign.group(1), m_paid.group(1), m_tr.group(1)))

# ------------------------------------------------------------------ report
print("DentVideo Google Ads import files: validation")
print("=" * 60)
print("Campaigns: %d | Ad groups: %d | Keywords: %d (exact %d, phrase %d) | RSAs: %d" % (
    len(camps), len(ags), len(kws), sum(k["Criterion Type"] == "Exact" for k in kws),
    sum(k["Criterion Type"] == "Phrase" for k in kws), len(ads)))
for c in sorted(camp_names):
    print("  %-16s ad groups %d, keywords %d, RSAs %d" % (
        c, sum(a["Campaign"] == c for a in ags), sum(k["Campaign"] == c for k in kws),
        sum(a["Campaign"] == c for a in ads)))
print("Negatives: campaign %d, ad group %d, shared lists %s, list links %d; conflicts %d" % (
    sum(r["Criterion Type"] == "Campaign Negative Phrase" for r in negs),
    sum(r["Criterion Type"] == "Negative Phrase" for r in negs),
    ", ".join("%s=%d" % (k, len(v)) for k, v in sorted(lists.items())), len(links), conflicts))
print("Assets: sitelinks %d, callouts %d, snippets %d" % (len(sls), len(load("8b-callouts.csv")), len(load("8c-structured-snippets.csv"))))
for line in info: print(line)
if url_report:
    print("\nURL checks (%d unique Final URLs, each bare and with the campaign suffix):" % len(urls))
    for line in url_report: print("  " + line)
print("\nWarnings: %d" % len(warnings))
for wmsg in warnings: print("  - " + wmsg)
print("Errors: %d" % len(errors))
for e in errors: print("  - " + e)
print("\nRESULT: %s" % ("PASS" if not errors else "FAIL"))
sys.exit(1 if errors else 0)
