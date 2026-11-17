import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { POST } from "./route";

const post = (referer?: string) =>
  POST(new Request("https://dentvideo.com/api/dentvideo/reload", { method: "POST", headers: referer ? { referer } : {}, body: "dv_hp_7f3=" }));

describe("POST /api/dentvideo/reload — a form submitted without its JavaScript", () => {
  it("sends the browser back to the page it was on (303, a GET), keeping the query", async () => {
    const r = post("https://dentvideo.com/start?lang=tr");
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/start?lang=tr");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("never to another site or an API, and /start when it cannot tell", async () => {
    expect(post("https://evil.example/phish").headers.get("location")).toBe("/phish");
    expect(post("https://dentvideo.com/api/dentvideo/signup").headers.get("location")).toBe("/start");
    expect(post("not a url").headers.get("location")).toBe("/start");
    expect(post().headers.get("location")).toBe("/start");
  });
});

describe("the sign-up form never submits natively as a GET", () => {
  it("posts to the reload route when its JavaScript did not run", () => {
    const src = readFileSync(path.join(__dirname, "../../../../components/dentvid/start-form.tsx"), "utf8");
    // A ValidatingForm (components/dentvid/validating-form) renders a plain <form> with these attributes.
    const form = src.match(/<(?:form|ValidatingForm)\b[^>]*>/)?.[0] ?? "";
    expect(form).toContain('method="post"');
    expect(form).toContain('action="/api/dentvideo/reload"');
    expect(form).toContain("onSubmit={submit}");
  });
});
