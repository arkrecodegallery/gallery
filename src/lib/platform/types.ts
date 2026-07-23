import type { Map as GalleryMap } from "$lib/core/types";

export interface Platform {
	/** Resolved once up front; callers build container URLs by concatenation. */
	getContainerBaseUrl(): Promise<string>;
	loadMap(): Promise<GalleryMap>;
	toggleFullscreen(): Promise<void>;
	setup?: SetupPlatform;
}

export interface SetupPlatform {
	createGalleryDataDir(): Promise<void>;
	isGalleryDataDirReady(): Promise<boolean>;
	isSetupComplete(): Promise<boolean>;
	processGalleryDataDir(): Promise<string>;
	revealGalleryDataDir(): Promise<void>;
}
