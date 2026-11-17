"use client";

import dynamic from "next/dynamic";

/**
 * The sign-up wizard (clinic, preview, plan), as a chunk of its own.
 *
 * /start shows either the account form (a new visitor) or this wizard (a
 * signed-in clinic). Imported directly by the page, the wizard's code (the
 * clinic form, plans and checkout) shipped to every new visitor too; through
 * here it loads only on the pages that render it. Still rendered on the
 * server, so the wizard's HTML arrives as before.
 */
export const LazyOnboarding = dynamic(() => import("./onboarding").then((m) => m.Onboarding));
