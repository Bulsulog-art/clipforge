import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { appStoreText } from "@/content/dentvideo-app-store";
import { APP_STORE_MANAGE_URL } from "./apple-billing";
import { accountText } from "@/content/dentvideo-account";
import { dvLocale } from "./locale-server";

/** The signed-in owner's clinic row (or null), always scoped by owner_id. */
export async function ownClinic(db: SupabaseClient, ownerId: string): Promise<Record<string, unknown> | null> {
  const { data } = await db.from("dentvid_clinics").select("*").eq("owner_id", ownerId).maybeSingle();
  const row = (data as Record<string, unknown> | null) ?? null;
  // RLS already limits the read to the owner; this is the belt to its braces.
  return row && row.owner_id === ownerId ? row : null;
}

/** Account-screen messages in the clinic's language. */
export async function accountErrors(clinic: Record<string, unknown> | null) {
  const language = (clinic?.profile as { language?: string } | undefined)?.language;
  return accountText(await dvLocale(language)).errors;
}

/** 409 for a clinic whose plan the App Store bills (0026): changed or cancelled on the iPhone, never here. */
export async function appStoreManagedAnswer(clinic: Record<string, unknown> | null): Promise<NextResponse | null> {
  if (clinic?.billing_source !== "apple" || (clinic.plan !== "active" && clinic.plan !== "paused")) return null;
  const language = (clinic.profile as { language?: string } | undefined)?.language;
  const a = appStoreText(await dvLocale(language));
  return NextResponse.json({ error: a.body, code: "app_store", manageUrl: APP_STORE_MANAGE_URL }, { status: 409 });
}
