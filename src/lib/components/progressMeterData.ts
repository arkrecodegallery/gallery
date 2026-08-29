import type { ModelState } from "$lib/hooks/modelState.svelte";
import type { ModelView } from "$lib/core/types";
import type { BondBar } from "$lib/core/bondProgress";

export interface MeterData {
	kind: "plain" | "stills" | "bars";
	dotCount: number;
	currentDot: number;
	selectedDot?: number;
	bars: BondBar[];
	activeBarIndex: number;
	barProgress: number;
}

const PLAIN: MeterData = {
	kind: "plain",
	dotCount: 0,
	currentDot: -1,
	bars: [],
	activeBarIndex: -1,
	barProgress: 0,
};

export function computeMeterData(
	view: ModelView,
	modelState: ModelState
): MeterData {
	if (view === "bond") {
		return computeBondMeterData(modelState);
	}

	if (view === "hero" || view === "alt") {
		return computeHeroMeterData(modelState);
	}

	if (view === "skill") {
		return {
			kind: "bars",
			dotCount: 0,
			currentDot: -1,
			bars: [{ animationName: "", loop: false }],
			activeBarIndex: 0,
			barProgress: modelState.skillView.barProgress,
		};
	}

	return PLAIN;
}

function computeHeroMeterData(modelState: ModelState): MeterData {
	const h = modelState.heroAnimation;
	if (h.eligibleNames.length === 0) {
		return PLAIN;
	}

	return {
		kind: "bars",
		dotCount: h.eligibleNames.length,
		currentDot: h.playingIndex,
		selectedDot: h.selectedIndex,
		bars: [{ animationName: "", loop: false }],
		activeBarIndex: 0,
		barProgress: h.barProgress,
	};
}

function computeBondMeterData(modelState: ModelState): MeterData {
	const entry = modelState.getAbsoluteEntry();
	const presentation = entry.bond?.[modelState.cycleIndex];

	const stillsActive = presentation?.kind === "stills";
	const animatedActive = presentation?.kind === "animated";

	const stageCount =
		stillsActive && presentation?.kind === "stills"
			? presentation.images.length
			: animatedActive
				? modelState.bond.stageCount
				: 0;

	if (stageCount === 0) {
		return PLAIN;
	}

	if (stillsActive) {
		return {
			kind: "stills",
			dotCount: stageCount,
			currentDot: modelState.bond.stillsIndex,
			bars: [{ animationName: "", loop: false }],
			activeBarIndex: 0,
			barProgress: 1,
		};
	}

	return {
		kind: "bars",
		dotCount: stageCount,
		currentDot: modelState.bond.stageIndex,
		bars: modelState.bond.sequenceBars,
		activeBarIndex: modelState.bond.activeBarIndex,
		barProgress: modelState.bond.barProgress,
	};
}
