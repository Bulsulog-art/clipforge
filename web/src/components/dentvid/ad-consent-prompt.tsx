"use client";

import { useEffect, useState } from "react";
import { clickFrom, declineAdClick, declinedInTab, readAdClick, storeAdClick, type ClickType } from "@/lib/dentvid/ad-click";

/**
 * The Google Ads click id and its consent prompt. Loaded on demand by
 * AdCapture (ad-consent.tsx) only when the URL carries a gclid / gbraid /
 * wbraid, so organic visitors never download it.
 *
 * The visitor's country is asked from /api/dentvideo/geo (the edge's country
 * header). In the EU/EEA, the UK and Switzerland — or when the country is
 * unknown — a small prompt asks first, with equal Accept / Decline; the id is
 * stored only after Accept, and Decline drops it. Elsewhere (e.g. Türkiye) it
 * is stored straight away, as the privacy policy says. No cookie, no
 * third-party script.
 */

type Copy = { title: string; text: string; accept: string; decline: string; privacy: string };

const COPY: Record<string, Copy> = {
  en: { title: "Allow measuring which ad brought you?", text: "Used only to count our ad results, never sold.", accept: "Accept", decline: "Decline", privacy: "Privacy" },
  de: { title: "Dürfen wir messen, welche Anzeige Sie zu uns gebracht hat?", text: "Nur, um die Ergebnisse unserer Anzeigen zu zählen – niemals verkauft.", accept: "Akzeptieren", decline: "Ablehnen", privacy: "Datenschutz" },
  es: { title: "¿Nos permites medir qué anuncio te trajo aquí?", text: "Solo para contar los resultados de nuestros anuncios; nunca se vende.", accept: "Aceptar", decline: "Rechazar", privacy: "Privacidad" },
  tr: { title: "Sizi hangi reklamın getirdiğini ölçmemize izin verir misiniz?", text: "Yalnızca reklam sonuçlarımızı saymak için kullanılır, asla satılmaz.", accept: "Kabul et", decline: "Reddet", privacy: "Gizlilik" },
  fr: { title: "Nous autorisez-vous à mesurer quelle annonce vous a amené ici ?", text: "Utilisé uniquement pour compter les résultats de nos annonces, jamais vendu.", accept: "Accepter", decline: "Refuser", privacy: "Confidentialité" },
  ja: { title: "どの広告からお越しいただいたかを計測してもよろしいですか？", text: "広告の成果を数えるためだけに使い、販売することはありません。", accept: "許可する", decline: "許可しない", privacy: "プライバシー" },
  ar: { title: "هل تسمحون لنا بقياس الإعلان الذي أوصلكم إلينا؟", text: "يُستخدم فقط لاحتساب نتائج إعلاناتنا، ولا يُباع أبداً.", accept: "موافق", decline: "رفض", privacy: "الخصوصية" },
  pl: { title: "Czy możemy zmierzyć, która reklama Państwa do nas przyprowadziła?", text: "Służy wyłącznie do liczenia wyników naszych reklam, nigdy nie jest sprzedawane.", accept: "Akceptuję", decline: "Odrzucam", privacy: "Prywatność" },
};

export const AD_CONSENT_LOCALES = Object.keys(COPY);

/** The privacy page in the page's language (English at the root); "/dentvideo" kept off dentvideo.com. */
function privacyHref(l: string): string {
  const p = window.location.pathname;
  const base = p === "/dentvideo" || p.startsWith("/dentvideo/") ? "/dentvideo" : "";
  return `${base}${l === "en" ? "" : `/${l}`}/privacy`;
}

function pageLocale(): string {
  const lang = (document.documentElement.lang || "").slice(0, 2).toLowerCase();
  if (lang in COPY) return lang;
  const seg = window.location.pathname.split("/").filter(Boolean);
  const first = seg[0] === "dentvideo" ? seg[1] : seg[0];
  return first && first in COPY ? first : "en";
}

async function needsConsent(): Promise<boolean> {
  try {
    const res = await fetch("/api/dentvideo/geo", { cache: "no-store", credentials: "omit" });
    if (!res.ok) return true;
    const body = (await res.json()) as { consentRequired?: unknown };
    // Anything but a clear "not required" asks first.
    return body.consentRequired !== false;
  } catch {
    return true;
  }
}

export function AdConsent() {
  const [pending, setPending] = useState<{ type: ClickType; id: string; at: number } | null>(null);
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    let cancelled = false;
    try {
      const click = clickFrom(window.location.search);
      if (!click) return;
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
