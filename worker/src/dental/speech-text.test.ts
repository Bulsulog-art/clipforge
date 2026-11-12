import { describe, expect, it } from "vitest";
import { speechText } from "./speech-text.js";

describe("speechText — Turkish", () => {
  const tr = (t: string) => speechText(t, "tr");
  it("says percent first, as Turkish does", () => {
    expect(tr("Hastaların %80'i memnun.")).toBe("Hastaların yüzde 80'i memnun.");
    expect(tr("Başarı oranı 95% civarında.")).toBe("Başarı oranı yüzde 95 civarında.");
  });
  it("reads ranges as 'ile'", () => {
    expect(tr("Plakları günde 20-22 saat takın.")).toBe("Plakları günde 20 ile 22 saat takın.");
    expect(tr("İyileşme 3–6 ay sürer.")).toBe("İyileşme 3 ile 6 ay sürer.");
  });
  it("expands abbreviations and units", () => {
    expect(tr("Dr. Ayşe, örn. florür vb. ürünleri önerir.")).toBe("Doktor Ayşe, örneğin florür ve benzeri ürünleri önerir.");
    expect(tr("İmplant yaklaşık 10 mm uzunluktadır.")).toBe("İmplant yaklaşık 10 milimetre uzunluktadır.");
    expect(tr("Günde 2x fırçalayın, 2 dk boyunca.")).toBe("Günde 2 kez fırçalayın, 2 dakika boyunca.");
    expect(tr("DSÖ bunu önerir.")).toBe("Dünya Sağlık Örgütü bunu önerir.");
  });
  it("keeps dental terms untouched", () => {
    const s = "Kanal tedavisi, diş eti bakımı, florür, ortodonti ve implant hakkında konuşalım.";
    expect(tr(s)).toBe(s);
  });
  it("turns a slash into 'ya da' and respells brand names", () => {
    expect(tr("Diş ipi/ara yüz fırçası kullanın.")).toBe("Diş ipi ya da ara yüz fırçası kullanın.");
    expect(tr("Invisalign ile tedavi")).toBe("İnvizalayn ile tedavi.");
  });
  it("gives a dotted İ to dental words typed with an English capital I (Turkish I is the dotless ı)", () => {
    expect(tr("Implant tedavisi. Iyileşme süreci. Ilk hafta.")).toBe("İmplant tedavisi. İyileşme süreci. İlk hafta.");
    expect(tr("Isı ve ılık su, Işık.")).toBe("Isı ve ılık su, Işık.");
  });
  it("calms the punctuation", () => {
    expect(tr("Hemen randevu alın!")).toBe("Hemen randevu alın.");
    expect(tr("Ağrı mı var?!")).toBe("Ağrı mı var?");
  });
});

describe("speechText — German", () => {
  const de = (t: string) => speechText(t, "de");
  it("expands abbreviations with and without the space", () => {
    expect(de("Z. B. Zahnseide, z.B. Interdentalbürsten, bzw. Munddusche usw.")).toBe(
      "Zum Beispiel Zahnseide, zum Beispiel Interdentalbürsten, beziehungsweise Munddusche und so weiter.",
    );
    expect(de("Das dauert ca. 30 Min. und ggf. länger.")).toBe("Das dauert circa 30 Minuten und gegebenenfalls länger.");
  });
  it("spells out ranges, percent, times and units", () => {
    expect(de("Tragen Sie die Schiene 20-22 Stunden.")).toBe("Tragen Sie die Schiene 20 bis 22 Stunden.");
    expect(de("Fast 90 % aller Erwachsenen.")).toBe("Fast 90 Prozent aller Erwachsenen.");
    expect(de("2x täglich putzen, 1x im Jahr zur Prophylaxe.")).toBe("2 Mal täglich putzen, 1 Mal im Jahr zur Prophylaxe.");
    expect(de("Ein Implantat ist 3,5 mm breit.")).toBe("Ein Implantat ist 3,5 Millimeter breit.");
  });
  it("leaves compounds alone", () => {
    const s = "Zahnreinigung, Wurzelbehandlung und Zahnfleisch.";
    expect(de(s)).toBe(s);
  });
});

describe("speechText — Spanish", () => {
  const es = (t: string) => speechText(t, "es");
  it("drops ¡ and the exclamation, keeps ¿?", () => {
    expect(es("¡Pide tu cita hoy! ¿Te sangran las encías?")).toBe("Pide tu cita hoy. ¿Te sangran las encías?");
  });
  it("numbers, units and abbreviations", () => {
    expect(es("Usa 1 cm de pasta, p. ej. con flúor, 3 x al día.")).toBe("Usa 1 centímetro de pasta, por ejemplo con flúor, 3 veces al día.");
    expect(es("Entre 20-22 horas al día, aprox. el 95% de los casos.")).toBe(
      "Entre 20 a 22 horas al día, aproximadamente el 95 por ciento de los casos.",
    );
    expect(es("La Dra. García lo explica.")).toBe("La doctora García lo explica.");
  });
});

describe("speechText — English and others", () => {
  it("English", () => {
    expect(speechText("Brush 2x a day, e.g. for 2 min, i.e. every morning & night.", "en")).toBe(
      "Brush 2 times a day, for example for 2 minutes, that is every morning and night.",
    );
    expect(speechText("We're here 24/7.", "en")).toBe("We're here twenty-four seven.");
    expect(speechText("Only 1x needed.", "en")).toBe("Only 1 time needed.");
  });
  it("Polish keeps inflecting units as written but expands abbreviations", () => {
    expect(speechText("Np. 20 mm, ok. 30% pacjentów.", "pl")).toBe("Na przykład 20 mm, około 30 procent pacjentów.");
  });
  it("Japanese: full-width exclamation becomes 。, nothing else touched", () => {
    expect(speechText("ご安心ください！歯周病は予防できます。", "ja")).toBe("ご安心ください。歯周病は予防できます。");
  });
  it("unknown language: only the universal clean-up", () => {
    expect(speechText("Hello!! 🦷 #dentist", "xx")).toBe("Hello. dentist.");
  });
});

describe("speechText — what is never spoken, and pauses", () => {
  it("removes emoji, links, handles and placeholders", () => {
    expect(speechText("Visit us 😁 at www.clinic.com or @smileclinic {handle} today.", "en")).toBe("Visit us at or today.");
  });
  it("each line ends a sentence (a pause between sections)", () => {
    expect(speechText("Plaque builds up every day\nThat is why cleaning matters\n- floss daily", "en")).toBe(
      "Plaque builds up every day. That is why cleaning matters. floss daily.",
    );
  });
  it("dashes and brackets become commas; ellipses a stop; semicolons a comma", () => {
    expect(speechText("Aligners — clear trays (made for you) — move teeth; gently… Really.", "en")).toBe(
      "Aligners, clear trays, made for you, move teeth, gently. Really.",
    );
  });
  it("puts a space after punctuation glued to the next word, but not inside numbers", () => {
    expect(speechText("It works.Then 0,5 mm.", "de")).toBe("It works. Then 0,5 Millimeter.");
  });
  it("does not turn dates or phone numbers into ranges", () => {
    expect(speechText("Call 555-123-4567.", "en")).toBe("Call 555-123-4567.");
  });
});
