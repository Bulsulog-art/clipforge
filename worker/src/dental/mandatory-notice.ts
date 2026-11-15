import { marketCode } from "./hard-rules.js";
import type { Topic } from "./strategist.js";

/**
 * Warnings a market requires word for word, added by code — never left to a
 * writer that might paraphrase or forget them.
 *
 * Türkiye: Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri
 * Hakkında Yönetmelik, Resmî Gazete 12.11.2025 no. 33075, md. 7/1-k: visual
 * content used in domestic promotion and information must carry, legibly,
 * the sentence below (issue index:
 * https://www.resmigazete.gov.tr/eskiler/2025/11/20251112.htm). The article
 * number and wording follow a full reading of the Gazette text (research
 * notes, 15.11.2026); the Gazette host was not reachable from the build
 * environment for a second check, and the same sentence is reproduced
 * verbatim by many Turkish clinic sites since November 2025.
 * The wording is the regulation's and is kept verbatim, in the "siz" form,
 * whatever form of address the clinic uses.
 *
 * Our reading (to be confirmed by counsel):
 *  - The provision speaks of visual content in general ("görsel
 *    içeriklerde"), not only procedure videos, so the sentence goes under
 *    EVERY Türkiye post (caption and post kit), whatever the topic.
 *  - The sentence itself is about surgical or interventional procedures.
 *    On screen it is shown, small and legible, near the end of every video
 *    whose topic is a procedure (and of every video we cannot classify);
 *    a pure hygiene/prevention video (brushing, flossing, diet) carries it
 *    in the caption only. If counsel reads 7/1-k as requiring it on screen
 *    in every video, set ON_SCREEN_FOR_ALL_TR to true.
 */
export const TR_MANDATORY_NOTICE =
  "Her cerrahi veya girişimsel işlemde sonuçlar kişiden kişiye değişiklik gösterebilir. İşlem öncesinde hekiminizden detaylı görüş almanız önerilir.";

/** Show the on-screen line on every Türkiye video, not only procedure topics. */
export const ON_SCREEN_FOR_ALL_TR = false;

/** The sentence a market requires under every post, or undefined. */
export function captionNotice(country: string | undefined): string | undefined {
  return marketCode(country) === "TR" ? TR_MANDATORY_NOTICE : undefined;
}

// Treatments a dentist performs on the patient: surgery, anything invasive
// or interventional, and the restorative/cosmetic/orthodontic work around
// it. Turkish first (Türkiye's clinics write Turkish), English for service
// names clinics often keep in English ("Implant", "Invisalign").
const PROCEDURE = new RegExp(
  [
    "implant", "kanal", "endodont", "çekim", "çekil", "çekme", "gömülü", "yirmilik", "cerrah", "ameliyat", "operasyon",
    "sinüs", "kemik", "greft", "zirkon", "kron(?!ik)", "kaplama", "köprü", "protez", "lamina", "veneer", "porselen", "e-max", "emax",
    "dolgu", "beyazlat", "bleaching", "ortodont", "tel tedavi", "braket", "şeffaf plak", "invisalign", "aligner", "plak tedavi",
    "diş eti tedavi", "dişeti tedavi", "periodont", "gingivekt", "küretaj", "flep", "diş taşı", "detertraj", "botoks", "botox",
    "dolgu enjeksiyon", "estetik", "gülüş tasarım", "anestezi", "uyuşturma", "sedasyon", "girişim", "işlem", "apikal", "rezeksiyon",
    "fissür", "flor uygula", "florür uygula", "cila", "bonding", "inley", "onley",
    "root canal", "extraction", "surgery", "crown", "bridge", "denture", "whitening", "braces", "orthodont", "graft", "scaling", "filling",
  ].join("|"),
  "iu",
);
// Habits and knowledge with nothing done to the patient.
const HYGIENE = new RegExp(
  [
    "fırça", "diş ipi", "ara yüz", "arayüz", "gargara", "ağız bakım", "ağız hijyen", "ağız ve diş sağlığı", "hijyen", "beslen", "şeker",
    "asitli", "ağız koku", "diş macun", "kontrol", "muayene", "check-up", "süt diş", "diş çıkarma dönemi", "emzik", "parmak emme",
    "brushing", "floss", "mouthwash", "hygiene", "diet", "toothpaste", "check-up", "checkup",
  ].join("|"),
  "iu",
);

/**
 * Whether a topic is about a surgical or interventional procedure, from its
 * metadata (the clinic's service it belongs to, its title and question).
 * Unclear topics count as procedures: the line on screen is the safe side.
 */
export function isProcedureTopic(topic: Pick<Topic, "service" | "title" | "question">): boolean {
  const text = `${topic.service} ${topic.title} ${topic.question}`.toLocaleLowerCase("tr");
  if (PROCEDURE.test(text)) return true;
  return !HYGIENE.test(text);
}

/** The line to draw on screen near the end of this video, or undefined. */
export function screenNotice(country: string | undefined, topic: Pick<Topic, "service" | "title" | "question">): string | undefined {
  const notice = captionNotice(country);
  if (!notice) return undefined;
  return ON_SCREEN_FOR_ALL_TR || isProcedureTopic(topic) ? notice : undefined;
}

const flat = (s: string) => s.replace(/\s+/g, " ").trim();

/** The caption with the market's required sentence as its own last paragraph, exactly once. */
export function withCaptionNotice(caption: string, country: string | undefined): string {
  const notice = captionNotice(country);
  if (!notice) return caption;
  const body = withoutNotice(caption, notice);
  return body ? `${body}\n\n${notice}` : notice;
}

/** The text with a required sentence taken out (wherever the writer or an earlier pass put it). */
export function withoutNotice(text: string, notice: string): string {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => (flat(p) === notice ? "" : p.split(notice).join("").replace(/[ \t]{2,}/g, " ").trim()))
    .filter(Boolean);
  return paras.join("\n\n").trim();
}
