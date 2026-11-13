/** Example services per video language: the clinic form's placeholder, and the preview's topics until the clinic types its own. */
export const SERVICE_HINTS: Record<string, string> = {
  en: "Cleanings, Teeth whitening, Implants, Clear aligners, Root canal treatment, Children's dentistry",
  de: "Professionelle Zahnreinigung, Bleaching, Implantate, Aligner, Wurzelbehandlung, Kinderzahnheilkunde",
  es: "Limpieza dental, Blanqueamiento, Implantes, Ortodoncia invisible, Endodoncia, Odontopediatría",
  fr: "Détartrage, Blanchiment, Implants, Aligneurs, Traitement de canal, Pédodontie",
  it: "Igiene dentale, Sbiancamento, Impianti, Allineatori, Devitalizzazione, Odontoiatria pediatrica",
  pt: "Limpeza, Clareamento, Implantes, Alinhadores, Tratamento de canal, Odontopediatria",
  tr: "Diş taşı temizliği, Diş beyazlatma, İmplant, Şeffaf plak, Kanal tedavisi, Çocuk diş hekimliği",
  ja: "歯のクリーニング、ホワイトニング、インプラント、マウスピース矯正、根管治療、小児歯科",
  ar: "تنظيف الأسنان، تبييض الأسنان، زراعة الأسنان، التقويم الشفاف، علاج العصب، طب أسنان الأطفال",
  pl: "Higienizacja, Wybielanie zębów, Implanty, Leczenie nakładkami, Leczenie kanałowe, Stomatologia dziecięca",
};

/** Services as typed: separated by commas, new lines, or the Japanese (、) and Arabic (،) commas. */
export const splitServices = (s: string) => s.split(/[,，、،\n]/).map((x) => x.trim()).filter(Boolean);

/** The first few example services for a language. */
export const exampleServices = (language: string, n = 3) => splitServices(SERVICE_HINTS[language] ?? SERVICE_HINTS.en).slice(0, n);

/** The separator a clinic would type between services in this language. */
const JOINER: Record<string, string> = { ja: "、", ar: "، " };

/** The example services for a language, offered as one-tap suggestions under the services field. */
export const suggestedServices = (language: string) => splitServices(SERVICE_HINTS[language] ?? SERVICE_HINTS.en);

/** Case-insensitive, also for the Turkish dotted İ ("İmplant" = "implant"). */
const key = (s: string) => s.trim().toLowerCase().replace(/̇/g, "");
const sameService = (a: string, b: string) => key(a) === key(b);

/** Is this service already in what the clinic typed? */
export const hasService = (typed: string, service: string) => splitServices(typed).some((s) => sameService(s, service));

/**
 * Add a suggested service to the services field, or take it out if it is
 * already there. Everything else the clinic typed is kept as it is.
 */
export function toggleService(typed: string, service: string, language: string): string {
  const list = splitServices(typed);
  const next = list.some((s) => sameService(s, service)) ? list.filter((s) => !sameService(s, service)) : [...list, service.trim()];
  return next.join(JOINER[language] ?? ", ");
}
