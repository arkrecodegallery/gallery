import path from "node:path";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: path.resolve("./src/lib")
		}
	},
	test: {
		include: ["src/**/*.test.ts"],
		setupFiles: ["./vitest.setup.ts"]
	}
});
