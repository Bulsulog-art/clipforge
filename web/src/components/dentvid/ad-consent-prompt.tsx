"use client";

import { useEffect, useState } from "react";
import { fetchDvGeo } from "@/lib/dentvid/geo-client";
import { clickFrom, declineAdClick, declinedInTab, readAdClick, storeAdClick, type ClickType } from "@/lib/dentvid/ad-click";
import { isInternalBrowser } from "@/lib/dentvid/internal-flag";

/**
 * The Google Ads click id and its consent prompt. Loaded on demand by
 * AdCapture (ad-consent.tsx) only when the URL carries a gclid / gbraid /
 * wbraid, so organic visitors never download it.
 *
 * The prompt names the recipient (Google Ads) and the transfer, as Google's
 * EU user consent policy, GDPR informed consent and KVKK explicit consent ask.
 *
 * The visitor's country is asked from /api/dentvideo/geo (our server's IP →
 * country lookup; one request per page, shared with the price tags via
 * lib/dentvid/geo-client). In the EU/EEA, the UK and Switzerland — or when the country is
 * unknown — a small prompt asks first, with equal Accept / Decline; the id is
 * stored only after Accept, and Decline drops it. Elsewhere (e.g. Türkiye) it
 * is stored straight away, as the privacy policy says. No cookie, no
 * third-party script.
 */

type Copy = { title: string; text: string; accept: string; decline: string; privacy: string };

const COPY: Record<string, Copy> = {
  en: { title: "May we tell Google Ads which ad brought you?", text: "Only to measure our ads: we keep the ad click ID for 90 days and send it to Google if you sign up or subscribe. Never sold.", accept: "Accept", decline: "Decline", privacy: "Privacy" },
  de: { title: "Dürfen wir Google Ads melden, über welche Anzeige Sie kamen?", text: "Nur zur Messung unserer Anzeigen: Wir speichern die Klick-Kennung 90 Tage und übermitteln sie an Google, wenn Sie sich registrieren oder ein Abo abschließen. Nie verkauft.", accept: "Akzeptieren", decline: "Ablehnen", privacy: "Datenschutz" },
  es: { title: "¿Podemos indicar a Google Ads qué anuncio te trajo aquí?", text: "Solo para medir nuestros anuncios: guardamos el identificador del clic 90 días y lo enviamos a Google si te registras o te suscribes. Nunca se vende.", accept: "Aceptar", decline: "Rechazar", privacy: "Privacidad" },
  tr: { title: "Hangi reklamdan geldiğinizi Google Ads'e bildirmemize izin verir misiniz?", text: "Yalnızca reklam ölçümü için: tıklama kimliğini 90 gün saklarız; kaydolur veya abone olursanız Google'a (yurt dışına) aktarırız. Asla satılmaz.", accept: "Kabul et", decline: "Reddet", privacy: "Gizlilik" },
  fr: { title: "Pouvons-nous indiquer à Google Ads quelle annonce vous a amené ici ?", text: "Uniquement pour mesurer nos annonces : nous conservons l'identifiant du clic 90 jours et le transmettons à Google si vous vous inscrivez ou vous abonnez. Jamais vendu.", accept: "Accepter", decline: "Refuser", privacy: "Confidentialité" },
  ja: { title: "どの広告からお越しいただいたかをGoogle広告に伝えてもよろしいですか？", text: "広告の効果測定のためだけに、広告クリックIDを90日間保存し、ご登録またはご契約の際にGoogleへ送信します。販売することはありません。", accept: "許可する", decline: "許可しない", privacy: "プライバシー" },
  ar: { title: "هل تسمحون لنا بإبلاغ Google Ads بالإعلان الذي أوصلكم إلينا؟", text: "لقياس إعلاناتنا فقط: نحتفظ بمعرّف النقرة 90 يوماً ونرسله إلى Google إذا سجّلتم أو اشتركتم. لا يُباع أبداً.", accept: "موافق", decline: "رفض", privacy: "الخصوصية" },
  pl: { title: "Czy możemy przekazać Google Ads, która reklama Państwa do nas przyprowadziła?", text: "Wyłącznie do pomiaru naszych reklam: identyfikator kliknięcia przechowujemy 90 dni i przekazujemy Google, jeśli Państwo się zarejestrują lub wykupią plan. Nigdy nie jest sprzedawany.", accept: "Akceptuję", decline: "Odrzucam", privacy: "Prywatność" },
};

export const AD_CONSENT_LOCALES = Object.keys(COPY);
export const AD_CONSENT_COPY = COPY;
/** The privacy policy's "Who receives it" section (legal-page.tsx ids sections s1, s2, …), which names Google Ads. */
export const AD_CONSENT_PRIVACY_SECTION = "s5";

/** The privacy page in the page's language (English at the root); "/dentvideo" kept off dentvideo.com. */
function privacyHref(l: string): string {
  const p = window.location.pathname;
  const base = p === "/dentvideo" || p.startsWith("/dentvideo/") ? "/dentvideo" : "";
  return `${base}${l === "en" ? "" : `/${l}`}/privacy#${AD_CONSENT_PRIVACY_SECTION}`;
}

function pageLocale(): string {
  const lang = (document.documentElement.lang || "").slice(0, 2).toLowerCase();
  if (lang in COPY) return lang;
  const seg = window.location.pathname.split("/").filter(Boolean);
  const first = seg[0] === "dentvideo" ? seg[1] : seg[0];
  return first && first in COPY ? first : "en";
}

/** Anything but a clear "not required" from the server (a failed request too) asks first. */
async function needsConsent(): Promise<boolean> {
  return (await fetchDvGeo())?.consentRequired ?? true;
}

export function AdConsent() {
  const [pending, setPending] = useState<{ type: ClickType; id: string; at: number } | null>(null);
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    let cancelled = false;
    try {
      const click = clickFrom(window.location.search);
      if (!click) return;
      // Internal traffic (owner, QA, e2e; lib/dentvid/internal-flag): never keep an ad click — QA used test gclids.
      if (isInternalBrowser()) return;
      // Already stored (a reload of the ad's URL) or declined in this tab: do not ask again.
      if (readAdClick()?.id === click.id || declinedInTab()) return;
      const at = Date.now();
      void needsConsent().then((ask) => {
        if (cancelled) return;
        if (!ask) storeAdClick({ ...click, at, consent: "not_required" });
        else {
          setLocale(pageLocale());
          setPending({ ...click, at });
        }
      });
    } catch {
      // never break the page
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pending) return null;
  const c = COPY[locale] ?? COPY.en;
  const answer = (yes: boolean) => {
    if (yes) storeAdClick({ ...pending, consent: "granted" });
    else declineAdClick();
    setPending(null);
  };
  // Accept and Decline look and weigh the same.
  const btn =
    "inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-dv-ink ring-1 ring-dv-edge transition hover:bg-dv-sand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dv-teal";
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="dv-ad-consent-title"
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-ad-consent
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-lg ring-1 ring-dv-line sm:inset-x-auto sm:bottom-4 sm:end-4"
    >
      <p id="dv-ad-consent-title" className="text-[0.9375rem] font-semibold leading-snug text-dv-ink">
        {c.title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-dv-body">
        {c.text}{" "}
        <a href={privacyHref(locale)} className="text-dv-teal underline underline-offset-2">
          {c.privacy}
        </a>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={btn} onClick={() => answer(true)} data-ad-consent-accept>
          {c.accept}
        </button>
        <button type="button" className={btn} onClick={() => answer(false)} data-ad-consent-decline>
          {c.decline}
        </button>
      </div>
    </div>
  );
}
