import { describe, expect, it } from "vitest";
import { pressWatch } from "./after-press";

/**
 * The sign-up's typo hint waits for a press to end (after-press.ts). These are
 * the event orders browsers send, played on a real EventTarget; `later` is
 * collected by hand so each step can be looked at.
 */

function setup() {
  const doc = new EventTarget();
  const timers: (() => void)[] = [];
  const watch = pressWatch(doc, (fn) => timers.push(fn));
  const send = (...types: string[]) => types.forEach((t) => doc.dispatchEvent(new Event(t)));
  const tick = () => timers.splice(0).forEach((fn) => fn());
  return { doc, watch, send, tick, timers };
}

describe("a change held back until the press is over", () => {
  it("nothing pressed (the field left with Tab): runs at once", () => {
    const { watch } = setup();
    const ran: string[] = [];
    watch.after(() => ran.push("hint"));
    expect(ran).toEqual(["hint"]);
  });

  it("a mouse press: waits through the press, and runs after the click that ends it", () => {
    const { watch, send, tick } = setup();
    const ran: string[] = [];
    send("pointerdown", "mousedown");
    watch.after(() => ran.push("hint")); // the field is left here
    expect(ran).toEqual([]);
    send("pointerup");
    expect(ran, "not inside the release: the click is still to come").toEqual([]);
    send("mouseup", "click");
    tick();
    expect(ran).toEqual(["hint"]);
    tick();
    expect(ran, "once").toEqual(["hint"]);
  });

  it("a finger's tap: the pointer is already up when focus moves, the mouse events that follow are the press", () => {
    const { watch, send, tick } = setup();
    const ran: string[] = [];
    send("pointerdown", "pointerup", "mousedown");
    watch.after(() => ran.push("hint"));
    expect(ran).toEqual([]);
    send("mouseup", "click");
    tick();
    expect(ran).toEqual(["hint"]);
  });

  it.each(["pointercancel", "dragend"])("a press that ends with %s still lets it run", (end) => {
    const { watch, send, tick } = setup();
    const ran: string[] = [];
    send("pointerdown", "mousedown");
    watch.after(() => ran.push("hint"));
    send(end);
    tick();
    expect(ran).toEqual(["hint"]);
  });

  it("several held back run in order, and the next press starts clean", () => {
    const { watch, send, tick } = setup();
    const ran: string[] = [];
    send("mousedown");
    watch.after(() => ran.push("a"));
    watch.after(() => ran.push("b"));
    send("mouseup");
    tick();
    expect(ran).toEqual(["a", "b"]);
    watch.after(() => ran.push("c"));
    expect(ran, "nothing pressed now").toEqual(["a", "b", "c"]);
  });

  it("a release with nothing held back schedules nothing", () => {
    const { send, timers } = setup();
    send("pointerdown", "mousedown", "pointerup", "mouseup", "click");
    expect(timers).toHaveLength(0);
  });

  it("stop: no longer listens, and drops what was held back", () => {
    const { watch, send, tick } = setup();
    const ran: string[] = [];
    send("mousedown");
    watch.after(() => ran.push("held"));
    watch.stop();
    send("mouseup");
    tick();
    expect(ran).toEqual([]);
  });

  it("listens in the capture phase, so a handler that stops the event cannot hide a press", () => {
    const calls: [string, boolean][] = [];
    const doc = { addEventListener: (t: string, _f: unknown, capture: boolean) => calls.push([t, capture]), removeEventListener: () => {} } as unknown as EventTarget;
    pressWatch(doc);
    expect(calls.map(([t]) => t).sort()).toEqual(["dragend", "mousedown", "mouseup", "pointercancel", "pointerdown", "pointerup"]);
    expect(calls.every(([, capture]) => capture === true)).toBe(true);
  });

  it("by default runs on a zero timer after the release, not inside it", async () => {
    const doc = new EventTarget();
    const watch = pressWatch(doc);
    const ran: string[] = [];
    doc.dispatchEvent(new Event("mousedown"));
    watch.after(() => ran.push("hint"));
    doc.dispatchEvent(new Event("mouseup"));
    doc.dispatchEvent(new Event("click"));
    expect(ran).toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
    expect(ran).toEqual(["hint"]);
    watch.stop();
  });
});
