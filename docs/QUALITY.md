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

- `worker/src/dentvid/jobs.ts` passes only past **titles** (`select("title")`). Selecting `title, topic, week_of` and passing `history: rows.map(r => ({ title: r.title, ...r.topic, weekOf: r.week_of }))` to `produceWeek` would turn on the full memory: hooks, services and the four-week window. Titles alone already drive the repeat filter.
- Calibrate `SPOKEN_RATE` (`style.ts`) against real voice-over durations from a rendered week.
- Extend `RAMADAN` in `calendar.ts` past 2028.
- Native speakers should review the TR/ES/DE reference scripts once. They were written to native standard, but a dentist in each market is the final judge.
