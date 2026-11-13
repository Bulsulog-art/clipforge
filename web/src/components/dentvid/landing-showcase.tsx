import { ArrowRight, Building2, CalendarDays, Clapperboard, Users } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { sampleSrc, samplesFor } from "@/content/dentvideo-samples";
import { SHOWCASE, marketName, ruleMarketsFor, type RuleMarket } from "@/content/dentvideo-showcase";

/* ------------------------------------------------------------------ */
/* Flags: simplified inline SVG (3:2), no image requests, no emoji      */
/* (emoji flags render as two letters on Windows).                     */
/* ------------------------------------------------------------------ */

function FlagShapes({ code }: { code: RuleMarket["code"] }) {
  switch (code) {
    case "TR":
      return (
        <>
          <rect width="30" height="20" fill="#E30A17" />
          <circle cx="11" cy="10" r="5" fill="#fff" />
          <circle cx="12.25" cy="10" r="4" fill="#E30A17" />
          <polygon fill="#fff" points="15.2,10 18.9,8.8 16.6,11.95 16.6,8.05 18.9,11.2" />
        </>
      );
    case "DE":
      return (
        <>
          <rect width="30" height="6.67" fill="#000" />
          <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
          <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
        </>
      );
    case "AT":
      return (
        <>
          <rect width="30" height="20" fill="#C8102E" />
          <rect y="6.67" width="30" height="6.67" fill="#fff" />
        </>
      );
    case "CH":
      return (
        <>
          <rect width="30" height="20" fill="#DA291C" />
          <rect x="13" y="4" width="4" height="12" fill="#fff" />
          <rect x="9" y="8" width="12" height="4" fill="#fff" />
        </>
      );
    case "ES":
      return (
        <>
          <rect width="30" height="20" fill="#AA151B" />
          <rect y="5" width="30" height="10" fill="#F1BF00" />
        </>
      );
    case "MX":
      return (
        <>
          <rect width="10" height="20" fill="#006847" />
          <rect x="10" width="10" height="20" fill="#fff" />
          <rect x="20" width="10" height="20" fill="#CE1126" />
          <circle cx="15" cy="10" r="2.6" fill="#8C5A2B" />
        </>
      );
    case "JP":
      return (
        <>
          <rect width="30" height="20" fill="#fff" />
          <circle cx="15" cy="10" r="6" fill="#BC002D" />
        </>
      );
    case "GULF":
      // The UAE flag stands for the six GCC states that share one rule set.
      return (
        <>
          <rect width="30" height="6.67" fill="#00732F" />
          <rect y="6.67" width="30" height="6.67" fill="#fff" />
          <rect y="13.33" width="30" height="6.67" fill="#000" />
          <rect width="8" height="20" fill="#FF0000" />
        </>
      );
    case "PL":
      return (
        <>
          <rect width="30" height="10" fill="#fff" />
          <rect y="10" width="30" height="10" fill="#DC143C" />
        </>
      );
    case "SG":
      return (
        <>
          <rect width="30" height="10" fill="#EF3340" />
          <rect y="10" width="30" height="10" fill="#fff" />
          <circle cx="6.5" cy="5" r="3.4" fill="#fff" />
          <circle cx="7.9" cy="5" r="3.2" fill="#EF3340" />
          {[
            [11, 3],
            [13, 4.4],
            [12.3, 6.6],
            [9.7, 6.6],
            [9, 4.4],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.65" fill="#fff" />
          ))}
        </>
      );
  }
}

export function Flag({ code, className = "" }: { code: RuleMarket["code"]; className?: string }) {
  const id = `dv-flag-${code}`;
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`} data-flag={code}>
      <clipPath id={id}>
        <rect width="30" height="20" rx="3" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <FlagShapes code={code} />
      </g>
      <rect x="0.5" y="0.5" width="29" height="19" rx="2.5" fill="none" stroke="rgba(0,0,0,0.18)" />
    </svg>
  );
}

/** Under "Checked twice": the markets whose own rules the reviewer is briefed with — names only, never a compliance seal. */
export function CountryRules({ locale }: { locale: Locale }) {
  const r = SHOWCASE[locale].rules;
  return (
    <div className="mt-14 border-t border-white/10 pt-10 lg:mt-20 lg:pt-14" data-country-rules>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{r.heading}</h3>
          <p className="mt-3 max-w-md leading-relaxed text-[#cfe2df]">{r.text}</p>
        </div>
        <ul className="flex flex-wrap content-start gap-2.5">
          {ruleMarketsFor(locale).map((m) => (
            <li
              key={m.code}
              data-market={m.code}
              className="inline-flex items-center gap-2.5 rounded-xl bg-white/[0.06] py-2 pe-3.5 ps-2.5 ring-1 ring-inset ring-white/10"
            >
              <Flag code={m.code} className="h-[14px] w-[21px]" />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-white">{marketName(locale, m.code)}</span>
                <span lang={m.code === "JP" ? "ja" : undefined} dir="ltr" className="text-xs text-[#a9cdc6] rtl:text-end">
                  {m.rule}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-[#a9cdc6] lg:ms-[calc(45%+1.5rem)]">{r.note}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The profile story: a demo clinic's grid today, and four Mondays on.  */
/* ------------------------------------------------------------------ */

const OLD_POSTS = [Building2, CalendarDays, Users, Building2];
const OLD_TINTS = ["#d9d3c8", "#e4ddd1", "#d2cbbf", "#ded7cb"];

/** One of the clinic's old, occasional posts: a muted photo stand-in. */
function OldPost({ i }: { i: number }) {
  const Icon = OLD_POSTS[i % OLD_POSTS.length];
  return (
    <span className="flex h-full w-full items-center justify-center" style={{ background: OLD_TINTS[i % OLD_TINTS.length] }}>
      <Icon className="h-1/3 w-1/3 text-[#9c9384]" strokeWidth={1.5} />
    </span>
  );
}

const NEW_TINTS = [
  "from-[#1a6b66] to-[#0b3f3e]",
  "from-[#2a7b72] to-[#0f5c5c]",
  "from-[#0f5c5c] to-[#082e2d]",
  "from-[#b6774f] to-[#7c4a2c]",
  "from-[#1f6f6a] to-[#0b3f3e]",
  "from-[#3b8b80] to-[#145f5a]",
];

/** A drawn DentVideo reel: brand gradient, two caption lines, the reel mark. */
function DrawnReel({ i }: { i: number }) {
  return (
    <span className={`relative block h-full w-full bg-gradient-to-b ${NEW_TINTS[i % NEW_TINTS.length]}`}>
      <span className="absolute inset-x-[14%] top-[42%] space-y-[6%]">
        <span className="block h-[5px] w-full rounded-full bg-white/80" />
        <span className="block h-[5px] w-2/3 rounded-full bg-white/55" />
      </span>
      <Clapperboard className="absolute end-[8%] top-[8%] h-3 w-3 text-white/80" aria-hidden="true" />
    </span>
  );
}

function PosterReel({ locale, slug }: { locale: Locale; slug: string }) {
  return (
    <span className="relative block h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sampleSrc(locale, slug, "jpg")} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      <Clapperboard className="absolute end-[8%] top-[8%] h-3 w-3 text-white/90 drop-shadow" aria-hidden="true" />
    </span>
  );
}

/** The drawn profile header: avatar, the demo clinic's name, three stat placeholders (no numbers on purpose). */
function ProfileHead({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3 pb-3 pt-3.5 sm:gap-3 sm:px-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-[2px] sm:h-11 sm:w-11 ${muted ? "bg-[#ddd5c8]" : "bg-gradient-to-tr from-[#b6774f] via-[#8fd1c6] to-[#0f5c5c]"}`}>
        <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
          <span className="h-3 w-3 rounded-[4px] bg-dv-teal sm:h-3.5 sm:w-3.5" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[0.6875rem] font-semibold leading-tight text-dv-ink sm:line-clamp-1 sm:text-[0.8125rem]">{name}</p>
        <div className="mt-1.5 flex gap-1.5">
          {[0, 1, 2].map((k) => (
            <span key={k} className="h-1.5 flex-1 rounded-full bg-dv-ink/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeedStory({ locale }: { locale: Locale }) {
  const f = SHOWCASE[locale].feed;
  const week = samplesFor(locale);
  // Four Mondays on: the newest reels first (three of them the real sample posters), the old posts pushed down a row.
  const fresh: ({ poster: string } | { drawn: number })[] = [
    week ? { poster: week[0].slug } : { drawn: 0 },
    { drawn: 1 },
    week ? { poster: week[1].slug } : { drawn: 2 },
    { drawn: 3 },
    week ? { poster: week[2].slug } : { drawn: 4 },
    { drawn: 5 },
    { drawn: 2 },
    { drawn: 0 },
    { drawn: 4 },
  ];
  return (
    <section id="profile" aria-labelledby="profile-heading" className="relative isolate overflow-hidden" data-feed-story>
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10 opacity-80" />
      <div className="mx-auto max-w-6xl px-4 pb-4 pt-24 sm:px-6 sm:pb-8 sm:pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-dv-teal">{f.eyebrow}</p>
          <h2 id="profile-heading" className="dv-display dv-h2 mt-4 text-balance text-[2.375rem] leading-[1.05] sm:text-5xl lg:text-[3.5rem]">
            {f.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-dv-body">{f.text}</p>
        </div>

        <div aria-hidden="true" className="mx-auto mt-12 grid max-w-[40rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2.5 sm:gap-6 lg:mt-16">
          {/* Today */}
          <figure className="dv-reveal min-w-0">
            <p className="mb-3 flex min-h-[2.5rem] items-end justify-center text-center text-xs font-semibold uppercase leading-tight tracking-[0.08em] text-dv-muted sm:min-h-0 sm:text-sm">{f.today}</p>
            <div className="dv-card overflow-hidden opacity-95 grayscale-[35%]">
              <ProfileHead name={f.clinic} muted />
              <div className="grid grid-cols-3 gap-px bg-dv-line/70">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className="block aspect-[3/4] bg-[#f6f2ec]">
                    {i < 4 ? <OldPost i={i} /> : null}
                  </span>
                ))}
              </div>
            </div>
            <figcaption className="mt-3 text-center text-[0.8125rem] leading-snug text-dv-muted sm:text-sm">{f.todayCaption}</figcaption>
          </figure>

          <span className="mt-[55%] flex h-8 w-8 items-center justify-center rounded-full bg-white text-dv-teal shadow-[0_6px_16px_-8px_rgba(15,92,92,0.5)] ring-1 ring-dv-line sm:h-11 sm:w-11">
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100 sm:h-5 sm:w-5" />
          </span>

          {/* Four Mondays later */}
          <figure className="dv-reveal min-w-0">
            <p className="mb-3 flex min-h-[2.5rem] items-end justify-center text-center text-xs font-semibold uppercase leading-tight tracking-[0.08em] text-dv-teal sm:min-h-0 sm:text-sm">{f.later}</p>
            <div className="dv-card overflow-hidden ring-1 ring-dv-teal/25">
              <ProfileHead name={f.clinic} />
              <div className="grid grid-cols-3 gap-px bg-dv-line/70">
                {fresh.map((t, i) => (
                  <span key={i} className="block aspect-[3/4] overflow-hidden">
                    {"poster" in t ? <PosterReel locale={locale} slug={t.poster} /> : <DrawnReel i={t.drawn} />}
                  </span>
                ))}
                {[0, 1, 2].map((i) => (
                  <span key={`old-${i}`} className="block aspect-[3/4] overflow-hidden">
                    <OldPost i={i} />
                  </span>
                ))}
              </div>
            </div>
            <figcaption className="mt-3 text-center text-[0.8125rem] font-medium leading-snug text-dv-ink sm:text-sm">{f.laterCaption}</figcaption>
          </figure>
        </div>
        {/* The figures are drawn: the words that matter are repeated for screen readers. */}
        <p className="sr-only">
          {f.today}: {f.todayCaption}. {f.later}: {f.laterCaption}.
        </p>
        <p className="mt-10 text-center text-sm text-dv-muted">{f.note}</p>
      </div>
    </section>
  );
}
