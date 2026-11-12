"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isClipforgePage } from "./AttributionCapture";

/**
 * ClipForge's toast container (sonner), on ClipForge's pages only.
 *
 * It sits in the root layout, which DentVideo's pages share. DentVideo never
 * shows a sonner toast, so there it renders nothing and sonner's code is
 * never downloaded; on ClipForge it arrives as its own small chunk right
 * after the page hydrates (every toast follows a click or a submit).
 */
const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), { ssr: false });

export function AppToaster() {
  const pathname = usePathname() ?? "";
  // The host is known only in the browser (dentvideo.com is served by this same app).
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => setHost(window.location.hostname), []);
  if (host === null || !isClipforgePage(host, pathname)) return null;
  return <Toaster richColors position="top-center" />;
}
