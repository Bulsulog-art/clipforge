import Link from "next/link";
import { Fragment } from "react";
import { LANDING_PATH, dirOf, type Locale } from "@/content/dentvideo";
import { OPERATOR } from "@/content/guides/entity";
import {
  EMAIL_TOKENS,
  LEGAL,
  LEGAL_KINDS,
  LEGAL_NAV,
  LEGAL_UPDATED,
  SUBPROCESSORS,
  SUBPROCESSOR_IDS,
  legalPath,
  operatorAddress,
  parseLegal,
  type LegalBlock,
  type LegalKind,
} from "@/content/legal";
import { legalJsonLd, jsonLdHtml } from "@/lib/dentvid/seo-guides";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, HtmlLang } from "./guide-parts";

const linkCls = "font-medium text-dv-teal underline decoration-dv-teal/30 underline-offset-[3px] transition-colors hover:decoration-dv-teal";
const bodyCls = "text-[1.0625rem] leading-[1.75] text-[#33423f]";

/** Legal text with its {tokens} filled and [links](kind) to the same language's pages. */
function LegalInline({ text, locale }: { text: string; locale: Locale }) {
  return (
    <>
      {parseLegal(text, locale).map((p, i) => {
        if (p.kind === "text") return <Fragment key={i}>{p.text}</Fragment>;
        if (p.kind === "link")
          return (
            <Link key={i} href={dvHref(legalPath(p.to, locale))} className={linkCls}>
              {p.label}
            </Link>
          );
        if (EMAIL_TOKENS.has(p.name))
          return (
            <a key={i} href={`mailto:${p.value}`} dir="ltr" className={linkCls}>
              {p.value}
            </a>
          );
        // Names, numbers and prices: isolated, so right-to-left text cannot reorder them.
        return <bdi key={i}>{p.value}</bdi>;
      })}
    </>
  );
}

/** The operator's register data, the same in every document and language. */
export function OperatorDetails({ locale }: { locale: Locale }) {
  const o = LEGAL[locale].ui.operator;
  const rows: { label: string; value: React.ReactNode; testId?: string }[] = [
    { label: o.company, value: <bdi dir="ltr">{OPERATOR.legalName}</bdi>, testId: "legal-name" },
    {
      label: o.legalForm,
      value: (
        <>
          {o.legalFormValue}{" "}
          <bdi dir="ltr" lang="sr-Latn-ME">({OPERATOR.legalFormLocal})</bdi>
        </>
      ),
    },
    { label: o.office, value: <bdi>{operatorAddress(locale)}</bdi>, testId: "address" },
    { label: o.register, value: o.registerValue },
    { label: o.registrationNumber, value: <bdi dir="ltr">{OPERATOR.registrationNumber}</bdi>, testId: "reg-no" },
    { label: o.taxId, value: <bdi dir="ltr">{OPERATOR.taxId}</bdi>, testId: "tax-id" },
    { label: o.director, value: <bdi>{OPERATOR.director}</bdi> },
    {
      label: o.contact,
      value: (
        <>
          <a href={`mailto:${OPERATOR.productEmail}`} dir="ltr" className={linkCls}>{OPERATOR.productEmail}</a>
          {" · "}
          <a href={`mailto:${OPERATOR.companyEmail}`} dir="ltr" className={linkCls}>{OPERATOR.companyEmail}</a>
        </>
      ),
    },
    { label: o.brand, value: <LegalInline text={o.brandValue} locale={locale} /> },
  ];
  return (
    <dl data-testid="operator" className="mt-5 divide-y divide-dv-line overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-dv-line">
      {rows.map((r) => (
        <div key={r.label} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-6 sm:px-6">
          <dt className="text-sm font-semibold text-dv-ink">{r.label}</dt>
          <dd className="text-[0.9875rem] leading-relaxed text-dv-body [overflow-wrap:anywhere]" data-testid={r.testId}>
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The sub-processor list: stacked cards on phones, a table from sm up. */
export function SubprocessorTable({ locale }: { locale: Locale }) {
  const t = LEGAL[locale];
  const h = t.ui.table;
  return (
    <div data-testid="subprocessors" className="mt-5">
      <ul className="space-y-3 sm:hidden">
        {SUBPROCESSOR_IDS.map((id) => (
          <li key={id} className="rounded-[1.25rem] bg-white p-5 ring-1 ring-dv-line">
            <p className="font-semibold text-dv-ink">
              <a href={SUBPROCESSORS[id].url} target="_blank" rel="noopener noreferrer" className={linkCls}>{SUBPROCESSORS[id].name}</a>
            </p>
            <dl className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed text-dv-body">
              <div><dt className="inline font-semibold text-dv-ink">{h.purpose}: </dt><dd className="inline">{t.subprocessors[id].purpose}</dd></div>
              <div><dt className="inline font-semibold text-dv-ink">{h.data}: </dt><dd className="inline">{t.subprocessors[id].data}</dd></div>
              <div><dt className="inline font-semibold text-dv-ink">{h.location}: </dt><dd className="inline">{t.subprocessors[id].location}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-dv-line sm:block">
        <table className="w-full border-collapse text-start text-[0.9375rem] leading-relaxed">
          <thead className="bg-dv-sand/60 text-sm text-dv-ink">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{h.provider}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{h.purpose}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{h.data}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{h.location}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dv-line align-top text-dv-body">
            {SUBPROCESSOR_IDS.map((id) => (
              <tr key={id}>
                <th scope="row" className="px-4 py-3 text-start font-semibold text-dv-ink">
                  <a href={SUBPROCESSORS[id].url} target="_blank" rel="noopener noreferrer" className={linkCls}>{SUBPROCESSORS[id].name}</a>
                </th>
                <td className="px-4 py-3">{t.subprocessors[id].purpose}</td>
                <td className="px-4 py-3">{t.subprocessors[id].data}</td>
                <td className="px-4 py-3">{t.subprocessors[id].location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Block({ block, locale }: { block: LegalBlock; locale: Locale }) {
  if (typeof block === "string") return <p className={`mt-4 ${bodyCls}`}><LegalInline text={block} locale={locale} /></p>;
  if ("list" in block)
    return (
      <ul className={`mt-4 list-disc space-y-2.5 ps-6 marker:text-dv-teal ${bodyCls}`}>
        {block.list.map((li) => (
          <li key={li}><LegalInline text={li} locale={locale} /></li>
        ))}
      </ul>
    );
  if ("operator" in block) return <OperatorDetails locale={locale} />;
  return <SubprocessorTable locale={locale} />;
}

/** One legal document (Terms, Privacy, Refunds, DPA, Imprint) in the site's reading layout. */
export function LegalPage({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const t = LEGAL[locale];
  const doc = t.docs[kind];
  const nav = LEGAL_NAV[locale];
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${LEGAL_UPDATED}T00:00:00Z`));
  const [before, after] = (t.ui.prevails ?? "").split("{english}");
  return (
    <main lang={locale} dir={dirOf(locale)} data-legal={kind}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(legalJsonLd(kind, locale)) }} />
      <HtmlLang locale={locale} />
      <header className="relative isolate overflow-hidden border-b border-dv-line">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-14">
          <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[locale] }, { name: doc.title }]} />
          <h1 className="dv-display mt-6 text-[2.5rem] leading-[1.05] text-dv-ink [overflow-wrap:anywhere] sm:text-[3.5rem]">{doc.title}</h1>
          <p className="mt-4 text-sm text-dv-muted">
            {t.ui.updated}: <time dateTime={LEGAL_UPDATED}>{date}</time>
          </p>
          {t.ui.prevails && (
            <p data-testid="prevails" className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-dv-body ring-1 ring-dv-line">
              {before}
              <Link href={dvHref(legalPath(kind, "en"))} hrefLang="en" lang="en" className={linkCls}>{t.ui.englishVersion}</Link>
              {after}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        {doc.intro.map((p, i) => (
          <p key={i} className={`mt-8 ${bodyCls}`}><LegalInline text={p} locale={locale} /></p>
        ))}
        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-12">
            <h2 className="text-[1.375rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.5rem]">{s.heading}</h2>
            {s.blocks.map((b, i) => (
              <Block key={i} block={b} locale={locale} />
            ))}
          </section>
        ))}

        <nav aria-label={nav.legal} className="mt-16 border-t border-dv-line pt-6">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {LEGAL_KINDS.map((k) => (
              <li key={k}>
                {k === kind ? (
                  <span aria-current="page" className="font-semibold text-dv-ink">{nav.nav[k]}</span>
                ) : (
                  <Link href={dvHref(legalPath(k, locale))} className={linkCls}>{nav.nav[k]}</Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
