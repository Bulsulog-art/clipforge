import { fillRequests, requestsText } from "@/content/dentvideo-requests";
import { fill, lifecycleText } from "@/content/dentvideo-lifecycle";
import { dateLocale } from "./app-ui";
import { CONTACT_EMAIL, helpCenterLink, renderEmail, type Brand, type Rendered } from "./email-layout";
import { clinicLabel, tidy } from "./lifecycle-email";
import { isTestEmail, KindNotAllowedError, MissingSchemaError, zoneOf, type LifecycleConfig, type LifecycleStore, type Sender } from "./lifecycle";

/**
 * The two emails before a library is deleted (worker/src/dentvid/retention.ts
 * decides when; this sends): 14 days before and 1 day before, in the clinic's
 * language and the shared email design. Transactional — they are about the
 * clinic's own data, so they go even to a clinic that unsubscribed from
 * reminders — and each goes at most once per ended plan (dentvid_email_log
 * kind "retention14_<end day>" / "retention1_<end day>", which the worker
 * reads before it deletes anything).
 *
 * Never to a clinic whose plan is not cancelled: a clinic that subscribed
 * again in the meantime gets nothing.
 */

export type NoticeDays = 14 | 1;
export type NoticeResult = { sent: boolean; final: boolean; reason: string };

export function retentionKind(days: NoticeDays, endedAt: string): string {
  return `retention${days}_${endedAt.slice(0, 10).replace(/-/g, "_")}`;
}

/**
 * "16 February 2027" in the reader's language and the clinic's time zone; with the clinic's
 * country, "February 16, 2027" for an English clinic in the US, Canada, Australia or New
 * Zealand, as the app writes its dates (app-ui.ts dateLocale).
 */
export function noticeDate(lang: string, d: Date, timeZone = "UTC", country?: string | null): string {
  const locale = dateLocale(lang, country);
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone }).format(d);
  } catch {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  }
}

export function retentionEmail(args: {
  language: string;
  clinicName: string;
  days: NoticeDays;
  endedAt: Date;
  deleteOn: Date;
  timeZone?: string;
  /** The clinic's country (profile.country): picks the date format of an English clinic. */
  country?: string | null;
  appUrl: string;
  brand?: Brand;
}): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const t = requestsText(lang).email;
  const clinic = clinicLabel(args.clinicName);
  const vars = { ended: noticeDate(lang, args.endedAt, args.timeZone, args.country), date: noticeDate(lang, args.deleteOn, args.timeZone, args.country) };
  const last = args.days === 1;
  return renderEmail({
    lang,
    subject: fillRequests(last ? t.subject1 : t.subject14, vars),
    preheader: fillRequests(last ? t.preheader1 : t.preheader14, vars),
    title: fillRequests(last ? t.title1 : t.title14, vars),
    hello: tidy(fill(c.hello, { clinic, email: CONTACT_EMAIL })),
    blocks: [
      { kind: "p", text: fillRequests(last ? t.body1 : t.body14, vars) },
      { kind: "panel", text: t.keep },
    ],
    button: { label: t.button, url: args.appUrl },
    helpLink: helpCenterLink(lang, "after-cancel"),
    signoff: c.signoff,
    footer: t.footer,
    brand: { ...args.brand, name: clinic },
  });
}

/** Called by the worker (api/internal/dentvideo/retention). Never throws for an expected case. */
export async function sendRetentionNotice(
  deps: { store: LifecycleStore; send: Sender; config: Pick<LifecycleConfig, "base"> },
  args: { clinicId: string; days: NoticeDays; deleteOn: Date; endedAt: string },
): Promise<NoticeResult> {
  const { store } = deps;
  try {
    const clinic = await store.clinic(args.clinicId);
    if (!clinic) return { sent: false, final: true, reason: "no clinic" };
    // A clinic that subscribed again keeps everything: never tell it otherwise.
    if (clinic.plan !== "cancelled") return { sent: false, final: true, reason: "not ended" };
    const owner = await store.owner(clinic.owner_id);
    if (!owner?.email) return { sent: false, final: true, reason: "no email" };
    if (isTestEmail(owner.email)) return { sent: false, final: true, reason: "test account" };
    if (!owner.verified) return { sent: false, final: true, reason: "unverified" };
    const kind = retentionKind(args.days, args.endedAt);
    if (!(await store.claim(clinic.id, kind))) return { sent: false, final: true, reason: "already sent" };
    let logoUrl: string | null = null;
    if (clinic.logo_path && store.imageUrl) logoUrl = await store.imageUrl(clinic.logo_path).catch(() => null);
    const { lang } = lifecycleText(clinic.profile?.language);
    const msg = retentionEmail({
      language: lang,
      clinicName: clinic.profile?.name ?? "",
      days: args.days,
      endedAt: new Date(args.endedAt),
      deleteOn: args.deleteOn,
      timeZone: zoneOf(clinic),
      country: clinic.profile?.country ?? null,
      appUrl: `${deps.config.base}/app`,
      brand: { name: clinic.profile?.name ?? "", logoUrl, color: clinic.profile?.brandColor ?? null },
    });
    const ok = await deps.send(owner.email, msg, {
      idempotencyKey: `dentvideo-retention${args.days}-${clinic.id}-${args.endedAt.slice(0, 10)}`,
      log: { clinicId: clinic.id, kind: `retention${args.days}`, language: lang },
    });
    if (!ok) {
      await store.release(clinic.id, kind).catch(() => {});
      return { sent: false, final: false, reason: "send failed" };
    }
    return { sent: true, final: false, reason: "sent" };
  } catch (e) {
    if (e instanceof KindNotAllowedError || e instanceof MissingSchemaError) return { sent: false, final: false, reason: e.message };
    throw e;
  }
}
