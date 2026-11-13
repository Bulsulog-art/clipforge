# DentVideo script quality

The goal: a dentist reads a script and thinks *"that is exactly how I would explain it, but better."* That means native, warm and accurate, with a hook that lands in the first two seconds and one clear takeaway. It must follow each market's health-advertising rules, contain no generic AI filler, and not repeat itself week to week.

This page covers the rubric, how the current output scores against it, what was changed, and how to measure it, both offline for free and live with a spend cap.

Code: `worker/src/dental/` — `rubric.ts` (the rubric), `style.ts` (shared checks), `examples.ts` (reference scripts), `memory.ts` (anti-repetition), `calendar.ts` (seasonal hooks), `offline-eval.ts`, `eval.ts` (live eval), `fixtures/`.

## The rubric

Each script is scored 1–5 on seven dimensions. The deterministic version in `rubric.ts` starts every dimension at 5 and subtracts each finding's severity: 1 minor, 2 major, 4 blocker.

| Dimension | 5 looks like | What the code checks |
|---|---|---|
| **Hook** | A specific moment, mistake, myth ("…? Not quite.") or surprising fact that opens a question and lands in ~2 s | "Did you know" openers in 10 languages; textbook questions ("What is X?", "X nasıl yapılır?", "Wie funktioniert…?"); listicles; "Topic: description" labels; a flat "No!"; a closed statement that gives the answer away (a number and no tension); length over the language's limit or its ~2-second budget; a slow first narration sentence |
| **Clarity** | One takeaway, 2–4 scenes that serve it, 22–45 s of speech | More than 8 points on screen; more than 7 scenes; lists of more than 4 items; on-screen lines too long to read; two statements in a row; spoken length estimated per language (`SPOKEN_RATE`) |
| **Accuracy** | Mainstream guidance, hedged where outcomes vary, nothing the screen does not say | Invented percentages; salt-water rinses in a root-canal script; medication advice that does not defer to the dentist; effects stated as certain ("korur.", "schützt", "protege"); narration or caption adding numbers that are not on screen. *The LLM clinical reviewer still does the real work here.* |
| **Native** | Sounds like a dentist talking in that language, not a translated leaflet | AI filler per language ("Daha fazla bilgi için", "Ihr Lächeln ist uns wichtig", "Tu salud bucal es clave", "don't hesitate to"…); written-register markers ("gerçekleştirilir", "-mektedir", "erfolgt", "se lleva a cabo"); stock openers ("Wissen Sie was?", "Pues mira…"); narration that reads the screen aloud; the same word four or more times; monotone sentence lengths; formal and informal address mixed |
| **Compliance** | Passes the hard rules and the market's own rules | `scanHardRules` (guarantees, absolutes, superlatives, prices, before/after, testimonials, cures) as blockers; fear framing; diagnosing the viewer ("necesitas endodoncia"); "uzman" specialist claims (TR); COFEPRIS legends (MX) |
| **CTA** | One calm, specific closing line that is legal in the market | Missing; urgency ("hemen", "jetzt", "ya mismo", "now"); exclamation mark; generic "for more information, contact us"; **in Türkiye, any steering to the clinic** ("randevu alın", "bize ulaşın", "kliniğimiz"), because RG 33075 allows information only |
| **Variety** (per week, and against history) | Every video opens and closes differently; shapes and services spread; nothing repeats past weeks | Closing line or narration opener repeated in the week; same hook opening; more than 60% plain-question hooks; more than 2 videos on one service; near-duplicate titles in the week or with the clinic's history |

Several things are left to the LLM judge and the dentist's approval: whether a hook is *delightful*, whether the body actually answers the hook, and contradictions inside a script. Hand grading caught each of these (see below), and none can be checked reliably with patterns.

## Baseline: 30 existing scripts

These are all 15 scripts in production `dentvid_items` (TR, DE and ES test clinics, week of 2026-11-02) plus the 15 TR/DE/ES preview plans in `web/public/dentvideo/preview/`. They are in `worker/src/dental/fixtures/baseline-scripts.json`. The preview plans have no narration in their JSON, so narration checks are skipped for them.

**Hand grades.** I graded all 30 by reading them, before any automatic score existed. The grades and a one-line reason for each are in `fixtures/baseline-grades.json`.

| | Hook | Clarity | Accuracy | Native | Compliance | CTA | Mean |
|---|---|---|---|---|---|---|---|
| Hand (30 scripts) | 2.77 | 2.93 | 3.80 | 3.03 | 4.43 | 2.80 | **3.29** |

**Automatic rubric** (`npx tsx src/dental/offline-eval.ts`):

| Language | Scripts | Overall | Hook | Clarity | Accuracy | Native | Compliance | CTA | Variety |
|---|---|---|---|---|---|---|---|---|---|
| all | 30 | **4.12** | 4.07 | 4.53 | 4.80 | 3.70 | 4.90 | 3.83 | 3.03 |
| tr | 11 | 3.77 | 3.36 | 4.91 | 4.45 | 3.45 | 4.82 | 2.82 | 2.55 |
| de | 9 | 4.21 | 4.44 | 4.67 | 5.00 | 3.89 | 5.00 | 3.89 | 2.56 |
| es | 10 | 4.44 | 4.50 | 4.00 | 5.00 | 3.80 | 4.90 | 4.90 | 4.00 |

The automatic rubric agrees with the hand grades at Pearson r = 0.71 overall: hook 0.73, CTA 0.80, compliance 0.67, native 0.47. It barely tracks clarity (0.08) and accuracy (0.22). Those failures are semantic (a hook the body never answers, a script that contradicts itself), so they stay with the judge and the clinical reviewer. The rubric is also more lenient than a human, 4.12 against 3.29: it measures the absence of known failures, not excellence.

### What was wrong

These are the most frequent findings across the 30 scripts:

1. **The same closing everywhere.** 25 of 30 scripts share a closing-line opening with another video in their week: all 5 Turkish DB scripts and 4 of 6 Turkish previews end with "Daha fazla bilgi için … iletişime geçin / randevu alın", and 4 of 5 German DB scripts with "Haben Sie Fragen? Kontaktieren Sie uns…".
2. **Turkish CTAs steer viewers to the clinic** (10 scripts). RG 33075 allows informative content only, and the old prompt *asked* for "book a check-up".
3. **Stock openers copied from the prompt.** The narrator's spoken-language cues listed example phrases, and the model used them verbatim. Four of five German narrations open with "Wissen Sie…" (two with "Wissen Sie was?"), and three of five Spanish narrations lean on "(Pues) mira, …" ("Pues mira, la verdad es que…", "Mira, la verdad es que…", "Pues mira, no es…"). In total, 15 scripts share an opener with another video in their week.
4. **AI filler** (13 scripts): "Tu salud bucal es clave", "¡Estamos aquí para ayudarte!", "Es un viaje hacia tu nueva sonrisa", "Ihr Lächeln ist uns wichtig", "oldukça önemlidir".
5. **Hooks that close the loop or are labels**: "Diş implantı süreci 3 aşamada gerçekleşir.", "Diş taşı temizliği genellikle yılda 1 veya 2 kez önerilir.", "Ihr Implantat: Ein Prozess in mehreren Schritten.", "Blanqueamiento: ¿causa sensibilidad o es un mito?". There is also an ungrammatical German one, "Ihre Zahnreinigung alle 6 Monate wichtig?".
6. **Narration that reads the screen aloud** (5 scripts): four Turkish DB scripts, where 67–100% of narration sentences are on-screen lines, and one Spanish script.
7. **Things only a human caught.** One Spanish script contradicts itself: the footage caption says "No cepilles inmediatamente después", while a statement says "no hay necesidad de esperar". One Turkish script gives implant lifespan as "10-15 yıl" under a "10 yıl ve daha fazlası" hook. A German one says aligners are changed "um die nächsten Schritte zu planen". Several hooks promise something the body never returns to.

## What changed

- **Reference scripts** (`examples.ts`): six hand-written scripts for the launch markets (TR ×2, ES Spain, ES Mexico with *usted*, DE *Sie*, DE *du*), plus a hook bank in all 10 languages. The planner and the narrator see one example in the clinic's language, on a different service from the video's, and are told never to reuse its subject or sentences. The tests require every example to pass the hard rules and score 5/5 on the rubric.
- **One takeaway.** The strategist now returns a `takeaway` per topic (optional in the schema, so stored topics still parse). The script brief and the narrator build on it, and anything that does not serve it stays out.
- **Spoken cues rewritten** (`narrate.ts`). They describe the register instead of listing phrases to copy, and they ban the stock openers by name.
- **CTA per market** (`style.ts ctaGuide`). In Türkiye the closing line only informs ("…bir sonraki kontrolünüzde hekiminize sorabilirsiniz"). Everywhere else it is one calm, topic-specific sentence with no urgency, no "!" and no generic "contact us".
- **Anti-repetition** (`memory.ts`):
  - Topics too close to the clinic's history (title, question or hook) are dropped before any money is spent writing them, but never so many that the week falls short.
  - The strategist is told which services went uncovered in the last four weeks and which were overused, plus the recent hooks and hook shapes.
  - Each video in a week is told how the earlier ones opened and closed.
- **Hook editor**: deterministic filtering and balancing, with no extra call. Candidates with a blocking hook problem are never chosen. If more than half the chosen hooks are plain questions, a question is swapped for that topic's best non-question candidate scoring within one point.
- **Seasonal hooks** (`calendar.ts`): World Oral Health Day; TR Ağız ve Diş Sağlığı Haftası and 22 Kasım; 23 Nisan; DE Tag der Zahngesundheit; MX Día del Niño and Regreso a clases; Ramadan and Eid 2026–2028; Easter (computed); back to school; Halloween; the holidays; the new year. Dates follow the site's market calendars (`web/src/content/guides/calendar*.ts`). At most one video a week may use one, and only educationally.
- **Deterministic post-check** (`week.ts scriptProblems`). It runs before the paid reviewers and sends a draft back with exact fixes if it finds any of:
  - a blocking hook problem;
  - urgency in the CTA, or steering in Türkiye;
  - AI filler;
  - narration longer than 60 s;
  - narration numbers that are not on screen;
  - a clinical flag;
  - mixed forms of address.

### Expected after

The live effect can only be measured with a live run. There are two offline bounds, both computed from the baseline findings:

| | Overall | Hook | Native | CTA | Variety |
|---|---|---|---|---|---|
| Baseline | 4.12 | 4.07 | 3.70 | 3.83 | 3.03 |
| Post-checks alone (findings the post-check makes unshippable) | 4.34 | 4.53 | 4.40 | 4.17 | 3.03 |
| Post-checks + prompts working as intended | 4.87 | 4.80 | 4.90 | 5.00 | 4.83 |

The first row is guaranteed for the classes it covers: a script containing them cannot pass the post-check, so it is rewritten or rejected. The second row is a target. On the judge's scale, I expect hook and voice to rise from the 3.9/3.5 recorded in `AUTONOMOUS_PLAN.md`, mainly through native examples and the end of stock openers. Treat that as a hypothesis for the live eval, not a result. One risk to watch: round 8 in `AUTONOMOUS_PLAN.md` removed an example hook the model kept cloning into topics. The reference examples are therefore chosen on a different service from the video's, and every prompt says not to reuse their subject or wording. Still, check the live run for scripts that echo an example.

**Spend:** the extra prompt text (one example, the CTA guide and week memory) adds roughly 600 input tokens per planner call and 300 per narrator call. That is about $0.001–0.002 per video, against the $0.034 per ready video recorded in `AUTONOMOUS_PLAN.md`. Post-check rewrites cost a planner and narrator call each. They replace reviewer rewrites that would otherwise happen later and cost more, but the live eval should confirm the first-pass rate.

## How to measure

**Offline (free, no key):**

```bash
cd worker
npx tsx src/dental/offline-eval.ts                 # baseline + reference examples, summary
npx tsx src/dental/offline-eval.ts --full          # every script with its findings
npx tsx src/dental/offline-eval.ts --fixtures dental-eval/scripts.json --out dental-eval   # re-grade a live run
OPENAI_API_KEY=x npx vitest run src/dental         # includes the baseline snapshot (4.12) and examples = 5/5
```

**Live (one command, hard spend cap):**

```bash
cd worker
OPENAI_API_KEY=sk-… npx tsx src/dental/eval.ts --only tr,es,de --per 5 --max-usd 3 --out dental-eval
npx tsx src/dental/offline-eval.ts --fixtures dental-eval/scripts.json --out dental-eval
```

`--max-usd` defaults to 5. Every chat call is metered, the judge's included, and once the bill reaches the cap no further call is made. The clinics still running stop, and the report covers what finished; calls already in flight can overshoot the cap by cents. The eval refuses to start a call for a model without a price in `eval.ts PRICES`, because then the cost could not be capped.

At the recorded $0.034 per ready video, 15 videos come to about $0.50 plus the judge, well under a $3 cap. The full 10-language panel (`--per 4`, 40 videos) is about $2. The report adds `rubric` and `variety` columns next to ready rate, first pass, hook and voice. `scripts.json` holds every ready script in fixture form, so the run can be re-graded for free after any rubric change.

## Follow-ups outside this change

- ~~`jobs.ts` passes only past titles~~ — done in round 2 (below).
- Calibrate `SPOKEN_RATE` (`style.ts`) against real voice-over durations from a rendered week.
- Extend `RAMADAN` in `calendar.ts` past 2028.
- Native speakers should review the TR/ES/DE reference scripts once. They were written to native standard, but a dentist in each market is the final judge.

## Round 2 (Nov 2026): a real week for three clinics

Three fixed clinics, one small week each (3 videos, full production chain, no render), reviewed by hand as a native speaker would:

- **TR** — implant clinic in İstanbul (İmplant, kemik tozu/sinüs kaldırma, tek seansta implant, diş eti, zirkonyum), formal.
- **DE** — prophylaxis and aligner practice in München (PZR, Aligner, Parodontitis-Prophylaxe, Kinderprophylaxe, Bleaching), formal.
- **EN-GB** — family practice in Reading (check-ups, children, hygienist, fillings, emergencies), informal.

Each clinic has a few weeks of made-up history (titles, hooks, services, weeks). The bench is `worker/src/bench/quality-week.ts`, with a spend ledger shared across runs.

### Human rubric (8 dimensions, 1–5)

| Dim | 5 | 1 |
|---|---|---|
| Accuracy | Mainstream, hedged, gives the *main* clinical reason | Wrong, unsafe or contradictory |
| Hook (first 2 s) | Names the subject in patient words, opens a loop, makes sense heard once | Confusing, ambiguous, or gives the answer away |
| Naturalness | A dentist talking: spoken register, no translationese, no tics, sentences short enough for TTS | Garbled or translated |
| One message | One concrete takeaway the viewer can repeat; every scene serves it | "It depends", or several competing points |
| CTA | Calm, specific to this video, legal in the market, unlike the week's other closings | Urgent, salesy, or steering (TR) |
| Compliance | Nothing a regulator could flag in screen, narration **and** caption | A hard violation |
| Length | Narration fits the plan (±15%), 20–40 s; lines readable in 3–4 s; ≤ 6–7 scenes | Walls of text |
| Repetition | No line said twice, no recap, caption adds rather than repeats; no repeat of history or the week | The same point 3+ times; repeats a past video |

### Before (main, history = past titles only, as `jobs.ts` passed it)

| | Accuracy | Hook | Natural | Message | CTA | Compliance | Length | Repetition | **Mean** |
|---|---|---|---|---|---|---|---|---|---|
| TR (3) | 3.67 | 2.33 | 2.00 | 3.00 | 3.33 | 4.33 | 2.67 | 2.00 | **2.92** |
| DE (3) | 3.00 | 2.67 | 2.33 | 3.67 | 4.00 | 5.00 | 3.00 | 2.00 | **3.21** |
| EN-GB (3) | 4.00 | 3.00 | 3.67 | 3.67 | 3.00 | 5.00 | 3.33 | 2.33 | **3.50** |

What a harsh native reader saw (the automatic rubric scored the same scripts 4.5–4.9, because it did not yet look for most of this):

1. **Every script repeated itself.** The takeaway appeared as a statement, again in a 150-character line, then once more in a closing "Kısaca / Kısa cevap / Kurz gesagt / What to do / Why they matter" list (7 of 9 scripts). The DE aligner script said "only water" four times.
2. **All three Turkish closings were the prompt's example, word for word** ("Merak ettiğiniz bir şey varsa bir sonraki kontrolünüzde hekiminize sorabilirsiniz."). All three English closings named the clinic.
3. **Turkish captions steered to booking** ("kontrol randevusu planlayabilirsiniz", "muayene planlayabilirsiniz"): the caption writer was told to "end with a soft call to book a check-up" in every market, against RG 33075. Each TR shoot card also needed 1–3 compliance rewrites for the same reason.
4. **Tics taught by the prompt**: the Turkish spoken cues listed "değil mi?", and two of three narrations ended a claim with "…, değil mi?". The German one answered its hook with a bare "Nein."
5. **Hooks that do not parse on first hearing**: "Filmlerde görülen eksik kemik, herkeste aynı çıkmaz." ("film" = X-ray or movie), "Diese ersten 24 Stunden nach dem Bleaching…", "Bleeding when you brush? Keep going there?".
6. **"It depends" takeaways**: all three Turkish videos concluded that it varies by person and the dentist decides, which teaches nothing.
7. **Translationese**: "Kaffee pausiert also kurz", "bölge sakin görünüyorsa", "Yumuşak başlama: kontrollü çiğneme olur".
8. **Accuracy gaps**: the aligner video gave staining and "material stress" as the reasons for water-only, and missed the main one (sugar or acid held against the teeth under the tray). The bleaching video said "the first hours" on screen and "24 to 48 hours" in the narration.
9. **Narration ran 21–33% longer than the plan** in DE and EN, so the render stretched every video to the voice.
10. **History was never used**: `jobs.ts` read `select("title")` with no order, so the strategist's memory never saw hooks, services or weeks. The three TR topics were all "implant, it depends on your bone".

Replaying the before scripts through the new post-checks: **9 of 9 would have been sent back**, each with an exact fix (`postcheck-before` in the run folder).

### What changed (root causes, not outputs)

- **History wired** (`dentvid/jobs.ts`, `memory.ts historyFromRows`): the job reads `title, topic, week_of, status`, newest weeks first, and passes `history` (oldest first, rejected and failed rows left out, every jsonb field checked) to `produceWeek`. The top-up passes the same history plus this week's usable videos. Titles still feed the repeat filter.
- **Say it once** (`style.ts repeatedScreen`, brief): recap headings and body lines that restate each other are sent back. So are lines over 110 characters and more than 7 scenes. The brief bans recaps and bare "No." answers.
- **Fresh closings** (`ctaGuide`, `ctaTemplates`): the guide describes the move instead of giving a sentence to copy. A closing that echoes a template or an earlier closing of the week, or that names the clinic, is sent back.
- **Türkiye: information only, everywhere** (`trSteering`, `captionProblems`, copywriter, shoot card): booking verbs in every polite form are caught in the closing, narration and caption. The TR caption and shoot card now point to the viewer's own dentist, and TR captions get no booking link. Elsewhere, captions may not paste the narration.
- **Spoken cues describe, never list** (`narrate.ts`): no tag questions, no bare "No.", a sentence-length cap for TTS (12 words TR/DE, 15 otherwise), a word ceiling of target +10%, and never the clinic's name.
- **Strategist and hook editor**: a hook must make sense heard once and name its subject. A takeaway must be something to do, notice or know, never "it depends". No urgency topics.
- **Clinical guide**: aligners (water only, and why), implant healing before full load.
- **UK** (`locale.ts`): CAP Code / GDC rules for GB, which had none, and the market's variety of the language (British English for GB/IE, Swiss German without ß, pt-PT/pt-BR). The site's rules badges gain the UK.
- **Pronunciation**: tts-1-hd has no SSML or lexicon, so the lexicon is the respelling table in `speech-text.ts`. A TTS → transcription round trip (18 clips) showed that only "PZR" failed ("Eine PZR dauert…" was heard as "Dann passiert er…"). PZR and KFO are now spelled out. Aligner, Bleaching, Veneers, All-on-4, E.max and the Turkish terms were read correctly as written, and respelling made them worse, so they stay as written.
- **Rubric** sees the new failure classes (`repeats_itself`, `spoken_tic`, `caption_copies_narration`, `tr_steering`, `cta_template`, `cta_names_clinic`). The baseline snapshot moves from 4.12 to 4.01, and agreement with the hand grades stays at r = 0.70.

### After: partial, because the OpenAI org ran out of credits

The re-run of the same three weeks stopped on `insufficient_quota` / `credit_balance_exhausted` (it was the org's balance, not this run's $3 cap: the ledger was at $0.66). The strategist and hook editor had already finished for all 15 planned topics. Every script, narration and caption call failed. So the *planning* layer can be compared, and the writing layer cannot yet:

| | Hook (planned, human 1–5) | Services covered by the planned topics |
|---|---|---|
| TR | 2.33 → **3.6** | 3 implant-side topics → **5 topics on 5 different services** |
| DE | 2.67 → **3.6** | 3 → 4 services, skipping PZR (covered in history) |
| EN-GB | 3.00 → **3.8** | 3 → 5, including the two never covered in history |

New hooks include "Zirkonyumdan sonra ilk yudum neden sızlar?", "Diş eti çekilmesinin tek nedeni fırça değil.", "Feste Zähne täuschen bei Parodontitis oft." and "That pink in the sink after brushing…". Still weak: "Diese kleinen Erhebungen bei Alignern stören viele." (a dangling "Diese"), and two TR takeaways that still lean on "değişir". One EN takeaway pushed urgency ("book it before…"); the "no urgency topics" rule was added after that run.

To finish the comparison once the org has credits (about $0.40–0.60 at the measured cost):

```bash
cd worker
OPENAI_API_KEY=… npx tsx src/bench/quality-week.ts --out ../qw/after --ledger ../qw/ledger.json --label after --memory full
OPENAI_API_KEY=… npx tsx src/bench/quality-week.ts --out ../qw/before --ledger ../qw/ledger.json --label before --memory titles   # on main, for the baseline
```
