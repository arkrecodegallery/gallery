import { base } from "$app/paths";
import { DIR_CONTAINERS, DIR_GALLERY_DATA, FILE_MAP } from "$lib/core/constants";
import type { Map as GalleryMap } from "$lib/core/types";
import type { Platform } from "./types";

function dataUrl(...paths: string[]) {
	return [base, DIR_GALLERY_DATA, ...paths].join("/");
}

export const platform: Platform = {
	async getContainerBaseUrl() {
		return dataUrl(DIR_CONTAINERS);
	},

	async loadMap() {
		const resp = await fetch(dataUrl(FILE_MAP));
		return resp.json() as Promise<GalleryMap>;
	},

	async toggleFullscreen() {
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		} else {
			await document.documentElement.requestFullscreen();
		}
	},
};
