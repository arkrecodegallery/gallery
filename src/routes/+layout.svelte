<script lang="ts">
	import "../app.css";
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import { getCurrentWindow } from "@tauri-apps/api/window";

	let { children } = $props();

	window.addEventListener("keydown", async (e) => {
		if (e.key === "F11") {
			e.preventDefault();
			const appWindow = getCurrentWindow();
			const isFullscreen = await appWindow.isFullscreen();
			await appWindow.setFullscreen(!isFullscreen);
		}
	});
</script>

<Toaster position="top-center" />

{@render children()}
