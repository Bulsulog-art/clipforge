import { Fragment } from "react";
import { dvHref } from "@/lib/dentvid/host";
import { authText } from "@/content/dentvideo-auth";
import { consentParts } from "@/lib/dentvid/legal";

/** "By creating an account, you agree to the Terms of Service and the Privacy Policy." with both as links. */
export function ConsentLine({ locale }: { locale: string }) {
  const a = authText(locale);
  const links = {
    terms: { href: dvHref("/dentvideo/terms"), label: a.termsLink },
    privacy: { href: dvHref("/dentvideo/privacy"), label: a.privacyLink },
  };
  return (
    <p className="text-center text-xs leading-relaxed text-dv-muted" data-testid="dv-consent">
      {consentParts(a.consent).map((part, i) =>
        part === "{terms}" || part === "{privacy}" ? (
          <a key={i} href={links[part === "{terms}" ? "terms" : "privacy"].href} target="_blank" rel="noopener" className="font-medium text-dv-teal underline underline-offset-2">
            {links[part === "{terms}" ? "terms" : "privacy"].label}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}
