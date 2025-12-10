import type { SpineCanvas } from "@esotericsoftware/spine-webgl";

export interface Model {
	prefix: string;
	model: string;
}

export class AssetManager {
	cache: Model[] = [];

	public loadModel(canvas: SpineCanvas, prefix: string, model: string) {
		const entry: Model = { prefix, model };
		this.insertCache(canvas, entry);
		canvas.assetManager.loadBinary(this.path(entry, ".skel"));
		canvas.assetManager.loadTextureAtlas(this.path(entry, ".atlas"));
	}

	insertCache(canvas: SpineCanvas, entry: Model) {
		if (this.cache.length > 100) {
			this.popCache(canvas);
		}

		this.cache.unshift(entry);
	}

	popCache(canvas: SpineCanvas) {
		const old = this.cache.pop();
		if (!old) return;

		// FIXME
		// canvas.assetManager.remove(this.path(old, ""));
	}

	public getSkeleton(canvas: SpineCanvas) {
		const path = this.path(this.cache[0], ".skel");
		return canvas.assetManager.require(path);
	}

	public getAtlas(canvas: SpineCanvas) {
		const path = this.path(this.cache[0], ".atlas");
		return canvas.assetManager.require(path);
	}

	path(entry: Model, ext: string): string {
		return `/spines/${entry.prefix}/${entry.model}${ext}`;
	}
}
