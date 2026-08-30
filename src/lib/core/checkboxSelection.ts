export function applyCheckboxSelection(
	current: Record<string, number>,
	name: string,
	checked: boolean,
	additive: boolean
): Record<string, number> {
	if (!additive) {
		return checked ? { [name]: 0 } : {};
	}

	const next = { ...current };
	if (checked) {
		next[name] = Object.keys(next).length;
	} else {
		delete next[name];
		Object.keys(next).forEach((key, i) => {
			next[key] = i;
		});
	}

	return next;
}

/** clearOnUndefined must be false for bond, whose "undefined" means manual override, not nothing playing. */
export function reconcileSingleCheckbox(
	current: Record<string, number>,
	playingName: string | undefined,
	clearOnUndefined: boolean
): Record<string, number> {
	if (playingName === undefined) {
		if (!clearOnUndefined || Object.keys(current).length === 0) {
			return current;
		}
		return {};
	}

	const keys = Object.keys(current);
	if (keys.length === 1 && keys[0] === playingName) {
		return current;
	}

	return { [playingName]: 0 };
}

/** Background tracks (bond's single latched clip, skill's bg clip set) show checked without living in `animations`. */
export function isAnimationChecked(
	name: string,
	animations: Record<string, number>,
	backgroundAnimationNames: Iterable<string> = []
): boolean {
	return name in animations || [...backgroundAnimationNames].includes(name);
}
