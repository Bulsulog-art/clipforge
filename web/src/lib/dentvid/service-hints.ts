/** Example services per video language: the clinic form's placeholder, and the preview's topics until the clinic types its own. */
export const SERVICE_HINTS: Record<string, string> = {
  en: "Cleanings, Teeth whitening, Implants, Clear aligners, Root canal treatment, Children's dentistry",
  de: "Professionelle Zahnreinigung, Bleaching, Implantate, Aligner, Wurzelbehandlung, Kinderzahnheilkunde",
  es: "Limpieza dental, Blanqueamiento, Implantes, Ortodoncia invisible, Endodoncia, Odontopediatría",
  fr: "Détartrage, Blanchiment, Implants, Aligneurs, Traitement de canal, Pédodontie",
  it: "Igiene dentale, Sbiancamento, Impianti, Allineatori, Devitalizzazione, Odontoiatria pediatrica",
  pt: "Limpeza, Clareamento, Implantes, Alinhadores, Tratamento de canal, Odontopediatria",
  tr: "Diş taşı temizliği, Diş beyazlatma, İmplant, Şeffaf plak, Kanal tedavisi, Çocuk diş hekimliği",
};

export const splitServices = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

/** The first few example services for a language. */
export const exampleServices = (language: string, n = 3) => splitServices(SERVICE_HINTS[language] ?? SERVICE_HINTS.en).slice(0, n);
