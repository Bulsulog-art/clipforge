import Link from "next/link";
import { dvHref } from "@/lib/dentvid/host";
import { ArrowLeftRight, Mail } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";
import { accountText } from "@/content/dentvideo-account";
import type { ClinicProfile } from "@/lib/dentvid/profile";
import type { ClinicPlan } from "@/lib/dentvid/plan";
import type { FirstWeekJob } from "@/lib/dentvid/first-week-state";
import { DV_SUPPORT_EMAIL, mailtoHref, quote } from "@/lib/dentvid/app-ui";
import { canRecord } from "@/lib/dentvid/storage-quota";
import { Library, type LibraryItem } from "./library";
import { RememberLocale } from "./chrome";
import { FirstWeek } from "./first-week";
import { PlanPanel, PlanStatus, type PlanOption } from "./plan-panel";
import { BillingIssuePanel, type BillingIssue } from "./billing-issue";
import { ClinicForm } from "./clinic-form";
import { AccountPanel } from "./account-panel";
import { RecordUpload } from "./record-upload";
import { HelpContact } from "./help-contact";
import { HelpLink } from "./help-link";
import { HELP } from "@/content/help";

/**
 * The screens of the signed-in app, as plain views of their data. The pages
 * under /dentvideo/app load the data (session, clinic, plan, items) and hand
 * it here; the dev harness (/dentvideo/dev/app) renders the same views from
 * fake data, so what is reviewed there is what clinics see.
 */


const MAIN = "mx-auto px-4 pb-20 pt-6 sm:px-6 sm:pt-10";

export function AppHomeView({
  locale,
  clinicName,
  country,
  plan,
  items,
  firstWeek,
  madeThisWeek,
  notice,
  plans,
  currentWeek,
  pollMs,
  weekDelay = null,
  billingIssue = null,
  firstWeekJob,
}: {
  locale: Locale;
  clinicName?: string;
  /** The clinic's country (profile.country): the plan cards show the currency the checkout charges. */
  country?: string | null;
  plan: ClinicPlan;
  items: LibraryItem[];
  firstWeek: boolean;
  madeThisWeek: boolean;
  notice: string | null;
  plans: PlanOption[];
  /** Monday of this week (YYYY-MM-DD). */
  currentWeek: string;
  pollMs?: number;
  /** This week's run is being retried / is delayed (lib/dentvid/ops-server readWeekDelay). */
  weekDelay?: "retrying" | "delayed" | null;
  /** Instead of the plan picker: update the card / payment being confirmed / cancelled but paid up (lib/dentvid/billing-state). */
  billingIssue?: BillingIssue | null;
  /** The first week's job in the queue (state null = missing; undefined = unknown), for the card's "try again". */
  firstWeekJob?: FirstWeekJob;
}) {
  const text = appText(locale);
  const t = text.home;
  const onlyFirstWeek = firstWeek && items.length === 0;
  // With a plan, "this week" (status + one action) is the page and its heading; without one, the plan comes first.
  const locked = !plan.canMake && !firstWeek;
  return (
    <main lang={locale} dir={dirOf(locale)} className={`${MAIN} max-w-6xl`}>
      <RememberLocale locale={locale} />
      {notice && (
        <p role="status" className="mb-6 rounded-xl bg-dv-teal-50 px-4 py-3 text-sm text-dv-teal ring-1 ring-inset ring-dv-teal/15">
          {notice}
        </p>
      )}
      {firstWeek && (
        <div className={onlyFirstWeek ? "" : "mb-10"}>
          <FirstWeek locale={locale} paid={plan.plan === "active"} pollMs={pollMs} delay={weekDelay} week={currentWeek} job={firstWeekJob} />
        </div>
      )}
      {!onlyFirstWeek && (
        <>
          {locked && (
            <header>
              <p className="text-sm font-medium text-dv-muted">{clinicName || t.yourClinic}</p>
              <h1 className="dv-display dv-h-page mt-1 text-dv-ink">{t.title}</h1>
            </header>
          )}
          {locked && (
            <div className="mt-8">
              {billingIssue ? (
                <BillingIssuePanel locale={locale} issue={billingIssue} clinicName={clinicName} keepVideos={items.length > 0} />
              ) : (
                <PlanPanel locale={locale} state={plan.plan} options={plans} country={country} keepVideos={items.length > 0} />
              )}
            </div>
          )}
          <div className={locked ? "mt-8" : ""}>
            <Library
              locale={locale}
              items={items}
              locked={!plan.canMake}
              canStartWeek={plan.canMake && !firstWeek && !madeThisWeek}
              currentWeek={currentWeek}
              weekDelay={weekDelay}
              country={country}
              clinicName={clinicName || t.yourClinic}
              heroLevel={firstWeek ? 2 : 1}
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
  selfServe = false,
  initialDialog = null,
  accountEmail = null,
  billingIssue = null,
  clinicId = null,
}: {
  locale: Locale;
  profile?: Partial<ClinicProfile>;
  /** The clinic's id, prefilled in the Help & contact email so support finds the account. */
  clinicId?: string | null;
  /** The login's address (the delete dialog accepts it when the clinic has no name). */
  accountEmail?: string | null;
  logoPath?: string | null;
  logoUrl?: string | null;
  plan: ClinicPlan | null;
  plans: PlanOption[];
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
      <h1 className="dv-display dv-h-page text-dv-ink">{t.title}</h1>
      <p className="mt-2 text-dv-body">{t.lead}</p>
      <div className="mt-8">
        <ClinicForm locale={locale} initial={profile} logoPath={logoPath} logoUrl={logoUrl} submitLabel={t.save} />
      </div>
      {plan && (
        <section aria-labelledby="billing-title" className="mt-14 border-t border-dv-line pt-10">
          <h2 id="billing-title" className="text-xl font-semibold text-dv-ink">{b.settingsHeading}</h2>
          <div className="mt-4">
            <PlanStatus locale={locale} state={plan.plan} tier={plan.tier} renewsAt={plan.renewsAt} endsAt={plan.endsAt ?? null} />
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
                <PlanPanel locale={locale} state={plan.plan} options={plans} country={profile?.country} />
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
          <AccountPanel part="billing" locale={locale} selfServe={selfServe} plan={plan} plans={plans} country={profile?.country} clinicName={profile?.name ?? ""} />
          <p className="mt-4 flex flex-col items-start gap-x-6 sm:flex-row sm:flex-wrap">
            <HelpLink locale={locale} id="invoices" label={HELP[locale].articles.invoices.q} />
            <HelpLink locale={locale} id="cancel" label={HELP[locale].articles.cancel.q} />
          </p>
        </section>
      )}
      <AccountPanel part="data" locale={locale} selfServe={selfServe} plan={plan} plans={plans} clinicName={profile?.name ?? ""} accountEmail={accountEmail} initialDialog={initialDialog} />
      <p className="mt-4">
        <HelpLink locale={locale} id="privacy-dpa" label={HELP[locale].articles["privacy-dpa"].q} />
      </p>
      <HelpContact locale={locale} clinicId={clinicId} clinicName={profile?.name} />
    </main>
  );
}

export type ShootCard = { opening: string; points: string[]; closing: string; avoid?: string[]; setup?: string[]; minutes?: number };

export function RecordView({
  locale,
  cards,
  plan,
  selfServe = false,
}: {
  locale: Locale;
  cards: { title: string; card: ShootCard }[];
  plan?: ClinicPlan | null;
  /** DODO_API_KEY is set: a Starter clinic switches to Practice itself in Settings instead of writing to us. */
  selfServe?: boolean;
}) {
  const text = appText(locale);
  const t = text.record;
  // Own recordings are part of Practice and Group. A clinic that cannot upload
  // (Starter, or no active plan at all) sees what Practice adds instead of an
  // upload form that is only refused after the file is picked.
  const starter = !canRecord(plan?.plan, plan?.tier);
  // Starter switches tier; a clinic with no plan chooses one (the plan panel on the videos page).
  const onStarter = plan?.plan === "active";
  return (
    <main lang={locale} dir={dirOf(locale)} className={`${MAIN} max-w-6xl`}>
      <RememberLocale locale={locale} />
      {/* No "back to videos" link: the Videos tab is always right above. On Starter the page is the upsell itself. */}
      <h1 className="dv-display dv-h-page text-dv-ink">{starter ? t.starterTitle : t.title}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-dv-body">{starter ? t.starterLead : t.lead}</p>

      {starter ? (
        <div className="mt-6">
          {!onStarter ? (
            <Link href={dvHref("/dentvideo/app#plans")} className="dv-btn dv-btn-primary w-full px-6 py-3 sm:w-auto" data-testid="choose-plan">
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              {fmt(text.billing.choose, { tier: text.billing.tiers.practice.name })}
            </Link>
          ) : selfServe ? (
            // The plan change is self-serve (Settings → Plan and billing): no email round trip.
            <Link href={dvHref("/dentvideo/app/settings#billing-title")} className="dv-btn dv-btn-primary w-full px-6 py-3 sm:w-auto" data-testid="starter-upgrade">
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              {fmt(accountText(locale).changeTo, { tier: text.billing.tiers.practice.name })}
            </Link>
          ) : (
            <>
              <a href={mailtoHref(t.starterSubject)} className="dv-btn dv-btn-primary w-full px-6 py-3 sm:w-auto">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t.starterCta}
              </a>
              <p className="mt-3 text-sm text-dv-muted">{DV_SUPPORT_EMAIL}</p>
            </>
          )}
          <p className="mt-3">
            <HelpLink locale={locale} id="plans" />
          </p>
        </div>
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
            <HelpLink locale={locale} id="record" className="mt-4" />
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
