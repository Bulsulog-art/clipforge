import type { WebpackOverrideFn } from "@remotion/bundler";

/**
 * Lets the bundler follow the same imports Node does.
 *
 * The worker is ESM, so its TypeScript imports carry explicit `.js`
 * extensions — that is what Node requires at runtime for the modules it loads
 * directly (scene-plan, theme, animation). Webpack takes those literally and
 * looks for a `Root.js` that was never emitted, because the source is
 * `Root.tsx`.
 *
 * `extensionAlias` closes the gap: a request for `./Root.js` is satisfied by
 * `./Root.tsx` or `./Root.ts`. That keeps one import style across the whole
 * worker instead of two conventions split by which tool happens to read the
 * file.
 */
export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    extensionAlias: {
      ...(config.resolve?.extensionAlias ?? {}),
      ".js": [".tsx", ".ts", ".js"],
    },
  },
});
