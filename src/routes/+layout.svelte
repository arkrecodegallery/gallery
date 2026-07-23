<script lang="ts">
	import "../app.css";
	import { Toaster } from "$lib/components/ui/sonner/index.js";
	import { platform } from "$platform";

	let { children } = $props();

	window.addEventListener("keydown", async (e) => {
		if (e.key === "F11") {
			e.preventDefault();
			await platform.toggleFullscreen();
		}
	});
</script>

<Toaster position="top-center" />

{@render children()}
