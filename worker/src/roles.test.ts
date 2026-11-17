import { describe, expect, it } from "vitest";
import { WORKER_ROLES, workerRoles } from "./roles.js";

describe("worker roles (WORKER_QUEUES)", () => {
  it("runs everything by default — one box does it all today", () => {
    expect([...workerRoles({})]).toEqual([...WORKER_ROLES]);
    expect([...workerRoles({ WORKER_QUEUES: "all" })]).toEqual([...WORKER_ROLES]);
  });
  it("a render-only server runs DentVideo renders and nothing else (no crons, no email, no schedulers)", () => {
    expect([...workerRoles({ WORKER_QUEUES: "dentvid" })]).toEqual(["dentvid"]);
  });
  it("ignores unknown names and spaces", () => {
    expect([...workerRoles({ WORKER_QUEUES: " dentvid , generate,bogus" })]).toEqual(["generate", "dentvid"]);
  });
});
