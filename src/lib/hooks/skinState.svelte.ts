import type { ModelView } from "../core/types";
import type { SkeletonData } from "@esotericsoftware/spine-core";

export class SkinState {
	skin: string = $state("LV1");
	skinLevel = 1;
	skipSkinCalculation = false;

	decrement() {
		this.skinLevel = this.skinLevel === 1 ? 3 : this.skinLevel - 1;
	}

	increment() {
		this.skinLevel = this.skinLevel === 3 ? 1 : this.skinLevel + 1;
	}

	/** Suppresses the next calculateSkin() call; used after a manual skin pick. */
	confirmManualPick() {
		this.skipSkinCalculation = true;
	}

	calculateSkin(view: ModelView, skeletonData: SkeletonData | undefined) {
		if (this.skipSkinCalculation) {
			this.skipSkinCalculation = false;
			return;
		}

		const tryApplySkin = (attempt: string, fallback: string) => {
			if (skeletonData?.skins.some((a) => a.name === attempt)) {
				this.skin = attempt;
			} else {
				this.skin = skeletonData?.skins[0].name ?? fallback;
			}
		};

		if (view === "hero") {
			this.skin = `LV${this.skinLevel}`;
		} else if (view === "alt") {
			tryApplySkin(`LV${this.skinLevel}`, "default");
		} else if (view === "skill" || view === "bond") {
			tryApplySkin("LV1", "default");
		}
	}

	getSkin(): string {
		return this.skin;
	}
}
