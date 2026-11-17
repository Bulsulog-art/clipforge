import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDvGeo, resetDvGeo } from "./geo-client";

const reply = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);

afterEach(() => {
  resetDvGeo();
  vi.unstubAllGlobals();
});

describe("geo-client: one /api/dentvideo/geo request per page, shared", () => {
  it("the price tags and the consent prompt share one in-flight request and its answer", async () => {
    const fetchMock = vi.fn(() => reply({ country: "TR", consentRequired: false }));
    vi.stubGlobal("fetch", fetchMock);
    const [a, b, c] = await Promise.all([fetchDvGeo(), fetchDvGeo(), fetchDvGeo()]);
    expect(await fetchDvGeo()).toEqual({ country: "TR", consentRequired: false });
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/dentvideo/geo", { credentials: "omit" });
  });

  it("anything but a clear 'not required' means consent is asked", async () => {
    vi.stubGlobal("fetch", vi.fn(() => reply({ country: null })));
    expect(await fetchDvGeo()).toEqual({ country: null, consentRequired: true });
  });

  it("a failed request is not cached: the next caller asks again", async () => {
    const fetchMock = vi.fn().mockImplementationOnce(() => Promise.reject(new Error("offline"))).mockImplementationOnce(() => reply({}, false)).mockImplementation(() => reply({ country: "DE", consentRequired: true }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchDvGeo()).toBeNull();
    expect(await fetchDvGeo()).toBeNull();
    expect(await fetchDvGeo()).toEqual({ country: "DE", consentRequired: true });
    expect(await fetchDvGeo()).toEqual({ country: "DE", consentRequired: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
