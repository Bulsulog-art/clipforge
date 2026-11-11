import { csrfSecret, sameOrigin, verifyCsrf } from "./admin-csrf";
import { actionParams, actionTarget, parseAction, runAdminAction, type ActionCode, type ActionDeps, type ActionResult } from "./admin-actions";
import type { AuditEntry } from "./admin-audit";
import { backWithFlash } from "./admin-nav";
import type { AdminViewer } from "./admin-server";

/**
 * POST /api/dentvideo/admin/action — every owner action in the admin panel.
 * In order, any failure stopping the request:
 *
 *  1. an admin (DENTVIDEO_ADMIN_USER_IDS) is signed in — else 404, like the pages;
 *  2. the form came from this site (Origin / Sec-Fetch-Site) — else 403;
 *  3. its CSRF token matches this session (admin-csrf.ts) — else back with "bad_csrf";
 *  4. the action and its fields parse; the "I understand" box was ticked;
 *  5. the admin is within the action rate limit;
 *  6. the action runs (admin-actions.ts), and is audited with its outcome
 *     (dentvid_admin_actions, and the server log either way).
 *
 * The answer is a 303 back to the admin page the form was on, with a flash
 * code (never free text) the page turns into a message.
 */

export type RouteDeps = {
  viewer: () => Promise<AdminViewer | null>;
  allowedOrigins: string[];
  env?: Record<string, string | undefined>;
  /** True when the admin may act now (rate limit). */
  limit: (adminId: string) => Promise<boolean>;
  actions: () => ActionDeps;
  audit: (entry: AuditEntry) => Promise<"stored" | "logged">;
};

const redirect = (to: string) => new Response(null, { status: 303, headers: { Location: to, "Cache-Control": "no-store" } });

async function formOf(req: Request): Promise<Record<string, string> | null> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(type)) return null;
  try {
    const fd = await req.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v.length <= 2000) out[k] = v;
    return out;
  } catch {
    return null;
  }
}

export async function handleAdminAction(req: Request, deps: RouteDeps): Promise<Response> {
  const viewer = await deps.viewer();
  if (!viewer) return new Response("Not found", { status: 404 });

  const origin = sameOrigin(
    {
      origin: req.headers.get("origin"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      host: req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
      proto: req.headers.get("x-forwarded-proto"),
    },
    deps.allowedOrigins,
  );
  if (!origin) return new Response("Bad Origin", { status: 403 });

  const form = await formOf(req);
  const back = (code: ActionCode) => redirect(backWithFlash(form?.back, code));
  if (!form) return back("bad_request");
  if (!verifyCsrf(form.csrf, viewer.id, viewer.sessionId, csrfSecret(deps.env ?? process.env))) return back("bad_csrf");
  const input = parseAction(form);
  if (!input) return back("bad_request");
  if (form.confirm !== "yes") return back("not_confirmed");
  if (!(await deps.limit(viewer.id))) return back("rate_limited");

  let result: ActionResult;
  try {
    result = await runAdminAction(input, deps.actions());
  } catch (e) {
    result = { outcome: "error", code: "error", detail: (e as Error).message };
  }
  const t = actionTarget(input);
  const audited = await deps.audit({
    adminId: viewer.id,
    adminEmail: viewer.email,
    action: input.action,
    clinicId: result.clinicId ?? t.clinicId,
    target: t.target,
    params: actionParams(input),
    outcome: result.outcome,
    detail: [result.code, result.detail].filter(Boolean).join(": "),
  });
  // A successful change that could not be stored in the audit table says so (it is in the server log).
  return back(result.outcome === "ok" && audited === "logged" ? "not_audited" : result.code);
}

