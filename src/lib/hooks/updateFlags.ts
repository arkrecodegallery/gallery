export class UpdateFlags {
	skinUpdate = false;
	animationUpdate = false;
	modelUpdate = false;

	requestSkinUpdate() {
		this.skinUpdate = true;
	}

	requestAnimationUpdate() {
		this.animationUpdate = true;
	}

	requestModelUpdate() {
		this.modelUpdate = true;
	}

	hasSkinUpdate(): boolean {
		const update = this.skinUpdate;
		this.skinUpdate = false;
		return update;
	}

	hasAnimationUpdate(): boolean {
		const update = this.animationUpdate;
		this.animationUpdate = false;
		return update;
	}

	hasModelUpdate(): boolean {
		const update = this.modelUpdate;
		this.modelUpdate = false;
		return update;
	}
}
