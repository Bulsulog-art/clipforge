import { describe, it, expect } from "vitest";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test";
process.env.OPENAI_API_KEY ||= "test-openai-key";
const { spokenText, findingsOf, clipScreenNotice } = await import("./recording.js");
const { TR_MANDATORY_NOTICE } = await import("./mandatory-notice.js");

describe("recording helpers", () => {
  const t = {
    language: "de",
    text: "",
    words: [
      { word: "Putzen", start: 0, end: 0.4 },
      { word: "Sie", start: 0.4, end: 0.6 },
      { word: "normal", start: 0.6, end: 1 },
      { word: "weiter", start: 1, end: 1.4 },
      { word: "danach", start: 5, end: 5.4 },
    ],
  };

  it("takes exactly the words spoken inside the clip", () => {
    expect(spokenText(t, 0, 1.4)).toBe("Putzen Sie normal weiter");
    expect(spokenText(t, 4.9, 6)).toBe("danach");
  });

  it("lists every reason the dentist should look at a clip", () => {
    const f = findingsOf(
      { verdict: "revise", hard: [{ rule: "absolute", match: "schmerzfrei", why: "absolute" }], issues: [] },
      { verdict: "revise", issues: [{ quote: "q", problem: "p", fix: "f" }] },
    );
    expect(f).toHaveLength(2);
    expect(f[0]).toContain("schmerzfrei");
  });
});

describe("recording clips: Türkiye on-screen warning (RG 33075 md. 7/1-k)", () => {
  const noCard = (hook: string) => ({ title: hook, question: hook, service: "whatever the dentist is explaining in this clip" });

  it("is drawn on a TR clip about a procedure, as on the generated videos", () => {
    const card = { title: "İmplant sonrası bakım", question: "İmplanttan sonra nelere dikkat etmeliyim?", service: "İmplant" };
    expect(clipScreenNotice("TR", card, "İlk gün sıcak içecekten kaçının.")).toBe(TR_MANDATORY_NOTICE);
    // No shoot card: what the dentist said decides.
    expect(clipScreenNotice("TR", noCard("Bunu biliyor muydunuz?"), "Kanal tedavisinde dişin içi temizlenir.")).toBe(TR_MANDATORY_NOTICE);
  });

  it("is drawn when the subject cannot be classified (the safe side)", () => {
    expect(clipScreenNotice("TR", noCard("Merak edilenler"), "Bugün size kısaca anlatayım.")).toBe(TR_MANDATORY_NOTICE);
  });

  it("is not drawn on a pure hygiene clip (the caption still carries it), nor outside Türkiye", () => {
    const card = { title: "Doğru fırçalama", question: "Dişlerimi nasıl fırçalamalıyım?", service: "Ağız hijyeni" };
    expect(clipScreenNotice("TR", card, "Fırçayı diş etine 45 derece tutun.")).toBeUndefined();
    expect(clipScreenNotice("DE", { title: "Implantat", question: "Implantat?", service: "Implantate" }, "Ein Implantat ersetzt die Wurzel.")).toBeUndefined();
    expect(clipScreenNotice(undefined, noCard("x"), "implant")).toBeUndefined();
  });
});
