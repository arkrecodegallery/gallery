import { listCacheMeta } from "./assetCacheStore";
import type { CacheMeta } from "./assetCacheLru";

let metaIndex: CacheMeta[] | null = null;
let metaIndexPromise: Promise<CacheMeta[]> | null = null;

export async function getMetaIndex(): Promise<CacheMeta[]> {
	if (metaIndex) return metaIndex;
	if (!metaIndexPromise) metaIndexPromise = listCacheMeta().catch(() => []);
	metaIndex = await metaIndexPromise;
	return metaIndex;
}

export function upsertMetaIndex(meta: CacheMeta): void {
	if (!metaIndex) return;
	metaIndex = [...metaIndex.filter((entry) => entry.url !== meta.url), meta];
}

export function removeFromMetaIndex(url: string): void {
	if (!metaIndex) return;
	metaIndex = metaIndex.filter((entry) => entry.url !== url);
}

export function resetMetaIndex(): void {
	metaIndex = [];
	metaIndexPromise = null;
}
