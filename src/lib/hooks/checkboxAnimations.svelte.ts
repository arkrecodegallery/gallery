import {
	applyCheckboxSelection,
	reconcileSingleCheckbox,
} from "$lib/core/checkboxSelection";
import type { Animation } from "$lib/core/types";

export class CheckboxAnimationState {
	animations: Record<string, number> = $state({});

	setChecked(name: string, checked: boolean, additive = false) {
		this.animations = applyCheckboxSelection(
			this.animations,
			name,
			checked,
			additive
		);
	}

	reconcile(current: string | undefined, clearOnUndefined: boolean) {
		this.animations = reconcileSingleCheckbox(
			this.animations,
			current,
			clearOnUndefined
		);
	}

	clear() {
		this.animations = {};
	}

	manualAnimations(): Animation[] {
		return Object.entries(this.animations).map(([animationName, trackIndex]) => ({
			animationName,
			trackIndex,
			loop: true,
		}));
	}
}
