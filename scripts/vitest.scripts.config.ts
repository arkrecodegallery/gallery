import { defineConfig } from "vitest/config";

/**
 * Separate config for dormant diagnostic scripts under scripts/*.test.ts.
 * Kept out of vitest.config.ts's include so these never run as part of
 * `npm run test` - invoke explicitly with:
 *   npx vitest run --config scripts/vitest.scripts.config.ts
 */
export default defineConfig({
	test: {
		include: ["scripts/**/*.test.ts"],
	},
});
