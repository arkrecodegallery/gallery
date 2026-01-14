import type { SpineCanvas } from "@esotericsoftware/spine-webgl";
import { store } from "$lib/hooks/state.svelte";
import type { Entry } from "./types";
import { ASSET_PROTOCOL, DIR_CONTAINERS } from "./constants";

export class AssetManager {
	base: string = "";

	prevBinary: string = "";
	prevAtlas: string = "";
	binary: string = "";
	atlas: string = "";
	loadedBinary: boolean = false;
	loadedAtlas: boolean = false;

	constructor(basePath: string) {
		this.base = basePath;
	}

	public loadModel(canvas: SpineCanvas, entry: Entry) {
		store.loading = true;
		let assets = this.getAssets(entry);

		const binary = this.path(assets[0]);
		const atlas = this.path(assets[1]);

		if (this.binary === binary && this.atlas === atlas) {
			this.loadingComplete();
			return;
		}

		const disposeBinary = this.prevBinary;
		const disposeAtlas = this.prevAtlas;
		this.prevBinary = this.binary;
		this.prevAtlas = this.atlas;
		this.binary = binary;
		this.atlas = atlas;
		this.loadedBinary = false;
		this.loadedAtlas = false;

		canvas.assetManager.loadBinary(this.binary, () => {
			if (disposeBinary && disposeBinary !== this.binary) {
				canvas.assetManager.remove(disposeBinary);
			}
			this.loadedBinary = true;
			this.loadingComplete();
		});
		canvas.assetManager.loadTextureAtlas(this.atlas, () => {
			if (disposeAtlas && disposeAtlas !== this.atlas) {
				canvas.assetManager.remove(disposeAtlas);
			}
			this.loadedAtlas = true;
			this.loadingComplete();
		});
	}

	loadingComplete() {
		if (this.loadedBinary && this.loadedAtlas) {
			store.loading = false;
			
		}
	}

	getAssets(entry: Entry): [string, string] {
		switch (store.view) {
			case "hero":
				return [entry.hero.skel, entry.hero.atlas];
			case "alt":
				return [entry.alt!.skel, entry.alt!.atlas];
			case "skill":
				return [entry.skill!.skel, entry.skill!.atlas];
			case "bond":
				return [entry.bond![0].skel, entry.bond![0].atlas];
			default: // collection should trigger a model refresh
				return [entry.hero.skel, entry.hero.atlas];
		}
	}

	public getSkeleton(canvas: SpineCanvas) {
		return canvas.assetManager.require(this.binary);
	}

	public getAtlas(canvas: SpineCanvas) {
		return canvas.assetManager.require(this.atlas);
	}

	path(name: string): string {
		return `${ASSET_PROTOCOL}/${this.base}/${DIR_CONTAINERS}/${name}`;
	}
}
