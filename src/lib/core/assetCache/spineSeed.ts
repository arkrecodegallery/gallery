import type { SpineCanvas } from "@esotericsoftware/spine-webgl";
import { parseAtlasPageImages } from "../atlasPages";
import { getAssetBytes, peekHotCache } from "./assetCache";
import { toDataUri } from "./dataUri";

function mimeForImage(name: string): string {
	if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
	return "image/png";
}

function pageImagePaths(atlasPath: string, atlasText: string): string[] {
	const atlasDir = atlasPath.slice(0, atlasPath.lastIndexOf("/") + 1);
	return parseAtlasPageImages(atlasText).map((name) => atlasDir + name);
}

// Spine's loadAssets increments a loop-driving counter synchronously, so
// loadBinary/loadTextureAtlas can't await cache/network bytes themselves -
// this resolves them ahead of time so loadModel() can stay synchronous.
export async function prepareSpineAssets(binary: string, atlas: string): Promise<void> {
	const atlasBytes = await getAssetBytes(atlas);
	const atlasText = new TextDecoder().decode(atlasBytes);
	await Promise.all([
		getAssetBytes(binary),
		...pageImagePaths(atlas, atlasText).map((path) => getAssetBytes(path)),
	]);
}

function seedIfHot(canvas: SpineCanvas, url: string, mime: string): ArrayBuffer | undefined {
	const bytes = peekHotCache(url);
	if (bytes) canvas.assetManager.setRawDataURI(url, toDataUri(bytes, mime));
	return bytes;
}

// Only serves already-warmed bytes; a miss falls through to spine's own fetch.
export function seedSpineAssets(canvas: SpineCanvas, binary: string, atlas: string): void {
	seedIfHot(canvas, binary, "application/octet-stream");

	const atlasBytes = peekHotCache(atlas);
	if (!atlasBytes) return;

	const atlasText = new TextDecoder().decode(atlasBytes);
	for (const path of pageImagePaths(atlas, atlasText)) {
		seedIfHot(canvas, path, mimeForImage(path));
	}
}
