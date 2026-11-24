import { describe, expect, it } from "vitest";
import { EMAIL_PROVIDERS, suggestDomain, typoDistance } from "./email-typo";

describe("suggestDomain: the common slips get the right address", () => {
  it.each([
    // a slip in the name
    ["dr.smith@gmial.com", "dr.smith@gmail.com"],
    ["dr.smith@gamil.com", "dr.smith@gmail.com"],
    ["dr.smith@gmai.com", "dr.smith@gmail.com"],
    ["dr.smith@gmaill.com", "dr.smith@gmail.com"],
    ["info@hotmial.com", "info@hotmail.com"],
    ["info@hotmal.com", "info@hotmail.com"],
    ["info@outlok.com", "info@outlook.com"],
    ["info@oulook.com", "info@outlook.com"],
    ["info@yaho.com", "info@yahoo.com"],
    ["info@yahooo.com", "info@yahoo.com"],
    ["praxis@googlemial.com", "praxis@googlemail.com"],
    ["praxis@tonline.de", "praxis@t-online.de"],
    ["gabinet@interai.pl", "gabinet@interia.pl"],
    ["cabinet@laposte.ner", "cabinet@laposte.net"],
    ["cabinet@hotmial.fr", "cabinet@hotmail.fr"],
    ["clinica@yaho.es", "clinica@yahoo.es"],
    // the name is right, the ending is off
    ["dr.smith@gmail.con", "dr.smith@gmail.com"],
    ["dr.smith@gmail.co", "dr.smith@gmail.com"],
    ["dr.smith@gmail.cm", "dr.smith@gmail.com"],
    ["dr.smith@gmail.om", "dr.smith@gmail.com"],
    ["dr.smith@gmail.cmo", "dr.smith@gmail.com"],
    ["dr.smith@gmail.comm", "dr.smith@gmail.com"],
    ["dr.smith@gmail.c", "dr.smith@gmail.com"],
    ["dr.smith@gmail.ca", "dr.smith@gmail.com"],
    ["me@icloud.co", "me@icloud.com"],
    ["me@icloud.con", "me@icloud.com"],
    ["info@hotmail.co", "info@hotmail.com"],
    ["info@yahoo.cm", "info@yahoo.com"],
    ["info@live.co", "info@live.com"],
    ["praxis@gmx.dee", "praxis@gmx.de"],
    ["praxis@gmx.ed", "praxis@gmx.de"],
    ["praxis@gmx.d", "praxis@gmx.de"],
    ["praxis@gmx.nt", "praxis@gmx.net"],
    ["praxis@web.dee", "praxis@web.de"],
    ["gabinet@wp.pll", "gabinet@wp.pl"],
    ["gabinet@o2.p", "gabinet@o2.pl"],
    ["cabinet@orange.ft", "cabinet@orange.fr"],
    ["cabinet@free.frr", "cabinet@free.fr"],
    // both at once
    ["dr.smith@gmial.con", "dr.smith@gmail.com"],
    ["dr.smith@gmial.co", "dr.smith@gmail.com"],
    // a short name: only a doubled or swapped letter
    ["praxis@gmxx.de", "praxis@gmx.de"],
    ["info@lvie.com", "info@live.com"],
    // the dot or the ending left out
    ["dr.smith@gmailcom", "dr.smith@gmail.com"],
    ["dr.smith@gmail", "dr.smith@gmail.com"],
    ["praxis@webde", "praxis@web.de"],
  ])("%s → %s", (typed, meant) => {
    expect(suggestDomain(typed)).toBe(meant);
  });

  it("keeps the part before the @ exactly as typed, trims the field, ignores the domain's case", () => {
    expect(suggestDomain("  Dr.Smith+dentvideo@GMIAL.COM  ")).toBe("Dr.Smith+dentvideo@gmail.com");
    expect(suggestDomain("dr.smith@gmail.con.")).toBe("dr.smith@gmail.com");
  });

  it("a Turkish keyboard's dotless ı is one slip", () => {
    expect(suggestDomain("klinik@gmaıl.com")).toBe("klinik@gmail.com");
    expect(suggestDomain("klinik@hotmaıl.com")).toBe("klinik@hotmail.com");
  });
});

describe("suggestDomain: says nothing when the address is fine", () => {
  it("every provider on the list, in any case", () => {
    for (const p of EMAIL_PROVIDERS) {
      expect(suggestDomain(`dr.smith@${p}`), p).toBeNull();
      expect(suggestDomain(`dr.smith@${p.toUpperCase()}`), p).toBeNull();
    }
  });

  it.each([
    // a clinic's own domain
    "dr.smith@smiledental.com",
    "praxis@drsmith.de",
    "info@zahnarzt-mueller.de",
    "contact@cabinet-dentaire-lyon.fr",
    "recepcion@clinicadental.es",
    "rejestracja@dentysta-krakow.pl",
    "info@ozeldisklinigi.com.tr",
    "info@sakura-shika.jp",
    "info@smileclinic.ae",
    "hello@gmaildental.com",
    "hello@dental-gmail.com",
    "hello@outlookdental.com",
    "hello@hotel.com",
    "hello@life.com",
    "hello@love.com",
    "hello@fred.fr",
    "hello@webb.co.uk",
    "hello@grange.fr",
    "hello@cloud.com",
    "hello@interior.pl",
    "hello@outloud.com",
    "hello@hotmart.com",
    "hello@sample-dental-practice.example",
    // real mailboxes elsewhere that sit close to a listed provider
    "dr.smith@ymail.com",
    "dr.smith@mail.com",
    "dr.smith@email.com",
    "dr.smith@mac.com",
    "dr.smith@my.com",
    "dr.smith@aol.com",
    "praxis@gmx.at",
    "praxis@gmx.ch",
    "praxis@gmx.com",
    "praxis@yahoo.de",
    "praxis@hotmail.de",
    "praxis@outlook.de",
    "praxis@live.de",
    "clinic@live.ca",
    "clinic@hotmail.co.uk",
    "clinic@yahoo.co.jp",
    "clinic@yahoo.co.uk",
    "klinik@hotmail.com.tr",
    "gabinet@op.pl",
    "gabinet@onet.pl",
    "gabinet@interia.eu",
    "clinica@orange.es",
    "info@me.org",
    "info@gmx.ne",
    "info@proton.me",
  ])("%s", (email) => {
    expect(suggestDomain(email)).toBeNull();
  });

  it.each(["", "   ", "dr.smith", "dr.smith@", "@gmial.com", "dr smith@gmial.com", "a@b@gmial.com", "dr.smith@.gmial.com", "dr.smith@gmial..com", "dr.smith@localhost"])(
    "not an address (yet): %j",
    (email) => {
      expect(suggestDomain(email)).toBeNull();
    },
  );

  it("a suggestion is always one of the listed providers, and never the address as typed", () => {
    const typed = ["a@gmial.com", "a@gmail.co", "a@hotmial.fr", "a@gmx.dee", "a@gmail"];
    for (const t of typed) {
      const s = suggestDomain(t)!;
      expect(s).not.toBe(t);
      expect(EMAIL_PROVIDERS as readonly string[]).toContain(s.split("@")[1]);
      // Taking the suggestion ends the hint.
      expect(suggestDomain(s)).toBeNull();
    }
  });
});

describe("typoDistance", () => {
  it("counts a swap of neighbours as one slip", () => {
    expect(typoDistance("gmial", "gmail")).toBe(1);
    expect(typoDistance("gmail", "gmail")).toBe(0);
    expect(typoDistance("gmai", "gmail")).toBe(1);
    expect(typoDistance("con", "com")).toBe(1);
    expect(typoDistance("de", "com")).toBe(3);
    expect(typoDistance("", "abc")).toBe(3);
  });
});
