/**
 * Holds back a change that moves the page until the press going on is over.
 *
 * A click only reaches a button if the press and the release land on it. If
 * the page moves in between, the release lands on something else and the
 * browser sends no click: the button the person pressed does nothing. Leaving
 * the sign-up's email field by pressing "Create account" is such a press, and
 * the typo hint that leaving shows would push the button down under the
 * pointer. So the hint waits for the release.
 *
 * A mouse gives pointerdown, mousedown (focus moves here), pointerup, mouseup,
 * click. A finger's tap gives pointerdown and pointerup first, then mousedown
 * (focus moves here), mouseup and click together. Either way the field is left
 * while a press is down, and the click goes out in the same task as the last
 * release, so a zero timer after the release runs after the click.
 */
export type PressWatch = {
  /** Runs `fn` now if nothing is pressed, else once the press is over. */
  after(fn: () => void): void;
  stop(): void;
};

const PRESS = ["pointerdown", "mousedown"];
// A press can also end without a mouseup: a touch turned into a scroll, or a drag.
const RELEASE = ["pointerup", "mouseup", "pointercancel", "dragend"];

export function pressWatch(target: EventTarget, later: (fn: () => void) => void = (fn) => void setTimeout(fn, 0)): PressWatch {
  let down = false;
  let queue: (() => void)[] = [];
  const press = () => {
    down = true;
  };
  const release = () => {
    down = false;
    if (!queue.length) return;
    const run = queue;
    queue = [];
    later(() => run.forEach((fn) => fn()));
  };
  // Capture: seen before any handler on the page can stop it.
  for (const t of PRESS) target.addEventListener(t, press, true);
  for (const t of RELEASE) target.addEventListener(t, release, true);
  return {
    after(fn) {
      if (down) queue.push(fn);
      else fn();
    },
    stop() {
      for (const t of PRESS) target.removeEventListener(t, press, true);
      for (const t of RELEASE) target.removeEventListener(t, release, true);
      queue = [];
    },
  };
}
