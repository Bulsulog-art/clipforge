import { describe, it, expect, vi } from "vitest";
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
const { weekOf } = await import("./auth");

describe("weekOf", () => {
  it("returns the Monday of the week, in UTC", () => {
    expect(weekOf(new Date("2026-11-08T03:00:00Z"))).toBe("2026-11-02"); // Sunday → previous Monday
    expect(weekOf(new Date("2026-11-09T23:59:00Z"))).toBe("2026-11-09"); // Monday
    expect(weekOf(new Date("2026-11-11T12:00:00Z"))).toBe("2026-11-09"); // Wednesday
  });
});
