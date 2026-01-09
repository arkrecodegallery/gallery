import { openPath } from "@tauri-apps/plugin-opener";
import {
	DIR_BASE,
	DIR_CONTAINERS,
	FILE_ASSETS_XML,
	FILE_MAP,
	PATH_GALLERY_DATA,
} from "./constants";
import { exists, mkdir, readTextFileLines } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { sep } from "@tauri-apps/api/path";

export async function createGalleryDataDir() {
	const path = await PATH_GALLERY_DATA();
	const ex = await exists(path);
	if (!ex) {
		await mkdir(path);
	}
}

export async function revealGalleryDataDir() {
	const path = await PATH_GALLERY_DATA();
	const ex = await exists(path);
	if (ex) {
		await openPath(path);
	} else {
		await openPath(await DIR_BASE);
	}
}

export async function isGalleryDataDirReady(): Promise<boolean> {
	const assetsPath = await PATH_GALLERY_DATA(FILE_ASSETS_XML);
	const assetsExist = await exists(assetsPath);

	const containersPath = await PATH_GALLERY_DATA(DIR_CONTAINERS);
	const containersExist = await exists(containersPath);

	return assetsExist && containersExist;
}

export async function processGalleryDataDir(): Promise<string> {
	const path = (await PATH_GALLERY_DATA()) + sep();
	return invoke("generate_map", { dirGalleryData: path });
}

export async function isSetupComplete(): Promise<boolean> {
	const path = await PATH_GALLERY_DATA(FILE_MAP);
	return exists(path);
}
