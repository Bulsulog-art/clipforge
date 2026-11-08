import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/content/dentvideo";
import { asLocale } from "@/lib/dentvid/locale";
import { weekOf } from "@/lib/dentvid/week";
import { DV_FOUNDING, dvAvailablePlans, foundingCode } from "@/lib/dentvid/billing";
import type { ClinicPlan } from "@/lib/dentvid/plan";
import type { LibraryItem } from "@/components/dentvid/library";
import { AppHomeView, RecordView, SettingsView, type ShootCard } from "@/components/dentvid/app-screens";
import { SERVICE_HINTS, splitServices } from "@/lib/dentvid/service-hints";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "App preview", robots: { index: false, follow: false } };

/**
 * Dev-only: the signed-in app's screens from realistic fake data (real
 * sample videos and posters from /public/dentvideo/samples), for design
 * review and screenshots. 404 unless DENTVIDEO_DEV_PREVIEW=1.
 *
 *   /dentvideo/dev/app?screen=library|settings|record&state=…&lang=tr
 *
 * library states: mixed (default: this week to review + last week approved),
 *   between (this week not made yet), empty (paid, nothing ever made),
 *   first-week (just paid), paused, cancelled, trial (no plan, old videos), updating
 * settings states: active (default), paused, trial
 * record states: practice (default), starter, nocards
 */
export default async function AppPreview({ searchParams }: { searchParams: Promise<{ screen?: string; state?: string; lang?: string }> }) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") notFound();
  const sp = await searchParams;
  const locale = asLocale(sp.lang) ?? "en";
  const screen = sp.screen ?? "library";
  const state = sp.state ?? "";
  const plans = dvAvailablePlans();
  const founding = { priceUsd: DV_FOUNDING.priceUsd, code: foundingCode() };

  if (screen === "settings") {
    const planState = state === "paused" || state === "trial" ? state : "active";
    return (
      <SettingsView
        locale={locale}
        profile={demoProfile(locale)}
        logoPath={null}
        logoUrl={null}
        plan={demoPlan(planState)}
        plans={plans}
        founding={founding}
      />
    );
  }

  if (screen === "record") {
    const plan = demoPlan("active", state === "starter" ? "starter" : "practice");
    const cards = state === "nocards" ? [] : demoCards(locale);
    return <RecordView locale={locale} cards={cards} plan={plan} />;
  }

  const thisWeek = weekOf();
  const lastWeek = weekOf(new Date(Date.now() - 7 * 86_400_000));
  const all = demoItems(locale, thisWeek, lastWeek);
  let items: LibraryItem[] = all;
  let planState: ClinicPlan["plan"] = "active";
  let firstWeek = false;
  let madeThisWeek = true;
  if (state === "between") {
    items = all.filter((i) => i.week_of === lastWeek);
    madeThisWeek = false;
  } else if (state === "empty") {
    items = [];
    madeThisWeek = false;
  } else if (state === "first-week") {
    items = [];
    madeThisWeek = false;
    firstWeek = true;
  } else if (state === "paused" || state === "cancelled" || state === "trial") {
    planState = state;
    items = all.filter((i) => i.week_of === lastWeek);
    madeThisWeek = false;
  } else if (state === "updating") {
    items = all.map((i, n) => (n === 0 && i.photos ? { ...i, photos: { ...i.photos, status: "queued" as const } } : i));
  }
  return (
    <AppHomeView
      locale={locale}
      clinicName={demoProfile(locale).name}
      plan={demoPlan(planState)}
      items={items}
      firstWeek={firstWeek}
      madeThisWeek={madeThisWeek}
      currentWeek={thisWeek}
      notice={null}
      plans={plans}
      founding={founding}
      pollMs={3_600_000}
    />
  );
}

function demoPlan(plan: ClinicPlan["plan"], tier: ClinicPlan["tier"] = "practice"): ClinicPlan {
  const active = plan === "active";
  return { plan, tier: active ? tier : null, renewsAt: active ? new Date(Date.now() + 23 * 86_400_000).toISOString() : null, canMake: active };
}

function demoProfile(locale: Locale) {
  return {
    name: { en: "Riverside Dental", de: "Zahnarztpraxis am Park", es: "Clínica Dental Sonrisa", tr: "Gülümse Diş Kliniği", fr: "Cabinet Dentaire du Parc" }[locale],
    city: { en: "Bristol", de: "München", es: "Valencia", tr: "İzmir", fr: "Lyon" }[locale],
    country: { en: "GB", de: "DE", es: "ES", tr: "TR", fr: "FR" }[locale],
    language: locale,
    services: splitServices(SERVICE_HINTS[locale]).slice(0, 4),
    tone: "warm" as const,
    address: "formal" as const,
    handle: "riverside.dental",
    brandColor: "0f5c5c",
  };
}

/** The three real sample videos for a language (mp4 + poster). */
const SAMPLES: Record<Locale, string[]> = {
  en: ["proper-brushing-technique", "whitening-myths-debunked", "caring-for-clear-aligners"],
  de: ["bleaching-zahnschmelz", "aligner-verfaerbung", "kinder-zahnarztangst"],
  es: ["limpieza-dental", "cuidado-encias", "primer-diente"],
  fr: ["detartrage", "blanchiment-email", "gencives-qui-saignent"],
  tr: ["dis-tasi-temizligi", "beyazlatma-hassasiyet", "implant-asamalari"],
};

type Copy = { titles: string[]; caption: string; tags: string[]; finding: string; rejected: string; rejectedWhy: string };
const COPY: Record<Locale, Copy> = {
  en: {
    titles: ["The right way to brush", "Whitening myths, busted", "Caring for clear aligners", "What happens at a check-up", "Bleeding gums: when to come in"],
    caption: "Two minutes, twice a day — and angle the brush towards the gum line. Questions? Ask us at your next visit.",
    tags: ["dentist", "oralhealth", "brushing"],
    finding: "Says “whiter in one visit” — results vary; consider “visibly lighter for many patients”.",
    rejected: "Implants for everyone over 60",
    rejectedWhy: "The topic would need an individual diagnosis; a general video could mislead.",
  },
  de: {
    titles: ["Richtig Zähne putzen", "Bleaching: Mythen im Check", "Aligner richtig pflegen", "Was bei der Kontrolle passiert", "Zahnfleischbluten: wann zu uns?"],
    caption: "Zwei Minuten, zweimal täglich – und die Bürste leicht zum Zahnfleisch neigen. Fragen? Sprechen Sie uns beim nächsten Termin an.",
    tags: ["zahnarzt", "zahngesundheit", "zahnpflege"],
    finding: "Formulierung „in einer Sitzung strahlend weiß“ – Ergebnisse sind individuell; besser „bei vielen Patienten sichtbar heller“.",
    rejected: "Implantate für alle über 60",
    rejectedWhy: "Das Thema setzt eine individuelle Diagnose voraus; ein allgemeines Video könnte irreführen.",
  },
  es: {
    titles: ["Cómo cepillarte bien", "Mitos del blanqueamiento", "Cuidar tus alineadores", "Qué pasa en una revisión", "Encías que sangran: cuándo venir"],
    caption: "Dos minutos, dos veces al día, con el cepillo inclinado hacia la encía. ¿Dudas? Pregúntanos en tu próxima visita.",
    tags: ["dentista", "saludbucal", "cepillado"],
    finding: "Dice «blanco en una sesión»: los resultados varían; mejor «visiblemente más claro en muchos pacientes».",
    rejected: "Implantes para todos los mayores de 60",
    rejectedWhy: "El tema requiere un diagnóstico individual; un vídeo general podría confundir.",
  },
  fr: {
    titles: ["Bien se brosser les dents", "Blanchiment : idées reçues", "Entretenir ses aligneurs", "Ce qui se passe au contrôle", "Gencives qui saignent : quand venir"],
    caption: "Deux minutes, deux fois par jour, brosse inclinée vers la gencive. Une question ? Parlons-en à votre prochain rendez-vous.",
    tags: ["dentiste", "santebucco", "brossage"],
    finding: "« Blanc en une séance » : les résultats varient ; préférez « visiblement plus clair chez de nombreux patients ».",
    rejected: "Des implants pour tous après 60 ans",
    rejectedWhy: "Le sujet suppose un diagnostic individuel ; une vidéo générale pourrait induire en erreur.",
  },
  tr: {
    titles: ["Diş taşı temizliği neden önemli?", "Beyazlatma ve hassasiyet", "İmplant tedavisinin aşamaları", "Kontrolde neler oluyor?", "Diş eti kanaması: ne zaman gelmeli?"],
    caption: "Günde iki kez, ikişer dakika — fırçayı diş etine doğru hafifçe eğin. Sorularınız için bir sonraki randevunuzda bize sorun.",
    tags: ["dishekimi", "agizsagligi", "disfircalama"],
    finding: "“Tek seansta bembeyaz” deniyor — sonuçlar kişiye göre değişir; “birçok hastada belirgin şekilde daha açık” daha uygun.",
    rejected: "60 yaş üstü herkese implant",
    rejectedWhy: "Bu konu kişisel muayene gerektirir; genel bir video yanıltıcı olabilir.",
  },
};

function demoItems(locale: Locale, thisWeek: string, lastWeek: string): LibraryItem[] {
  const c = COPY[locale];
  const s = SAMPLES[locale];
  const media = (n: number) => ({ videoUrl: `/dentvideo/samples/${locale}/${s[n % 3]}.mp4`, thumbUrl: `/dentvideo/samples/${locale}/${s[n % 3]}.jpg` });
  const photos = (n: number): LibraryItem["photos"] => ({
    suggested: ["whitening-03", "whitening-07", "implants-02", "implants-06", "aligners-04", "whitening-10", "implants-09", "whitening-13"].slice(n % 2, (n % 2) + 7),
    chosen: [],
  });
  const base = (id: string, n: number, week: string): LibraryItem => ({
    id,
    kind: "generated",
    status: "ready",
    approval: "pending",
    title: c.titles[n],
    week_of: week,
    caption: c.caption,
    hashtags: c.tags,
    findings: [],
    ...media(n),
    photos: photos(n),
  });
  return [
    { ...base("t1", 0, thisWeek) },
    { ...base("t2", 1, thisWeek), status: "flagged", findings: [c.finding] },
    { ...base("t3", 2, thisWeek) },
    { ...base("t4", 3, thisWeek), status: "working", videoUrl: undefined, thumbUrl: undefined, photos: undefined },
    { ...base("t5", 4, thisWeek), approval: "approved" },
    { ...base("t6", 0, thisWeek), title: c.rejected, status: "rejected", findings: [c.rejectedWhy], videoUrl: undefined, thumbUrl: undefined, photos: undefined },
    { ...base("l1", 3, lastWeek), approval: "approved" },
    { ...base("l2", 4, lastWeek), approval: "approved", kind: "recording", photos: undefined },
    { ...base("l3", 1, lastWeek), approval: "approved" },
    { ...base("l4", 2, lastWeek), approval: "rejected" },
  ];
}

function demoCards(locale: Locale): { title: string; card: ShootCard }[] {
  const c = COPY[locale];
  const card: Record<Locale, ShootCard> = {
    en: { opening: "Most people brush for less than a minute.", points: ["Two minutes, twice a day", "Angle the brush towards the gum", "Soft bristles, gentle circles"], closing: "Ask us to show you at your next visit.", avoid: ["brand names", "promises of results"], setup: ["phone at eye level", "face a window"], minutes: 2 },
    de: { opening: "Die meisten putzen kürzer als eine Minute.", points: ["Zwei Minuten, zweimal täglich", "Bürste zum Zahnfleisch neigen", "Weiche Borsten, sanfte Kreise"], closing: "Wir zeigen es Ihnen gern beim nächsten Termin.", avoid: ["Markennamen", "Erfolgsversprechen"], setup: ["Handy auf Augenhöhe", "Blick zum Fenster"], minutes: 2 },
    es: { opening: "La mayoría se cepilla menos de un minuto.", points: ["Dos minutos, dos veces al día", "Cepillo inclinado hacia la encía", "Cerdas suaves, círculos suaves"], closing: "Te lo enseñamos en tu próxima visita.", avoid: ["marcas", "promesas de resultados"], setup: ["móvil a la altura de los ojos", "de cara a una ventana"], minutes: 2 },
    fr: { opening: "La plupart se brossent moins d'une minute.", points: ["Deux minutes, deux fois par jour", "Brosse inclinée vers la gencive", "Poils souples, petits cercles"], closing: "Nous vous montrons au prochain rendez-vous.", avoid: ["noms de marques", "promesses de résultat"], setup: ["téléphone à hauteur des yeux", "face à une fenêtre"], minutes: 2 },
    tr: { opening: "Çoğumuz dişlerimizi bir dakikadan kısa fırçalıyoruz.", points: ["Günde iki kez, iki dakika", "Fırçayı diş etine doğru eğin", "Yumuşak kıl, nazik daireler"], closing: "Bir sonraki randevunuzda size gösterelim.", avoid: ["marka adları", "sonuç vaadi"], setup: ["telefon göz hizasında", "pencereye dönük"], minutes: 2 },
  };
  return [0, 1, 2].map((n) => ({ title: c.titles[n], card: card[locale] }));
}
