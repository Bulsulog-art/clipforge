import type OpenAI from "openai";
import { planFromPrompt } from "../remotion/plan-from-prompt.js";
import { narrate } from "./narrate.js";
import { AGENT_MODEL } from "./llm.js";
import { guardFootage } from "./footage.js";
import { backgroundSrc, startingBackgrounds, suggestBackgrounds } from "../dentvid/backgrounds/suggest.js";
import { totalSeconds, type ScenePlan } from "../remotion/scene-plan.js";
import { AVOID_WORDS, reviewCompliance, type ComplianceResult } from "./compliance.js";
import { writePostCopy, type PostCopy } from "./copywriter.js";
import { addressRule, type ClinicProfile } from "./profile.js";
import { isUnspaced, marketRules, speechRate, speechTarget, speechUnits, variantRule } from "./locale.js";
import { voiceFor } from "./voice.js";
import { screenNotice, withCaptionNotice } from "./mandatory-notice.js";
import { planWeek, sharpenHooks, type Topic } from "./strategist.js";
import { AFTERCARE_GUIDE, reviewAccuracy, type AccuracyResult } from "./accuracy.js";
import { shootCardText, writeShootCard, type ShootCard } from "./shoot-card.js";
import { inspectVideo, type QaReport } from "../steps/qa.js";
import { exampleBlock, exampleFor } from "./examples.js";
import {
  BLOCKING_CTA,
  BLOCKING_HOOK,
  clinicalFlags,
  copiedShare,
  ctaTemplates,
  namesClinic,
  overlap,
  repeatedScreen,
  spokenTics,
  trSteering,
  ctaGuide,
  ctaProblems,
  linesEcho,
  fillerHits,
  hookProblems,
  NARRATION_SECONDS,
  numbersIn,
  spokenSeconds,
} from "./style.js";
import { mixedAddress, screenLines, type RubricScene } from "./rubric.js";
import { firstSentence, weekVoiceBrief, type PastTopic, type WeekVoice } from "./memory.js";
import { droppedHedges, notQuite, offRegister, practiceClaims, stackedHedges, wrongLanguage } from "./claims.js";

/**
 * The orchestrator: one clinic profile in, a week of ready-to-post videos out.
 *
 *   strategist → for each topic:
 *     scriptwriter (scene plan) → compliance ─┬─ pass ─→ copywriter → compliance → render
 *                                             ├─ revise → rewrite once with the fixes → compliance
 *                                             └─ block / still failing → dropped, with the reason
 *
 * The rule the whole system is built on: nothing reaches "ready" without a
 * passing compliance review of both the on-screen text and the caption.
 * Rendering is injected so the agents run (and are tested) without a GPU,
 * a browser or storage.
 */

export type VideoPackage =
  | {
      status: "ready";
      /** Nothing is published until the clinic's dentist approves it. */
      approval: "pending" | "approved" | "rejected";
      topic: Topic;
      plan: ScenePlan;
      /** Library photo ids for this video, best first; plan.backgrounds holds the chosen ones. */
      suggestedBackgrounds?: string[];
      copy: PostCopy;
      checks: { script: Checks; copy: Checks };
      /** How the dentist can film this topic themselves, in their language. */
      shootCard?: ShootCard;
      videoPath?: string;
      /** Measurements of the rendered file; issues mean "look before posting". */
      qa?: QaReport;
    }
  | {
      status: "rejected";
      topic: Topic;
      stage: "script" | "copy";
      reasons: string[];
      /** Set when it was not the reviewers but a technical failure (render, API, network) — never shown to the clinic. */
      error?: string;
    };

export type WeekDeps = {
  client: OpenAI;
  /** Renders a plan to a file and returns its path. Omit to plan only. */
  render?: (plan: ScenePlan, topic: Topic) => Promise<string>;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
  /** Real patient searches for the clinic's services (dental/questions.ts). Omit to plan without them. */
  searches?: (profile: ClinicProfile) => Promise<string[]>;
  /** Told about every technical failure of one video (counted for the owner's error-spike alert). */
  onVideoError?: (e: Error, topic: Topic) => void | Promise<void>;
};

/** A video that fails for a technical reason is tried this many times before its topic is given up. */
export const VIDEO_ATTEMPTS = 2;

/** Every word a viewer will read or hear in the video. */
export function planText(plan: ScenePlan): string {
  const out: string[] = [];
  for (const s of plan.scenes) {
    switch (s.kind) {
      case "hook":
        out.push(s.text, s.sub ?? "");
        break;
      case "statement":
      case "quote":
        out.push(s.text);
        break;
      case "list":
        out.push(s.heading, ...s.items);
        break;
      case "stat":
        out.push(`${s.value} ${s.label}`, s.context ?? "");
        break;
      case "compare":
        out.push(`${s.left.label}: ${s.left.text}`, `${s.right.label}: ${s.right.text}`);
        break;
      case "footage":
        out.push(s.caption ?? "");
        break;
      case "cta":
        out.push(s.text);
        break;
    }
  }
  if (plan.voiceover) out.push(plan.voiceover.text);
  return out.filter(Boolean).join("\n");
}

export function scriptBrief(profile: ClinicProfile, topic: Topic, fixes: string[] = [], week?: WeekVoice): string {
  const example = exampleFor(profile, topic);
  return [
    `An educational ${profile.language} video for the dental clinic "${profile.name}".`,
    `Topic: ${topic.title}. It answers the patient question: "${topic.question}".`,
    topic.takeaway
      ? `The ONE takeaway, which every scene serves and the viewer should be able to repeat: "${topic.takeaway}". Anything that does not serve it (a second tip list, general check-up advice) stays out.`
      : `Build the video on ONE takeaway the viewer could repeat to a friend; anything that does not serve it stays out.`,
    `The hook scene's text must be this line, word for word or tightened but never made more generic: "${topic.hook}".`,
    `Include narration exactly in this shape: "voiceover": { "text": "<the full narration, every sentence>", "voice": "nova" } (voice may be "nova" or "onyx"). The text is natural spoken ${profile.language}, same form of address, covering the same points as the screen. It should sound like a friendly dentist talking to one patient: varied sentences, contractions where the language uses them, every sentence adding something new, no word or idea repeated, never list items read out. About ${speechRate(profile.language).perSecond} ${speechRate(profile.language).unit === "characters" ? "Japanese characters" : "words"} per second of video.`,
    `Structure: hook → the answer in 2-4 varied scenes (never two "statement" scenes in a row; use a list or compare at least once) → cta. The scene right after the hook starts answering what the hook asked. At most 3 items in a list.`,
    `Every scene says something NEW. Never restate the takeaway or an earlier scene in other words, and never end the body with a recap or summary list ("Kısaca", "Kurz gesagt", "In short", "What to do") — the viewer just saw it. One short sentence per on-screen line: statements under 90 characters, list items under 6 words. Only when the hook states a belief that is wrong, answer it with "${notQuite(profile.language)}" (never a bare "No." / "Nein." / "Hayır.") and why. After a hook that is a moment, a mistake or a question about what to do, go straight to the answer: a reflexive "${notQuite(profile.language)}" there reads as nonsense ("Missing the gumline? Not quite.").`,
    variantRule(profile),
    `Sound: say it the way a dentist would say it across the chair, not a leaflet. Never generic filler ("for more information", "your smile deserves…", "we're here to help", "don't hesitate to") in any language.`,
    `Write every on-screen word in ${profile.language}. Tone: ${profile.tone}. ${addressRule(profile)}`,
    `Accurate, mainstream dental guidance only, hedged where outcomes vary ("can", "usually") — and the on-screen line keeps the same qualifier as the narration: if the voice says "usually", the card says it too. One qualifier per claim; instructions and plain facts are said plainly, not hedged.`,
    practiceFactsRule(profile),
    `Every word on screen is in ${profile.language}: never an English "Not quite." or "Here's why", or any other language's words, on a ${profile.language} card.`,
    `Never mention prices, discounts, guarantees, "painless", "permanent", "best", before/after results or patient stories.`,
    `Words the reviewers always reject — never use them on screen or in narration: ${AVOID_WORDS[profile.language] ?? AVOID_WORDS.en}.`,
    `Aftercare and instructions: only what dentists normally tell patients for THIS procedure, and say to follow the dentist's own instructions. Do not invent timeframes or extra restrictions. Reference:\n${AFTERCARE_GUIDE}`,
    marketRules(profile.country) ? `This market's advertising rules: ${marketRules(profile.country)}` : "",
    `Never invent statistics or percentages ("80% of patients…"); say "most people" or leave it out. A number is allowed only for a guideline interval or timeframe (every 6 months, the first 48 hours).`,
    `Include exactly ONE footage scene with stock footage — { "kind": "footage", "source": { "type": "stock", "query": "..." }, "caption": "<one short line of the answer>", "seconds": 3-4 } — placed right after the hook or in the middle, so the video is not only text. The query: 2-4 English words naming a DENTAL object you can film for THIS topic (e.g. "teeth whitening tray", "dental floss close up", "clear aligner case", "tooth model close up", "toothbrush and toothpaste") — never food, drinks, a sink or a room on its own, never a "dentist office", sign or logo, no people, no clinic or treatment scenes.`,
    `End with a cta scene. ${ctaGuide(profile.country, profile.address)}` +
      (profile.handle ? ` Put "@${profile.handle.replace(/^@/, "")}" only in the cta scene's "handle" field, never inside any text.` : ""),
    weekVoiceBrief(week),
    example ? exampleBlock(example) : "",
    isUnspaced(profile.language)
      ? `On-screen length limits (Japanese characters are twice as wide as Latin letters): hook at most 20 characters, every list item at most 18, the cta at most 24, other lines at most 50. Use Japanese punctuation (、。「」) and no spaces between words. When a reviewer's fix is longer, shorten it to fit — keep its meaning, not its length.`
      : `On-screen length limits: hook and every list item and the cta at most 80 characters; other lines at most ${SCREEN_LINE_MAX - 20} — a viewer has 3-4 seconds to read each. When a reviewer's fix is longer, shorten it to fit — keep its meaning, not its length.`,
    fixes.length ? `A compliance or clinical reviewer required these changes: ${fixes.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type Review = { verdict: "pass" | "revise" | "block"; issues: { quote: string; problem: string; fix: string }[]; hard?: ComplianceResult["hard"] };

function fixesOf(r: Review): string[] {
  return [
    ...(r.hard ?? []).map((h) => `remove or reword "${h.match}" (${h.why})`),
    ...r.issues.map((i) => `"${i.quote}": ${i.problem} → ${i.fix}`),
  ];
}

export type Checks = { compliance: ComplianceResult; accuracy: AccuracyResult };
type Outcome<T> = ({ ok: true; checks: Checks } & T) | { ok: false; rejected: string[] };

/**
 * Write, then pass both reviewers. Compliance first (cheap, and a hard-rule
 * hit makes the accuracy review moot), then clinical accuracy. Either one's
 * fixes feed the next rewrite; three attempts in all.
 */
async function reviewed<T>(
  deps: WeekDeps,
  label: string,
  topic: Topic,
  /** `previous` is the last draft a reviewer sent back, to be edited rather than redone. */
  write: (fixes: string[], previous?: T) => Promise<T>,
  textOf: (t: T) => string,
  accuracyOf: (t: T) => Promise<AccuracyResult>,
  profile: ClinicProfile,
  /** Deterministic checks run before any reviewer; problems become fixes. */
  check?: (t: T) => string[],
): Promise<Outcome<{ value: T }>> {
  let fixes: string[] = [];
  let previous: T | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const value = await write(fixes, previous);
    previous = value;
    const problems = check?.(value) ?? [];
    if (problems.length) {
      deps.log?.(`${label} structure`, { topic: topic.title, attempt, problems });
      fixes = problems;
      continue;
    }
    const compliance = await reviewCompliance(deps.client, profile, textOf(value));
    deps.log?.(`${label} compliance`, { topic: topic.title, attempt, verdict: compliance.verdict, ...(compliance.verdict === "pass" ? {} : { fixes: fixesOf(compliance) }) });
    if (compliance.verdict === "block") return { ok: false, rejected: fixesOf(compliance) };
    if (compliance.verdict === "revise") {
      fixes = fixesOf(compliance);
      continue;
    }
    const accuracy = await accuracyOf(value);
    deps.log?.(`${label} accuracy`, { topic: topic.title, attempt, verdict: accuracy.verdict, ...(accuracy.verdict === "pass" ? {} : { fixes: fixesOf(accuracy) }) });
    if (accuracy.verdict === "pass") return { ok: true, value, checks: { compliance, accuracy } };
    if (accuracy.verdict === "block") return { ok: false, rejected: fixesOf(accuracy) };
    fixes = fixesOf(accuracy);
  }
  return { ok: false, rejected: fixes };
}

/**
 * A narrated video needs narration that is actually narration. Seen live:
 * { "text": "nova", "voice": "nova" } — the voice name in the text field,
 * which rendered a 0.5-second voiceover over a 24-second video.
 */
export function narrationProblems(plan: ScenePlan, language?: string): string[] {
  const text = plan.voiceover?.text?.trim() ?? "";
  // Counted in the language's own unit: a Japanese narration has no spaces,
  // and counted in words it was one "word" long, every time.
  const rate = speechRate(language);
  const units = speechUnits(text, language);
  const needed = Math.round(totalSeconds(plan) * rate.perSecond * 0.52);
  if (!text) return ['add "voiceover": { "text": "<full narration>", "voice": "nova" }'];
  if (units < needed)
    return [`voiceover.text has ${units} ${rate.unit}; write the full narration (about ${speechTarget(totalSeconds(plan), language)}) — it must be the spoken script, not a voice name`];
  return [];
}

/**
 * The deterministic post-check: what a pattern can see is wrong with a
 * script, phrased as fixes for the writer. It runs before any paid reviewer
 * (a failing draft goes straight back with these), so it only lists clear
 * failures: a hook shape the judge always marks down, urgency or (in
 * Türkiye) steering in the closing line, AI filler, a narration a Reel
 * cannot hold, numbers the narration invented, procedure mix-ups and mixed
 * forms of address. Softer issues are only scored (rubric.ts).
 */
export function scriptProblems(
  plan: ScenePlan,
  profile: Pick<ClinicProfile, "language" | "country"> & { name?: string; city?: string; services?: string[] },
  /** How this week's earlier videos closed: a closing that echoes one is sent back. */
  week?: WeekVoice,
): string[] {
  const out: string[] = [];
  const scenes = plan.scenes as unknown as RubricScene[];
  const hook = scenes.find((s) => s.kind === "hook")?.text ?? "";
  for (const p of hookProblems(hook, profile.language)) if (BLOCKING_HOOK.has(p.code)) out.push(`hook: ${p.detail} — rewrite it as a specific moment, mistake, myth or surprising fact that opens a question`);
  const cta = scenes.find((s) => s.kind === "cta")?.text;
  for (const p of ctaProblems(cta, profile.country)) if (BLOCKING_CTA.has(p.code)) out.push(`cta: ${p.detail} — ${ctaGuide(profile.country)}`);
  if (cta) {
    const echo = [...(week?.closings ?? []), ...ctaTemplates(profile.country)].find((c) => overlap(c, cta) >= 0.6);
    if (echo) out.push(`cta: "${cta}" repeats "${echo}" — write a closing line about THIS video's subject, in different words`);
    if (profile.name && namesClinic(cta, profile.name)) out.push(`cta: do not name the clinic in the closing line ("us" is enough; the handle is on screen)`);
  }
  const lines = screenLines(scenes);
  const screen = lines.join("\n");
  const narration = plan.voiceover?.text ?? "";
  for (const r of repeatedScreen(lines, [hook, cta])) out.push(`say each point once: ${r} — cut the repeat and keep the scene that says it best`);
  if (!isUnspaced(profile.language)) {
    const dense = lines.find((l) => l.length > SCREEN_LINE_MAX);
    if (dense) out.push(`on-screen line too long to read in a Reel (${dense.length} characters, max ${SCREEN_LINE_MAX}): "${dense.slice(0, 60)}…" — one short sentence per scene`);
  }
  if (scenes.length > MAX_SCENES) out.push(`${scenes.length} scenes — at most ${MAX_SCENES} (hook, 2-4 answer scenes, cta): drop the weakest`);
  for (const t of spokenTics(`${screen}\n${narration}`)) out.push(t);
  if ((profile.country ?? "").toUpperCase() === "TR") {
    const s = trSteering(narration);
    if (s) out.push(`narration: "${s}" steers the viewer to book or to the clinic — RG 33075 allows information only; point to their own dentist instead`);
  }
  const filler = fillerHits(`${screen}\n${narration}`, profile.language);
  if (filler.length) out.push(`remove generic filler, say something specific to this topic instead: ${filler.map((f) => `"${f}"`).join(", ")}`);
  if (narration) {
    const sec = spokenSeconds(narration, profile.language);
    if (sec > NARRATION_SECONDS.max) out.push(`the narration takes about ${Math.round(sec)} s to say; cut it to under ${NARRATION_SECONDS.idealMax} s — one takeaway, fewer points`);
    const onScreen = numbersIn(screen);
    const added = [...numbersIn(narration)].filter((n) => !onScreen.has(n));
    if (added.length) out.push(`the narration states numbers that are not on screen (${added.join(", ")}): say only what the screen says`);
  }
  for (const c of clinicalFlags(`${screen}\n${narration}`)) out.push(`clinical: ${c}`);
  for (const c of practiceClaims(`${screen}\n${narration}`, profile.language, knownFacts(profile)))
    out.push(`"${c}" states something about this practice that it never told us (an amenity, a perk, equipment, hours, a phone line) — say what dentists generally do, or leave it out`);
  // The hook is allowed to provoke (the body answers it); the claims are the rest.
  for (const w of wrongLanguage([...lines, narration], profile.language)) out.push(`"${w}" is not in ${profile.language} — write it in the video's language`);
  // "Rinsing aligners with water? That's the mistake." → "Not quite. Rinse them…": the
  // answer contradicts a hook that made no claim to deny (EN sample render, Nov 2026).
  const afterHook = lines[lines.indexOf(hook) + 1] ?? "";
  const nq = notQuite(profile.language).toLocaleLowerCase();
  if (hook && afterHook.toLocaleLowerCase().startsWith(nq) && (!/[?？؟]/u.test(hook) || /\b(mistake|fehler|hata|error)\b/i.test(hook)))
    out.push(`"${afterHook}" answers "${hook}" with "${notQuite(profile.language)}", but the hook states no belief to deny — start the answer directly`);
  for (const o of offRegister(`${screen}\n${narration}`, profile.language)) out.push(`"${o}" is a stock opener or too casual for a practice's feed — say it plainly`);
  if (mixedAddress(`${screen}\n${narration}`, profile.language)) out.push(`formal and informal address are mixed — use one form throughout`);
  return out;
}

/**
 * Wording a first draft is sent back for once, but that never costs the
 * clinic the video: a qualifier the screen dropped, hedging piled up. The
 * fix is a matter of phrasing; when a rewrite does not get it, the reviewers
 * still judge the script. (Blocking them lost three of five videos a week in
 * the bench, mostly on near misses.)
 */
export function softScriptProblems(plan: ScenePlan, profile: Pick<ClinicProfile, "language">): string[] {
  const scenes = plan.scenes as unknown as RubricScene[];
  const hook = scenes.find((s) => s.kind === "hook")?.text ?? "";
  const narration = plan.voiceover?.text ?? "";
  const out: string[] = [];
  // The hook is allowed to provoke (the body answers it); the claims are the rest.
  for (const d of droppedHedges(screenLines(scenes).filter((l) => l !== hook), narration, profile.language))
    out.push(`on screen "${d.line}" states as certain what the narration hedges ("${d.spoken}") — keep the same qualifier on screen`);
  if (narration) {
    const stacked = stackedHedges(narration, profile.language);
    if (stacked) out.push(`narration: ${stacked}`);
  }
  return out;
}

/**
 * Lines the planner wrote twice, removed before anyone reads the draft: a
 * footage caption that repeats a statement, a statement or list item that
 * repeats an earlier line. Seen in the bench: "Usually about 45 to 60
 * minutes." twice, which the post-check sent back three times in a row and
 * the topic was lost. Removing the echo is what the rewrite was asked to do.
 */
export function dropEchoes(plan: ScenePlan): ScenePlan {
  const seen: string[] = [];
  const echoes = (t: string | undefined) => !!t && t.split(/\s+/).length >= 3 && seen.some((x) => linesEcho(x, t));
  const scenes: ScenePlan["scenes"] = [];
  for (const sc of plan.scenes) {
    if (sc.kind === "hook" || sc.kind === "cta") {
      scenes.push(sc);
      continue;
    }
    if (sc.kind === "statement" && echoes(sc.text)) continue;
    if (sc.kind === "footage" && sc.caption && echoes(sc.caption)) {
      const { caption: _drop, ...rest } = sc;
      scenes.push(rest as typeof sc);
      continue;
    }
    if (sc.kind === "list") {
      const items = sc.items.filter((i) => !echoes(i));
      const kept = items.length >= 2 && items.length < sc.items.length ? { ...sc, items } : sc;
      scenes.push(kept);
      seen.push(...kept.items);
      continue;
    }
    scenes.push(sc);
    const r = sc as unknown as RubricScene;
    for (const v of [r.text, r.caption, r.heading]) if (v) seen.push(v);
  }
  return scenes.length === plan.scenes.length && scenes.every((x, i) => x === plan.scenes[i]) ? plan : { ...plan, scenes };
}

/** What the clinic told us about itself; a practice claim naming one of these is the clinic's own. */
function knownFacts(p: { name?: string; city?: string; services?: string[] }): string {
  return [p.name ?? "", p.city ?? "", ...(p.services ?? [])].join(" | ");
}

/**
 * The writers know only the clinic's name, city and services. A sentence
 * about what THIS practice has or does beyond that ("interactive games and
 * small rewards", "our after-hours line") may be untrue, and the clinic would
 * be publishing it about itself.
 */
export function practiceFactsRule(p: Pick<ClinicProfile, "services">): string {
  return `About this practice you know ONLY its name, city and services (${p.services.join(", ")}). Never state anything else about it — no equipment, technology, amenities, games or rewards for children, atmosphere, team traits, opening hours, emergency or after-hours lines, languages, parking or payment options. Explain what dentists generally do ("your dentist can…"), not what "we" offer.`;
}

/** Longest on-screen line a viewer reads in a 3-4 second scene (Latin scripts; ~14 words). */
export const SCREEN_LINE_MAX = 110;
/** Hook, 2-4 answer scenes, footage, cta. */
export const MAX_SCENES = 7;

/**
 * Deterministic checks for the caption, before its reviewers: in Türkiye
 * nothing that steers to booking or to the clinic; everywhere, not the
 * narration pasted again.
 */
export function captionProblems(
  caption: string,
  narration: string | undefined,
  country: string | undefined,
  /** The clinic, for the language and the practice-fact check; optional so older callers still work. */
  profile?: Pick<ClinicProfile, "language"> & { name?: string; city?: string; services?: string[] },
): string[] {
  const out: string[] = [];
  if (profile) {
    for (const c of practiceClaims(caption, profile.language, knownFacts(profile)))
      out.push(`"${c}" states something about this practice that it never told us (an amenity, equipment, hours, an after-hours line) — leave it out`);
    for (const w of wrongLanguage([caption], profile.language)) out.push(`"${w}" is not in ${profile.language} — the whole caption is in the video's language`);
    for (const o of offRegister(caption, profile.language)) out.push(`"${o}" is too casual for a practice's feed — say it plainly`);
  }
  if ((country ?? "").toUpperCase() === "TR") {
    const s = trSteering(caption);
    if (s) out.push(`"${s}" steers the viewer to book or to the clinic — RG 33075 allows information only; end by pointing to their own dentist (hekiminize sorabilirsiniz)`);
  }
  if (narration && copiedShare(caption, narration) >= 0.5)
    out.push(`the caption repeats the narration sentence by sentence — the viewer just heard it; open with the one takeaway, add one line of context, then the closing`);
  return out;
}

export async function produceVideo(
  deps: WeekDeps,
  profile: ClinicProfile,
  topic: Topic,
  /** Stock queries already used this week, so no two videos share a shot. */
  usedFootage: Set<string> = new Set(),
  /** How this week's earlier videos opened and closed, so this one does not repeat them. Updated when the video is ready. */
  week: WeekVoice = { openers: [], closings: [] },
): Promise<VideoPackage> {
  let draftsChecked = 0;
  const script = await reviewed(
    deps,
    "script",
    topic,
    async (fixes, previous) => {
      // A plan that is still invalid after the planner's own repair round
      // (seen in the eval: a 95-character cta) gets one fresh attempt told
      // exactly what was wrong, instead of losing the topic.
      // A rewrite edits the draft the reviewer saw. Writing from scratch
      // fixed one sentence and introduced new problems elsewhere (eval:
      // most rejections were a third, different objection).
      const brief =
        scriptBrief(profile, topic, fixes, week) +
        (previous && fixes.length
          ? `\nThis is a revision. Keep the previous version below — its structure, scenes and wording — and change ONLY what the reviewer required:\n${JSON.stringify({ scenes: previous.scenes, voiceover: previous.voiceover })}`
          : "");
      const { plan } = await planFromPrompt({ prompt: brief, aspect: "9:16", model: AGENT_MODEL }, deps.client).catch((err: Error) =>
        planFromPrompt({ prompt: `${brief}\nThe previous attempt was invalid: ${err.message}. Keep every on-screen text well under its limit.`, aspect: "9:16", model: AGENT_MODEL }, deps.client),
      );
      // The planner's voice-over reads like a leaflet; the narrator rewrites
      // it from the screen text alone, so the reviews below still see one story.
      const deduped = dropEchoes(plan);
      if (!deduped.voiceover) return deduped;
      const text = await narrate(deps.client, profile, topic, deduped, fixes, previous?.voiceover?.text, week).catch(() => deduped.voiceover!.text);
      return { ...deduped, voiceover: { ...deduped.voiceover, text } };
    },
    planText,
    (plan) => reviewAccuracy(deps.client, profile, topic, { script: planText(plan) }),
    profile,
    (plan) => [
      ...narrationProblems(plan, profile.language),
      ...scriptProblems(plan, profile, week),
      // Wording fixes are asked for on the first draft only (softScriptProblems).
      ...(draftsChecked++ === 0 ? softScriptProblems(plan, profile) : []),
    ],
  );
  if (!script.ok) return { status: "rejected", topic, stage: "script", reasons: script.rejected };
  // Remember how this one opened and closed, for the rest of the week.
  if (script.value.voiceover?.text) week.openers.push(firstSentence(script.value.voiceover.text));
  const closing = script.value.scenes.find((s) => s.kind === "cta");
  if (closing && "text" in closing) week.closings.push(closing.text);

  // The caption is written FROM the approved script, and reviewed against
  // it, so the two cannot disagree (seen live: "age 1" vs "6 months").
  const facts = planText(script.value);
  const post = await reviewed(
    deps,
    "copy",
    topic,
    (fixes) => writePostCopy(deps.client, profile, topic, fixes, facts),
    (c) => `${c.caption}\n${c.hashtags.join(" ")}`,
    (c) => reviewAccuracy(deps.client, profile, topic, { script: facts, caption: c.caption }),
    profile,
    (c) => captionProblems(c.caption, script.value.voiceover?.text, profile.country, profile),
  );
  if (!post.ok) return { status: "rejected", topic, stage: "copy", reasons: post.rejected };

  // The dentist will SAY these words on camera, so the card gets the same
  // two reviews as the video. A card that cannot pass is left out; the
  // video itself does not depend on it. (Seen live: a card recommending
  // over-the-counter painkillers without deferring to the dentist.)
  const card = await reviewed(
    deps,
    "shoot card",
    topic,
    (fixes) => writeShootCard(deps.client, profile, topic, fixes),
    shootCardText,
    (c) => reviewAccuracy(deps.client, profile, topic, { script: shootCardText(c) }),
    profile,
  ).catch(() => undefined);
  const shootCard = card?.ok ? card.value : undefined;
  // Painted in the clinic's colour, so the week reads as theirs.
  // Objects only, never people or a clinic in stock footage; no repeats.
  const guarded = guardFootage(script.value, topic.service, usedFootage);
  // Library photos behind the text: 10–20 ranked suggestions are kept for the
  // clinic to choose from; the top few go in by default (dentvid/backgrounds).
  const bgInput = {
    plan: guarded,
    topic: `${topic.title} . ${topic.question} . ${topic.hook}`,
    service: topic.service,
    language: profile.language,
  };
  const suggestedBackgrounds = suggestBackgrounds(bgInput);
  // A new video starts with recognisably dental photos only (a toothbrush, an
  // aligner case, a treatment chair), the topic's own first: a dentist read
  // the library's mood and food stills (an apple and bread in an implant
  // video) as filler. The clinic can still pick any suggestion by hand.
  const chosen = startingBackgrounds(bgInput, totalSeconds(guarded)).map(backgroundSrc);
  // The renderer needs the language for fonts, line breaking and direction (RTL for Arabic).
  // A market's required on-screen warning (Türkiye, RG 33075 md. 7/1-k) is
  // set by code alone: whatever the planner put there is dropped.
  const { disclaimer: _planned, ...unwarned } = guarded;
  const notice = screenNotice(profile.country, topic);
  // The clinic signs the video: its name on the sign-off (and in the corner
  // when it has no logo), its handle from the profile rather than wherever
  // the planner remembered to put it (Nov 2026: a TR video ended with no handle).
  const signed = profile.handle
    ? unwarned.scenes.map((s) => (s.kind === "cta" ? { ...s, handle: `@${profile.handle!.replace(/^@/, "")}` } : s))
    : unwarned.scenes;
  const withLang: ScenePlan = {
    ...unwarned,
    scenes: signed as ScenePlan["scenes"],
    clinic: profile.name,
    ...(notice ? { disclaimer: notice } : {}),
    language: profile.language,
    ...(guarded.voiceover ? { voiceover: { ...guarded.voiceover, voice: voiceFor(profile.language, guarded.voiceover.voice) } } : {}),
  };
  const safe: ScenePlan = chosen.length ? { ...withLang, backgrounds: chosen } : withLang;
  const branded = profile.brandColor
    ? { ...safe, brandColor: profile.brandColor, ...(profile.brandAccent ? { brandAccent: profile.brandAccent } : {}) }
    : safe;
  const videoPath = deps.render ? await deps.render(branded, topic) : undefined;
  // Measure the render before anyone sees it (silent narration, wrong size,
  // black frames…). A failing video is still delivered, marked with why.
  const qa = videoPath
    ? await inspectVideo(videoPath, { width: 1080, height: 1920, minSec: 8, maxSec: 90, expectAudio: true }).catch(() => undefined)
    : undefined;
  return {
    status: "ready",
    approval: "pending",
    topic,
    plan: safe,
    suggestedBackgrounds,
    // The reviewed caption, plus the sentence a market requires under every post (Türkiye: RG 33075 md. 7/1-k).
    copy: { ...post.value, caption: withCaptionNotice(post.value.caption, profile.country) },
    checks: { script: script.checks, copy: post.checks },
    shootCard,
    videoPath,
    qa,
  };
}

export async function produceWeek(
  deps: WeekDeps,
  profile: ClinicProfile,
  opts: {
    count?: number;
    avoidTitles?: string[];
    /** The clinic's past topics with hooks/services/dates, when the caller has them (better than titles alone). */
    history?: PastTopic[];
    /** The day the week is planned, for seasonal hooks; defaults to now. */
    today?: Date;
    /**
     * Given topics instead of the strategist's (re-rendering a known set, e.g.
     * the sample videos: docs/PREVIEW_RERENDER.md). Their hooks still go
     * through the hook editor; no spares are planned.
     */
    topics?: Topic[];
  } = {},
): Promise<VideoPackage[]> {
  const want = Math.max(1, opts.count ?? 5);
  // Plan spares: a topic the reviewers reject is replaced, so the clinic
  // still gets the week it pays for instead of a gap.
  const patientSearches = deps.searches ? await deps.searches(profile).catch(() => []) : [];
  deps.log?.("patient searches", { count: patientSearches.length });
  const recentHooks = (opts.history ?? []).map((h) => h.hook).filter((h): h is string => !!h);
  const planned = opts.topics?.length ? opts.topics : await planWeek(deps.client, profile, { ...opts, count: want + 2, patientSearches });
  const topics = await sharpenHooks(deps.client, profile, planned, recentHooks);
  const out: VideoPackage[] = [];
  const usedFootage = new Set<string>();
  const week: WeekVoice = { openers: [], closings: [] };
  // Sequential on purpose: renders are CPU-bound and the agents are cheap.
  for (const topic of topics) {
    if (out.filter((p) => p.status === "ready").length >= want) break;
    // One topic failing (a plan the model could not get valid, a render
    // error) must not cost the clinic the rest of its week: it is tried
    // once more (most failures are passing — a 429, a render timeout), then
    // recorded as not made and the next spare topic takes its place.
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= VIDEO_ATTEMPTS; attempt++) {
      try {
        out.push(await produceVideo(deps, profile, topic, usedFootage, week));
        lastError = undefined;
        break;
      } catch (e) {
        lastError = e as Error;
        deps.log?.("topic failed", { topic: topic.title, attempt, error: lastError.message });
        await deps.onVideoError?.(lastError, topic);
      }
    }
    if (lastError) out.push({ status: "rejected", topic, stage: "script", reasons: [], error: lastError.message });
  }
  return out;
}
