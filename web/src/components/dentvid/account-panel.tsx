"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeftRight, CreditCard, Download, Mail, Trash2 } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";
import { accountText } from "@/content/dentvideo-account";
import { dvHref } from "@/lib/dentvid/host";
import { dvBrowser } from "@/lib/dentvid/supabase";
import { deleteConfirmOk, deletePhrase, mailtoHref } from "@/lib/dentvid/app-ui";
import type { ClinicPlan } from "@/lib/dentvid/plan";
import type { DvTier } from "@/lib/dentvid/billing";
import { tierName as planTierName, usd, type PlanOption } from "./plan-panel";
import { GROUP_CONTACT, groupMailto } from "@/content/dentvideo-group";

/**
 * Self-serve account control on the settings screen:
 *   - billing portal and plan change (Dodo, when the server has an API key —
 *     `selfServe`; otherwise the email card stays, see app-screens.tsx);
 *   - download my data;
 *   - delete my account, behind a dialog that asks for the clinic name.
 * Every action goes through a server route that acts only on the signed-in
 * clinic; nothing here carries a key or an id.
 */

const isolate = (s: string) => `⁨${s}⁩`;

async function postJson(
  url: string,
  body?: unknown,
): Promise<{
  ok: boolean;
  status: number;
  data: { url?: string; error?: string; fallback?: string };
}> {
  const res = await fetch(url, {
    method: "POST",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    fallback?: string;
  };
  return { ok: res.ok, status: res.status, data };
}

function ErrorLine({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-3 rounded-xl bg-[#fbeaea] px-4 py-3 text-sm text-[#8a1f1f]">
      {msg}
    </p>
  );
}

/**
 * A modal built on <dialog>.showModal(): focus is trapped and Escape closes it
 * natively; focus returns to the button that opened it.
 */
function Modal({
  open,
  onClose,
  onClosed,
  labelledBy,
  describedBy,
  children,
}: {
  open: boolean;
  /** Escape or a click on the backdrop: may be refused (while a request runs). */
  onClose: () => void;
  /** The dialog has closed (by the browser too): the state must follow. */
  onClosed: () => void;
  labelledBy: string;
  describedBy: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
      (opener.current as HTMLElement | null)?.focus?.();
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Chrome closes a dialog on a second Escape even when cancel is prevented
      // (close watchers): follow it, or the opener could not open it again.
      onClose={() => {
        if (open) onClosed();
      }}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-[1.25rem] bg-white p-0 text-dv-ink shadow-[0_24px_60px_rgba(20,33,31,0.25)] backdrop:bg-[#14211f]/50"
    >
      <div className="p-6 text-start sm:p-7">{children}</div>
    </dialog>
  );
}

export function AccountPanel({
  locale,
  selfServe,
  plan,
  plans,
  clinicName,
  accountEmail = null,
  initialDialog = null,
  part,
}: {
  /** "billing" sits inside the plan section; "data" is its own section below it. */
  part: "billing" | "data";
  locale: Locale;
  /** The server has DODO_API_KEY: billing portal and plan change are self-serve. */
  selfServe: boolean;
  plan: ClinicPlan | null;
  plans: PlanOption[];
  clinicName: string;
  /** The login's address: what to type when the clinic has no name (as the server allows). */
  accountEmail?: string | null;
  /** Dev preview only: open the delete dialog on load. */
  initialDialog?: "delete" | null;
}) {
  const text = appText(locale);
  const t = accountText(locale);
  const paying = !!plan && (plan.plan === "active" || plan.plan === "paused");
  const ids = {
    del: useId(),
    delBody: useId(),
    chg: useId(),
    chgBody: useId(),
    input: useId(),
  };

  // Billing portal
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  async function openPortal() {
    setPortalBusy(true);
    setPortalError(null);
    try {
      const r = await postJson("/api/dentvideo/billing/portal");
      if (r.ok && r.data.url) {
        window.location.href = r.data.url;
        return;
      }
      setPortalError(r.data.error ?? t.errors.billingFailed);
    } catch {
      setPortalError(t.errors.billingFailed);
    }
    setPortalBusy(false);
  }

  // Plan change
  const [target, setTarget] = useState<PlanOption | null>(null);
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const monthly = plans.filter((p) => p.interval === "month");
  async function changePlan() {
    if (!target) return;
    setChangeBusy(true);
    setChangeError(null);
    try {
      const r = await postJson("/api/dentvideo/billing/change-plan", {
        plan: target.tier,
        interval: target.interval,
      });
      if (r.ok) {
        setChanged(true);
        setTarget(null);
      } else setChangeError(r.data.error ?? t.errors.billingFailed);
    } catch {
      setChangeError(t.errors.billingFailed);
    }
    setChangeBusy(false);
  }

  // Export
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  async function exportData() {
    setExportBusy(true);
    setExportError(null);
    setExported(false);
    try {
      const res = await fetch("/api/dentvideo/account/export", {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setExportError(body.error ?? t.errors.exportFailed);
      } else {
        const blob = await res.blob();
        const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "dentvideo-export.json";
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 10_000);
        setExported(true);
      }
    } catch {
      setExportError(t.errors.exportFailed);
    }
    setExportBusy(false);
  }

  // Delete
  const [delOpen, setDelOpen] = useState(initialDialog === "delete");
  const [typed, setTyped] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const blockedBySub = paying && !selfServe;
  const phrase = deletePhrase(clinicName, accountEmail);
  const matches = deleteConfirmOk(typed, clinicName, accountEmail);
  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!matches || blockedBySub) return;
    setDelBusy(true);
    setDelError(null);
    try {
      const r = await postJson("/api/dentvideo/account/delete", {
        confirm: typed,
      });
      if (r.ok) {
        try {
          await dvBrowser().auth.signOut();
        } catch {
          /* the server already cleared the session */
        }
        window.location.assign(dvHref(`/dentvideo/account-deleted?lang=${encodeURIComponent(locale)}`));
        return;
      }
      setDelError(r.data.error ?? t.errors.deleteFailed);
    } catch {
      setDelError(t.errors.deleteFailed);
    }
    setDelBusy(false);
  }

  const [labelBefore, labelAfter = ""] = t.deleteTypeLabel.split("{name}");
  const tierName = (tier: DvTier) => planTierName(locale, tier);
  const priceLine = (o: PlanOption) => `${usd(locale, o.priceUsd)} ${text.billing.perMonth}`;

  if (part === "billing") {
    return (
      <>
        {selfServe && paying && (
          <div className="dv-card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="max-w-xl">
              <h3 className="font-semibold text-dv-ink">{t.billingTitle}</h3>
              <p className="mt-1 text-sm leading-relaxed text-dv-body">{t.billingLead}</p>
              <ErrorLine msg={portalError} />
            </div>
            <button type="button" onClick={openPortal} disabled={portalBusy} className="dv-btn dv-btn-secondary shrink-0 px-5 py-2.5 text-sm !text-dv-teal">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              {portalBusy ? t.opening : t.billingButton}
            </button>
          </div>
        )}

        {selfServe && plan?.plan === "active" && monthly.length > 1 && (
          <div className="dv-card mt-4 p-5 sm:p-6">
            <h3 className="font-semibold text-dv-ink">{t.changeTitle}</h3>
            <p className="mt-1 text-sm leading-relaxed text-dv-body">{t.changeLead}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {monthly.map((o) => {
                const current = plan.tier === o.tier;
                return (
                  <li key={o.tier} className={`flex flex-col rounded-2xl p-4 ring-1 ring-inset ${current ? "bg-dv-teal-50 ring-dv-teal/30" : "bg-white ring-dv-line"}`}>
                    <span className="text-sm font-semibold text-dv-ink">{tierName(o.tier)}</span>
                    <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1 text-sm text-dv-muted">
                      <span dir="ltr">{usd(locale, o.priceUsd)}</span>
                      <span className="text-xs">{text.billing.perMonth}</span>
                    </span>
                    <div className="mt-3">
                      {current ? (
                        <span className="inline-flex min-h-11 items-center text-xs font-semibold text-dv-teal">{t.current}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setChangeError(null);
                            setTarget(o);
                          }}
                          className="dv-btn dv-btn-secondary w-full px-4 py-2 text-sm !text-dv-teal"
                        >
                          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                          {fmt(t.changeTo, { tier: tierName(o.tier) })}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              {/* Group (multi-location) is not a self-serve switch: write to us. */}
              <li className={`flex flex-col rounded-2xl p-4 ring-1 ring-inset ${plan.tier === "group" ? "bg-dv-teal-50 ring-dv-teal/30" : "bg-white ring-dv-line"}`} data-tier="group">
                <span className="text-sm font-semibold text-dv-ink">{GROUP_CONTACT[locale].name}</span>
                <span className="mt-0.5 text-sm text-dv-muted">{GROUP_CONTACT[locale].price}</span>
                <div className="mt-3">
                  {plan.tier === "group" ? (
                    <span className="inline-flex min-h-11 items-center text-xs font-semibold text-dv-teal">{t.current}</span>
                  ) : (
                    <a href={groupMailto(locale)} className="dv-btn dv-btn-secondary w-full px-4 py-2 text-sm !text-dv-teal">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {GROUP_CONTACT[locale].cta}
                    </a>
                  )}
                </div>
              </li>
            </ul>
            {changed && (
              <p role="status" className="mt-4 rounded-xl bg-dv-teal-50 px-4 py-3 text-sm text-dv-teal-900">
                {t.changed}
              </p>
            )}
          </div>
        )}

        <Modal open={!!target} onClose={() => !changeBusy && setTarget(null)} onClosed={() => setTarget(null)} labelledBy={ids.chg} describedBy={ids.chgBody}>
          {target && (
            <>
              <h2 id={ids.chg} className="text-xl font-semibold text-dv-ink">
                {fmt(t.changeConfirmTitle, { tier: tierName(target.tier) })}
              </h2>
              <p id={ids.chgBody} className="mt-3 text-sm leading-relaxed text-dv-body">
                {fmt(t.changeConfirmBody, {
                  price: isolate(priceLine(target)),
                })}
              </p>
              <ErrorLine msg={changeError} />
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setTarget(null)} disabled={changeBusy} className="dv-btn dv-btn-secondary px-5 py-2.5 text-sm">
                  {t.back}
                </button>
                <button type="button" onClick={changePlan} disabled={changeBusy} aria-busy={changeBusy} className="dv-btn dv-btn-primary px-5 py-2.5 text-sm">
                  {changeBusy ? t.changing : t.changeConfirm}
                </button>
              </div>
            </>
          )}
        </Modal>
      </>
    );
  }

  return (
    <>
      <section aria-labelledby="data-title" className="mt-14 border-t border-dv-line pt-10">
        <h2 id="data-title" className="dv-display text-[2rem] leading-tight text-dv-ink">
          {t.dataTitle}
        </h2>
        <div className="dv-card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="max-w-xl">
            <h3 className="font-semibold text-dv-ink">{t.exportTitle}</h3>
            <p className="mt-1 text-sm leading-relaxed text-dv-body">{t.exportLead}</p>
            <ErrorLine msg={exportError} />
            {exported && (
              <p role="status" className="mt-2 text-sm text-dv-teal">
                {t.exported}
              </p>
            )}
          </div>
          <button type="button" onClick={exportData} disabled={exportBusy} aria-busy={exportBusy} className="dv-btn dv-btn-secondary shrink-0 px-5 py-2.5 text-sm !text-dv-teal">
            <Download className="h-4 w-4" aria-hidden="true" />
            {exportBusy ? t.exporting : t.exportButton}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-[1.25rem] border border-[#ecc9c9] bg-[#fdf6f6] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="max-w-xl">
            <h3 className="font-semibold text-[#8a1f1f]">{t.deleteTitle}</h3>
            <p className="mt-1 text-sm leading-relaxed text-dv-body">{t.deleteLead}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTyped("");
              setDelError(null);
              setDelOpen(true);
            }}
            className="dv-btn shrink-0 border border-[#d9a3a3] bg-white px-5 py-2.5 text-sm font-semibold text-[#8a1f1f] hover:bg-[#fbeaea]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t.deleteButton}
          </button>
        </div>
      </section>

      <Modal open={delOpen} onClose={() => !delBusy && setDelOpen(false)} onClosed={() => setDelOpen(false)} labelledBy={ids.del} describedBy={ids.delBody}>
        <form onSubmit={deleteAccount}>
          <h2 id={ids.del} className="text-xl font-semibold text-dv-ink">
            {t.deleteDialogTitle}
          </h2>
          <div id={ids.delBody} className="mt-3 space-y-3 text-sm leading-relaxed text-dv-body">
            <p>{t.deleteDialogBody}</p>
            {paying && (
              <p className={`rounded-xl px-4 py-3 ${blockedBySub ? "bg-[#fdf1dc] text-[#7a4b00]" : "bg-dv-sand text-dv-ink"}`}>
                {blockedBySub ? t.deleteSubEmail : t.deleteSubApi}
              </p>
            )}
          </div>
          {blockedBySub ? (
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDelOpen(false)} className="dv-btn dv-btn-secondary px-5 py-2.5 text-sm">
                {t.back}
              </button>
              <a href={mailtoHref(t.deleteSubject, `${text.form.clinicName}: ${phrase}\n\n`)} className="dv-btn dv-btn-primary px-5 py-2.5 text-sm">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t.emailUs}
              </a>
            </div>
          ) : (
            <>
              <label htmlFor={ids.input} className="mt-5 block text-sm font-medium text-dv-ink">
                {labelBefore}
                <bdi className="font-semibold">{phrase}</bdi>
                {labelAfter}
              </label>
              <input
                id={ids.input}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
                dir="auto"
                maxLength={200}
                className="dv-field mt-2"
              />
              <ErrorLine msg={delError} />
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setDelOpen(false)} disabled={delBusy} className="dv-btn dv-btn-secondary px-5 py-2.5 text-sm">
                  {t.back}
                </button>
                <button
                  type="submit"
                  disabled={!matches || delBusy}
                  aria-busy={delBusy}
                  className="dv-btn bg-[#a32020] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8a1f1f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {delBusy ? t.deleting : t.deleteConfirm}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </>
  );
}
