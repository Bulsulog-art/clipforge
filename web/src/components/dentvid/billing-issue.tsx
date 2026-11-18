"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Mail } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { billingText } from "@/content/dentvideo-billing";
import { appStoreText } from "@/content/dentvideo-app-store";
import { DV_SUPPORT_EMAIL, dateLocale, mailtoHref } from "@/lib/dentvid/app-ui";
import { HelpLink } from "./help-link";

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);

/** Mirrors lib/dentvid/billing-state.ts AppBillingPanel (kept here so this client file imports no server code). */
export type BillingIssue =
  | { kind: "update_payment"; selfServe: boolean }
  | { kind: "pending" }
  | { kind: "disputed" }
  | { kind: "admin_paused" }
  | { kind: "cancelled_pending"; until: string }
  | { kind: "app_store" };

/** Apple's subscriptions page (apple-billing.ts APP_STORE_MANAGE_URL; repeated here so this client file imports no server code). */
const APP_STORE_SUBSCRIPTIONS = "https://apps.apple.com/account/subscriptions";

/**
 * Shown instead of the plan picker when buying a plan would be wrong: the
 * subscription is on hold (update the card — a new plan would charge twice),
 * a payment is still being confirmed, or a cancelled plan is still paid up —
 * and the two states where only we can help: a payment under review
 * (chargeback) and a clinic paused by DentVideo from the admin panel.
 */
export function BillingIssuePanel({ locale, issue, clinicName, keepVideos = false }: { locale: Locale; issue: BillingIssue; clinicName?: string; keepVideos?: boolean }) {
  const c = billingText(locale).copy.panel;
  const appStore = appStoreText(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dentvideo/billing/portal", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { url?: string };
      if (res.ok && body.url) {
        window.location.href = body.url;
        return;
      }
    } catch {
      // falls through to the message
    }
    setError(fill(c.failed, { email: DV_SUPPORT_EMAIL }));
    setBusy(false);
  }

  const vars = { email: DV_SUPPORT_EMAIL };
  const [title, body] =
    issue.kind === "update_payment"
      ? [c.title, c.body]
      : issue.kind === "pending"
        ? [c.pendingTitle, c.pendingBody]
        : issue.kind === "disputed"
          ? [c.disputedTitle, fill(c.disputedBody, vars)]
          : issue.kind === "admin_paused"
            ? [c.adminPausedTitle, fill(c.adminPausedBody, vars)]
            : issue.kind === "app_store"
              ? [appStore.holdTitle, appStore.holdBody]
              : [
                c.cancelledTitle,
                fill(c.cancelledBody, {
                  ...vars,
                  date: new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: "long", timeZone: "UTC" }).format(new Date(issue.until)),
                }),
              ];
  const contactOnly = issue.kind === "disputed" || issue.kind === "admin_paused";
  const mail = mailtoHref(contactOnly ? c.contactSubject : c.emailSubject, clinicName ? `${clinicName}\n\n` : undefined);

  return (
    <section aria-labelledby="billing-issue-title" className="dv-card p-6 sm:p-8">
      <h2 id="billing-issue-title" className="dv-display text-[2rem] leading-tight text-dv-ink">{title}</h2>
      <p className="mt-2 max-w-2xl text-dv-body">{body}</p>
      {keepVideos && <p className="mt-2 text-sm text-dv-muted">{c.keepVideos}</p>}
      {issue.kind === "update_payment" && <HelpLink locale={locale} id="payment-failed" className="mt-2" />}
      {issue.kind === "cancelled_pending" && <HelpLink locale={locale} id="after-cancel" className="mt-2" />}
      {issue.kind === "update_payment" && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {issue.selfServe ? (
            <button type="button" disabled={busy} onClick={openPortal} className="dv-btn dv-btn-primary px-5 py-3 text-sm">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              {busy ? c.opening : c.portalButton}
            </button>
          ) : (
            <a href={mail} className="dv-btn dv-btn-primary px-5 py-3 text-sm">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {c.emailButton}
            </a>
          )}
          <span className="text-sm text-dv-muted">{DV_SUPPORT_EMAIL}</span>
        </div>
      )}
      {contactOnly && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href={mail} className="dv-btn dv-btn-primary px-5 py-3 text-sm" data-testid="billing-contact">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {DV_SUPPORT_EMAIL}
          </a>
        </div>
      )}
      {issue.kind === "app_store" && (
        <p className="mt-6">
          <a href={APP_STORE_SUBSCRIPTIONS} target="_blank" rel="noopener noreferrer" className="dv-btn dv-btn-secondary px-5 py-2.5 text-sm !text-dv-teal" data-testid="app-store-manage">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {appStore.button}
          </a>
        </p>
      )}
      {issue.kind === "cancelled_pending" && (
        <p className="mt-6">
          <a href={mail} className="dv-btn dv-btn-secondary px-5 py-2.5 text-sm !text-dv-teal">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {DV_SUPPORT_EMAIL}
          </a>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]">
          {error}
        </p>
      )}
    </section>
  );
}
