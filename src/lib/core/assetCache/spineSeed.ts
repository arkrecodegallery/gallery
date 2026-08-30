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

// Warms the byte cache ahead of a synchronous loadModel() call: spine's own
// asset-loading lifecycle requires loadBinary/loadTextureAtlas to fire in
// the same tick as loadAssets (it increments a loop-driving counter), so
// resolving cache/network bytes can't happen inside that call - it must
// happen before it, here.
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

// Synchronous: only ever serves already-warmed bytes via setRawDataURI. A
// miss here just falls through to spine's normal network fetch.
export function seedSpineAssets(canvas: SpineCanvas, binary: string, atlas: string): void {
	seedIfHot(canvas, binary, "application/octet-stream");

	const atlasBytes = peekHotCache(atlas);
	if (!atlasBytes) return;

	const atlasText = new TextDecoder().decode(atlasBytes);
	for (const path of pageImagePaths(atlas, atlasText)) {
		seedIfHot(canvas, path, mimeForImage(path));
	}
}
