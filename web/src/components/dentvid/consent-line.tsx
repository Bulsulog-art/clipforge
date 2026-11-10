import { Fragment } from "react";
import { dvHref } from "@/lib/dentvid/host";
import { authText } from "@/content/dentvideo-auth";
import { LEGAL_NAV, legalPath } from "@/content/legal/nav";
import type { LegalKind } from "@/content/legal/types";
import { asLocale } from "@/lib/dentvid/locale";
import { consentParts, placeholderParts } from "@/lib/dentvid/legal";

const linkCls = "font-medium text-dv-teal underline underline-offset-2";

/** "By creating an account, you agree to the Terms of Service and the Privacy Policy." with both as links, in the visitor's language. */
export function ConsentLine({ locale }: { locale: string }) {
  const a = authText(locale);
  const l = asLocale(locale) ?? "en";
  const links = {
    terms: { href: dvHref(legalPath("terms", l)), label: a.termsLink },
    privacy: { href: dvHref(legalPath("privacy", l)), label: a.privacyLink },
  };
  return (
    <p className="text-center text-xs leading-relaxed text-dv-muted" data-testid="dv-consent">
      {consentParts(a.consent).map((part, i) =>
        part === "{terms}" || part === "{privacy}" ? (
          <a key={i} href={links[part === "{terms}" ? "terms" : "privacy"].href} target="_blank" rel="noopener" className={linkCls}>
            {links[part === "{terms}" ? "terms" : "privacy"].label}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

/** Under the plan cards, before checkout: the Terms and Refund Policy, and who sells (Dodo Payments, merchant of record). */
export function CheckoutConsent({ locale }: { locale: string }) {
  const l = asLocale(locale) ?? "en";
  const t = LEGAL_NAV[l];
  const label: Record<"terms" | "refunds", string> = { terms: t.termsLink, refunds: t.refundsLink };
  return (
    <p className="text-xs leading-relaxed text-dv-muted" data-testid="dv-checkout-consent">
      {placeholderParts(t.checkoutConsent, ["terms", "refunds"]).map((part, i) => {
        const kind = part === "{terms}" ? "terms" : part === "{refunds}" ? "refunds" : null;
        return kind ? (
          <a key={i} href={dvHref(legalPath(kind as LegalKind, l))} target="_blank" rel="noopener" className={linkCls}>
            {label[kind]}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </p>
  );
}
