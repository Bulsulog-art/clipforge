import { defineConfig } from "vitest/config";

// The suite never calls a paid API: vitest.setup.ts drops any Anthropic key the shell carries.
export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
  },
});
