import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Node-environment-only for now (issue #35) — pure game logic (scoring
// math, registry shape, atom caching, data-envelope unwrapping), no
// jsdom/React Testing Library yet. A component/hook test pass (e.g.
// useRoundGame.ts) is a deliberate follow-up given the extra setup cost
// (DOM environment, act(), fake timers, mocking nanostores/fetch).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
