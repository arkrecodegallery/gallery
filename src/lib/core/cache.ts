import type { SpineCanvas } from "@esotericsoftware/spine-webgl";
import { store } from "$lib/hooks/state.svelte";
import type { Entry } from "./types";
import { ASSET_PROTOCOL, DIR_CONTAINERS } from "./constants";
import { convertFileSrc } from "@tauri-apps/api/core";

export class AssetManager {
	base: string = "";

	binary: string = "";
	atlas: string = "";

	constructor(basePath: string) {
		this.base = basePath;
	}

	public loadModel(canvas: SpineCanvas, entry: Entry) {
		let assets = this.getAssets(entry);

		this.binary = this.path(assets[0]);
		this.atlas = this.path(assets[1]);

		canvas.assetManager.loadBinary(this.binary);
		canvas.assetManager.loadTextureAtlas(this.atlas);
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
				return [entry.bond!.skel, entry.bond!.atlas];
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
