import type { SpineCanvas } from "@esotericsoftware/spine-webgl";
import { prepareSpineAssets, seedSpineAssets } from "./assetCache/spineSeed";
import type { Entry, ModelView } from "./types";

export class AssetManager {
	base: string = "";

	prevBinary: string = "";
	prevAtlas: string = "";
	binary: string = "";
	atlas: string = "";
	loadedBinary: boolean = false;
	loadedAtlas: boolean = false;

	constructor(containerBaseUrl: string) {
		this.base = containerBaseUrl;
	}

	public loadModel(
		canvas: SpineCanvas,
		entry: Entry,
		view: ModelView,
		cycleIndex: number,
		onLoadingChange: (loading: boolean) => void
	) {
		onLoadingChange(true);
		let assets = this.getAssets(entry, view, cycleIndex);

		const binary = this.path(assets[0]);
		const atlas = this.path(assets[1]);

		if (this.binary === binary && this.atlas === atlas) {
			this.loadingComplete(onLoadingChange);
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

		seedSpineAssets(canvas, this.binary, this.atlas);

		canvas.assetManager.loadBinary(this.binary, () => {
			if (disposeBinary && disposeBinary !== this.binary) {
				canvas.assetManager.remove(disposeBinary);
			}
			this.loadedBinary = true;
			this.loadingComplete(onLoadingChange);
		});
		canvas.assetManager.loadTextureAtlas(this.atlas, () => {
			if (disposeAtlas && disposeAtlas !== this.atlas) {
				canvas.assetManager.remove(disposeAtlas);
			}
			this.loadedAtlas = true;
			this.loadingComplete(onLoadingChange);
		});
	}

	// Must be awaited before loadModel() so the bytes are already hot when
	// loadModel's synchronous setRawDataURI seeding runs - see spineSeed.ts.
	public async prepareAssets(entry: Entry, view: ModelView, cycleIndex: number) {
		const assets = this.getAssets(entry, view, cycleIndex);
		await prepareSpineAssets(this.path(assets[0]), this.path(assets[1]));
	}

	loadingComplete(onLoadingChange: (loading: boolean) => void) {
		if (this.loadedBinary && this.loadedAtlas) {
			onLoadingChange(false);
		}
	}

	getAssets(entry: Entry, view: ModelView, cycleIndex: number): [string, string] {
		switch (view) {
			case "hero":
				return [entry.hero.skel, entry.hero.atlas];
			case "alt":
				return [entry.alt!.skel, entry.alt!.atlas];
			case "skill":
				return [entry.skill!.skel, entry.skill!.atlas];
			case "bond":
				const presentation = entry.bond![cycleIndex];
				if (presentation.kind === "animated") {
					return [presentation.bundle.skel, presentation.bundle.atlas];
				}
				// fallthrough
			default: // collection should not trigger a model refresh
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
		return `${this.base}/${name}`;
	}
}
