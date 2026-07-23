import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";

const target = process.env.BUILD_TARGET === "static" ? "static" : "tauri";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$platform: path.resolve("src/lib/platform", `${target}.ts`),
		},
	},
};

export default config;
