import type { Metadata } from "next";
import { ResetForm } from "@/components/dentvid/reset-form";

// dentvideo.com/reset — opened from the password-reset email.
export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token_hash?: string; lang?: string }> };

export default async function ResetPage({ searchParams }: Props) {
  const sp = await searchParams;
  return <ResetForm tokenHash={sp.token_hash ?? null} locale={sp.lang ?? "en"} />;
}
