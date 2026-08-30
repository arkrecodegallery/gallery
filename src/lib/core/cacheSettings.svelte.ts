export const cacheSizePresetsMB = [250, 500, 750, 1000, 2000] as const;

export const defaultCacheSizeMB = 750;

const STORAGE_KEY = "assetCacheMaxMB";

function loadCacheSizeMB(): number {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return defaultCacheSizeMB;

	const parsed = Number(stored);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultCacheSizeMB;
}

export const cacheSettings: { maxSizeMB: number } = $state({
	maxSizeMB: loadCacheSizeMB(),
});

export function setCacheSizeMB(mb: number) {
	cacheSettings.maxSizeMB = mb;
	localStorage.setItem(STORAGE_KEY, String(mb));
}

export function getCacheSizeBytes(): number {
	return cacheSettings.maxSizeMB * 1024 * 1024;
}
