export interface BondBar {
	animationName: string;
	loop: boolean;
}

export interface BondTrackSnapshot {
	animationName: string;
	trackTime: number;
	duration: number;
}

export function computeBarProgress(
	bars: BondBar[],
	track: BondTrackSnapshot | undefined
): { activeBarIndex: number; progress: number } {
	if (!track) {
		return { activeBarIndex: -1, progress: 0 };
	}

	const activeBarIndex = bars.findIndex(
		(bar) => bar.animationName === track.animationName
	);
	const progress =
		track.duration > 0
			? (track.trackTime % track.duration) / track.duration
			: 0;

	return { activeBarIndex, progress };
}

export type DotState = "complete" | "current" | "upcoming";

export function dotState(index: number, current: number): DotState {
	if (index === current) return "current";
	return index < current ? "complete" : "upcoming";
}
