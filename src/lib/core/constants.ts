import { appLocalDataDir, join } from "@tauri-apps/api/path";

// normalize

export const ASSET_PROTOCOL = "http://asset.localhost";
export const DIR_BASE = appLocalDataDir();
export const DIR_GALLERY_DATA = "gallery-data";
export const FILE_ASSETS_XML = "assets.xml";
export const DIR_CONTAINERS = "containers";
export const FILE_MAP = "map.json";

export async function PATH_GALLERY_DATA(...paths: string[]) {
	const dir = await appLocalDataDir();
	return join(dir, DIR_GALLERY_DATA, ...paths);
}
