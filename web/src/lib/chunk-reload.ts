/**
 * Version skew during a deploy: a page opened before the rollout asks for
 * JS/CSS chunks of its own build, which the new server no longer has (404).
 * Next's router already falls back to a full page load when a *navigation*
 * meets a new build (build-ID mismatch), but a page whose own chunks fail
 * never hydrates or loses a lazy part — the sign-up form then did nothing.
 *
 * This inline script (root layout, ahead of Next's scripts) reloads the page
 * once when a /_next/static/ script or stylesheet fails to load, or when a
 * chunk / dynamic import fails later (ChunkLoadError, "Failed to fetch
 * dynamically imported module", …). A reload fetches the current HTML,
 * which names the current chunks. Loop guard: at most one automatic reload
 * per tab every RELOAD_GUARD_MS, and none at all when sessionStorage is
 * unavailable (no way to remember that it already tried).
 *
 * Next places its own async chunk scripts ahead of this one in <head>; their
 * error events still come after it has run (a failed fetch is reported in a
 * later task), and as a backstop the page's resource timings are checked on
 * `load` for a /_next/static/ script or stylesheet that came back 4xx/5xx.
 *
 * Kept as a plain-JS string, so it runs before React and needs no bundle.
 */

export const RELOAD_GUARD_KEY = "next-chunk-reload-at";
export const RELOAD_GUARD_MS = 60_000;

/** Messages and names of a chunk that failed to load, across bundlers and browsers. */
export const CHUNK_ERROR_SOURCE =
  "ChunkLoadError|Loading chunk [^ ]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS";

const CHUNK_ERROR = new RegExp(CHUNK_ERROR_SOURCE);

export function isChunkLoadError(e: unknown): boolean {
  if (!e) return false;
  if (typeof e === "string") return CHUNK_ERROR.test(e);
  const { name, message } = e as { name?: unknown; message?: unknown };
  return name === "ChunkLoadError" || (typeof message === "string" && CHUNK_ERROR.test(message));
}

/**
 * The same guarded reload, for React error boundaries (app/global-error):
 * true when it reloads, false when it already tried recently or cannot tell.
 */
export function reloadOnce(
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined,
  reload: () => void,
  now = Date.now(),
): boolean {
  try {
    if (!storage) return false;
    const last = Number(storage.getItem(RELOAD_GUARD_KEY)) || 0;
    if (now - last < RELOAD_GUARD_MS) return false;
    storage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}

export const CHUNK_RELOAD_SCRIPT =`(function(){
var K=${JSON.stringify(RELOAD_GUARD_KEY)},G=${RELOAD_GUARD_MS},R=new RegExp(${JSON.stringify(CHUNK_ERROR_SOURCE)});
function chunk(e){if(!e)return false;if(typeof e==="string")return R.test(e);return e.name==="ChunkLoadError"||(typeof e.message==="string"&&R.test(e.message));}
function reload(){try{var s=window.sessionStorage,t=Number(s.getItem(K))||0,n=Date.now();if(n-t<G)return;s.setItem(K,String(n));}catch(_){return;}window.location.reload();}
window.addEventListener("error",function(e){var t=e&&e.target;if(t&&t!==window&&(t.tagName==="SCRIPT"||t.tagName==="LINK")){var u=t.src||t.href||"";if(u.indexOf("/_next/static/")!==-1&&(t.tagName==="SCRIPT"||t.rel==="stylesheet"))reload();return;}if(chunk(e&&e.error)||chunk(e&&e.message))reload();},true);
window.addEventListener("unhandledrejection",function(e){if(chunk(e&&e.reason))reload();});
window.addEventListener("load",function(){try{var r=performance.getEntriesByType("resource");for(var i=0;i<r.length;i++){var x=r[i];if(x.responseStatus>=400&&x.name.indexOf("/_next/static/")!==-1&&(x.initiatorType==="script"||x.initiatorType==="link")){reload();return;}}}catch(_){}});
})();`;
