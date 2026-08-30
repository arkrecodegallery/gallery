import type { Entry } from "$lib/core/types";
import {
	ZodiacAquarius,
	ZodiacAries,
	ZodiacCancer,
	ZodiacCapricorn,
	ZodiacGemini,
	ZodiacLeo,
	ZodiacLibra,
	ZodiacPisces,
	ZodiacSagittarius,
	ZodiacScorpio,
	ZodiacTaurus,
	ZodiacVirgo,
} from "@lucide/svelte";

export const zodiacIcons: Record<string, typeof ZodiacAries> = {
	aries: ZodiacAries,
	taurus: ZodiacTaurus,
	gemini: ZodiacGemini,
	cancer: ZodiacCancer,
	leo: ZodiacLeo,
	virgo: ZodiacVirgo,
	libra: ZodiacLibra,
	scorpio: ZodiacScorpio,
	sagittarius: ZodiacSagittarius,
	capricorn: ZodiacCapricorn,
	aquarius: ZodiacAquarius,
	pisces: ZodiacPisces,
};

export interface StarDisplay {
	src: string;
	width: string;
}

export function starDisplay(entry: Entry): StarDisplay | undefined {
	if (!entry.details.stars) return undefined;
	const count = Number(entry.details.stars);
	if (Number.isNaN(count)) return undefined;

	let width = "";
	switch (count) {
		case 3:
			width = "w-10";
			break;
		case 4:
			width = "w-13";
			break;
		case 5:
			width = "w-16";
			break;
	}

	return { src: `/icons/stars/${count}-Stars.svg`, width };
}
