import type { BondData, HeroData, LoveLinkData } from "$lib/types";
import { store } from "$lib/hooks/state.svelte";

export const load = async ({ fetch }) => {
	const herosResp = await fetch("/data/heros.json");
	const heros: HeroData[] = await herosResp.json();
	store.heroData = heros;

	const bondsResp = await fetch("/data/bonds.json");
	const bonds: BondData[] = await bondsResp.json();
	store.bondData = bonds;

	const skelsResp = await fetch("/data/skels.json");
	const skels: Record<string, string[]> = await skelsResp.json();
	store.skelData = skels;

	const loveLinksResp = await fetch("/data/loveLinks.json");
	const loveLinks: LoveLinkData[] = await loveLinksResp.json();
	store.loveLinkData = loveLinks;
};
