import { appLocalDataDir, join, sep } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import {
	DIR_CONTAINERS,
	DIR_GALLERY_DATA,
	FILE_ASSETS_XML,
	FILE_MAP,
} from "$lib/core/constants";
import type { Map as GalleryMap } from "$lib/core/types";
import type { Platform } from "./types";

const ASSET_PROTOCOL = "http://asset.localhost";
const DIR_BASE = appLocalDataDir();

async function pathGalleryData(...paths: string[]) {
	const dir = await DIR_BASE;
	return join(dir, DIR_GALLERY_DATA, ...paths);
}

async function assetUrl(...paths: string[]) {
	return `${ASSET_PROTOCOL}/${await pathGalleryData(...paths)}`;
}

export const platform: Platform = {
	async getContainerBaseUrl() {
		return assetUrl(DIR_CONTAINERS);
	},

	async loadMap() {
		const resp = await fetch(await assetUrl(FILE_MAP));
		return resp.json() as Promise<GalleryMap>;
	},

	async toggleFullscreen() {
		const appWindow = getCurrentWindow();
		const isFullscreen = await appWindow.isFullscreen();
		await appWindow.setFullscreen(!isFullscreen);
	},

	setup: {
		async createGalleryDataDir() {
			const path = await pathGalleryData();
			if (!(await exists(path))) {
				await mkdir(path);
			}
		},

		async revealGalleryDataDir() {
			const path = await pathGalleryData();
			if (await exists(path)) {
				await openPath(path);
			} else {
				await openPath(await DIR_BASE);
			}
		},

		async isGalleryDataDirReady() {
			const assetsExist = await exists(await pathGalleryData(FILE_ASSETS_XML));
			const containersExist = await exists(await pathGalleryData(DIR_CONTAINERS));
			return assetsExist && containersExist;
		},

		async processGalleryDataDir() {
			const path = (await pathGalleryData()) + sep();
			return invoke("generate_map", { dirGalleryData: path });
		},

		async isSetupComplete() {
			return exists(await pathGalleryData(FILE_MAP));
		},
	},
};
