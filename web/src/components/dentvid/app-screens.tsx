import Link from "next/link";
import { dvHref } from "@/lib/dentvid/host";
import { ArrowLeft, Mail, ShieldCheck, UserRound } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import type { ClinicProfile } from "@/lib/dentvid/profile";
import type { ClinicPlan } from "@/lib/dentvid/plan";
import { DV_SUPPORT_EMAIL, mailtoHref, quote } from "@/lib/dentvid/app-ui";
import { Library, type LibraryItem } from "./library";
import { RememberLocale } from "./chrome";
import { FirstWeek } from "./first-week";
import { PlanPanel, PlanStatus, type PlanOption } from "./plan-panel";
import { BillingIssuePanel, type BillingIssue } from "./billing-issue";
import { ClinicForm } from "./clinic-form";
import { AccountPanel } from "./account-panel";
import { RecordUpload } from "./record-upload";

/**
 * The screens of the signed-in app, as plain views of their data. The pages
 * under /dentvideo/app load the data (session, clinic, plan, items) and hand
 * it here; the dev harness (/dentvideo/dev/app) renders the same views from
 * fake data, so what is reviewed there is what clinics see.
 */

type Founding = { priceUsd: number; code?: string; left?: number } | null;

const MAIN = "mx-auto px-4 pb-20 pt-6 sm:px-6 sm:pt-10";

export function AppHomeView({
  locale,
  clinicName,
  plan,
  items,
  firstWeek,
  madeThisWeek,
  notice,
  plans,
  founding,
  currentWeek,
  pollMs,
  weekDelay = null,
  billingIssue = null,
}: {
  locale: Locale;
  clinicName?: string;
  plan: ClinicPlan;
  items: LibraryItem[];
  firstWeek: boolean;
  madeThisWeek: boolean;
  notice: string | null;
  plans: PlanOption[];
  founding: Founding;
  /** Monday of this week (YYYY-MM-DD). */
  currentWeek: string;
  pollMs?: number;
  /** This week's run is being retried / is delayed (lib/dentvid/ops-server readWeekDelay). */
  weekDelay?: "retrying" | "delayed" | null;
  /** Instead of the plan picker: update the card / payment being confirmed / cancelled but paid up (lib/dentvid/billing-state). */
  billingIssue?: BillingIssue | null;
}) {
  const text = appText(locale);
  const t = text.home;
  const onlyFirstWeek = firstWeek && items.length === 0;
  const Heading = firstWeek ? "h2" : "h1";
  return (
    <main lang={locale} dir={dirOf(locale)} className={`${MAIN} max-w-6xl`}>
      <RememberLocale locale={locale} />
      {notice && (
        <p role="status" className="mb-6 rounded-xl bg-dv-teal-50 px-4 py-3 text-sm text-dv-teal ring-1 ring-inset ring-dv-teal/15">
          {notice}
        </p>
      )}
      {firstWeek && (
        <div className={onlyFirstWeek ? "" : "mb-12"}>
          <FirstWeek locale={locale} paid={plan.plan === "active"} pollMs={pollMs} delay={weekDelay} />
        </div>
      )}
      {!onlyFirstWeek && (
        <>
          <header>
            <p className="text-sm font-medium text-dv-muted">{clinicName || t.yourClinic}</p>
            <Heading className="dv-display mt-1 text-[2.5rem] leading-[1.05] text-dv-ink sm:text-5xl">{t.title}</Heading>
            <p className="mt-3 flex max-w-3xl items-start gap-2 text-sm leading-relaxed text-dv-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-dv-teal" aria-hidden="true" />
              {t.lead}
            </p>
          </header>
          {!plan.canMake && !firstWeek && (
            <div className="mt-8">
              {billingIssue ? (
                <BillingIssuePanel locale={locale} issue={billingIssue} clinicName={clinicName} keepVideos={items.length > 0} />
              ) : (
                <PlanPanel locale={locale} state={plan.plan} options={plans} founding={founding} keepVideos={items.length > 0} />
              )}
            </div>
          )}
          <div className="mt-8">
            <Library
              locale={locale}
              items={items}
              locked={!plan.canMake}
              canStartWeek={plan.canMake && !firstWeek && !madeThisWeek}
              currentWeek={currentWeek}
              weekDelay={weekDelay}
            />
          </div>
        </>
      )}
    </main>
  );
}

export function SettingsView({
  locale,
  profile,
  logoPath,
  logoUrl,
  plan,
  plans,
  founding,
  selfServe = false,
  initialDialog = null,
  accountEmail = null,
  billingIssue = null,
}: {
  locale: Locale;
  profile?: Partial<ClinicProfile>;
  /** The login's address (the delete dialog accepts it when the clinic has no name). */
  accountEmail?: string | null;
  logoPath?: string | null;
  logoUrl?: string | null;
  plan: ClinicPlan | null;
  plans: PlanOption[];
  founding: Founding;
  /** DODO_API_KEY is set on the server: billing portal and plan change are self-serve (else the email card). */
  selfServe?: boolean;
  /** Dev preview only: open the delete dialog on load. */
  initialDialog?: "delete" | null;
  /** Instead of the plan picker: update the card / payment being confirmed / cancelled but paid up. */
  billingIssue?: BillingIssue | null;
}) {
  const text = appText(locale);
  const t = text.settings;
  const b = text.billing;
  const manageHref = mailtoHref(t.manageSubject, profile?.name ? `${text.form.clinicName}: ${profile.name}\n\n` : undefined);
  return (
    <main lang={locale} dir={dirOf(locale)} className={`${MAIN} max-w-3xl`}>
      <RememberLocale locale={locale} />
      <h1 className="dv-display text-[2.5rem] leading-[1.05] text-dv-ink sm:text-5xl">{t.title}</h1>
      <p className="mt-2 text-dv-body">{t.lead}</p>
      <div className="mt-8">
        <ClinicForm locale={locale} initial={profile} logoPath={logoPath} logoUrl={logoUrl} submitLabel={t.save} />
      </div>
      {plan && (
        <section aria-labelledby="billing-title" className="mt-14 border-t border-dv-line pt-10">
          <h2 id="billing-title" className="dv-display text-[2rem] leading-tight text-dv-ink">{b.settingsHeading}</h2>
          <div className="mt-4">
            <PlanStatus locale={locale} state={plan.plan} tier={plan.tier} renewsAt={plan.renewsAt} />
          </div>
          {plan.plan === "trial" && (
            <p className="mt-3 text-sm text-dv-body">
              {b.trialNote}{" "}
              <Link href={dvHref("/dentvideo/start?step=preview")} className="font-semibold text-dv-teal underline-offset-4 hover:underline">
                {b.toPreview}
              </Link>
            </p>
          )}
          {!plan.canMake && (
            <div className="mt-6">
              {billingIssue ? (
                <BillingIssuePanel locale={locale} issue={billingIssue} clinicName={profile?.name} />
              ) : (
                <PlanPanel locale={locale} state={plan.plan} options={plans} founding={founding} />
              )}
            </div>
          )}
          {!selfServe && plan.plan !== "trial" && plan.plan !== "cancelled" && (
            <div className="dv-card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="max-w-xl">
                <h3 className="font-semibold text-dv-ink">{t.manageTitle}</h3>
                <p className="mt-1 text-sm leading-relaxed text-dv-body">{t.manageLead}</p>
                <p className="mt-2 text-sm text-dv-muted">{DV_SUPPORT_EMAIL}</p>
              </div>
              <a href={manageHref} className="dv-btn dv-btn-secondary shrink-0 px-5 py-2.5 text-sm !text-dv-teal">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t.manageButton}
              </a>
            </div>
          )}
          <AccountPanel part="billing" locale={locale} selfServe={selfServe} plan={plan} plans={plans} clinicName={profile?.name ?? ""} />
        </section>
      )}
      <AccountPanel part="data" locale={locale} selfServe={selfServe} plan={plan} plans={plans} clinicName={profile?.name ?? ""} accountEmail={accountEmail} initialDialog={initialDialog} />
    </main>
  );
}

export type ShootCard = { opening: string; points: string[]; closing: string; avoid?: string[]; setup?: string[]; minutes?: number };

export function RecordView({ locale, cards, plan }: { locale: Locale; cards: { title: string; card: ShootCard }[]; plan?: ClinicPlan | null }) {
  const text = appText(locale);
  const t = text.record;
  // Own recordings are part of Practice and Group; Starter sees what it would get instead of an upload that fails.
  const starter = plan?.plan === "active" && plan.tier === "starter";
  return (
    <main lang={locale} dir={dirOf(locale)} className={`${MAIN} max-w-5xl`}>
      <RememberLocale locale={locale} />
      <Link href={dvHref("/dentvideo/app")} className="-ms-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-medium text-dv-teal hover:underline">
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
        {t.backToVideos}
      </Link>
      <h1 className="dv-display mt-2 text-balance text-[2.5rem] leading-[1.05] text-dv-ink sm:text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-dv-body">{t.lead}</p>

      {starter ? (
        <section className="dv-card relative isolate mt-8 overflow-hidden p-6 sm:p-8">
          <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10 opacity-60" />
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-dv-teal-50 text-dv-teal ring-1 ring-inset ring-dv-teal/15">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="dv-display mt-4 text-balance text-[1.875rem] leading-tight text-dv-ink">{t.starterTitle}</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-dv-body">{t.starterLead}</p>
          <a href={mailtoHref(t.starterSubject)} className="dv-btn dv-btn-primary mt-6 w-full px-6 py-3 sm:w-auto">
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t.starterCta}
          </a>
          <p className="mt-3 text-sm text-dv-muted">{DV_SUPPORT_EMAIL}</p>
        </section>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <RecordUpload locale={locale} />
          <aside aria-labelledby="next-title" className="rounded-[1.25rem] bg-dv-sand/70 p-6 ring-1 ring-inset ring-dv-line">
            <h2 id="next-title" className="font-semibold text-dv-ink">{t.nextHeading}</h2>
            <ol className="mt-4 space-y-4">
              {t.next.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-dv-body">
                  <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-dv-teal ring-1 ring-dv-line">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}

      {!starter && (
        <>
          <h2 className="mt-14 text-xl font-semibold text-dv-ink">{t.cardsHeading}</h2>
          {cards.length === 0 ? (
            <p className="mt-3 text-dv-body">{t.noCards}</p>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(({ title, card }) => (
                <article key={title} className="dv-card flex flex-col p-5 sm:p-6">
                  <h3 className="font-semibold leading-snug text-dv-ink">{title}</h3>
                  <p className="mt-3 text-sm text-dv-body">
                    <span className="font-semibold text-dv-ink">{t.startWith}</span> {quote(locale, card.opening)}
                  </p>
                  <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-dv-body">
                    {card.points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-dv-body">
                    <span className="font-semibold text-dv-ink">{t.closeWith}</span> {quote(locale, card.closing)}
                  </p>
                  {(card.avoid?.length || card.setup?.length) && (
                    <div className="mt-auto pt-4">
                    <div className="space-y-1.5 border-t border-dv-line pt-3 text-xs">
                      {card.avoid?.length ? (
                        <p className="text-[#7a4b00]">
                          <span className="font-semibold">{t.avoid}</span> {card.avoid.join(" · ")}
                        </p>
                      ) : null}
                      {card.setup?.length ? (
                        <p className="text-dv-muted">
                          <span className="font-semibold">{t.filming}</span> {card.setup.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
