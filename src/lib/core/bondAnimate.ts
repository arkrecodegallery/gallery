import type { Animation } from "@esotericsoftware/spine-core";
import { Animate } from "./animate";
import { getBondRule, type BondRule } from "./bondRules";

/** Builds the same Animate + BondRule pair every bond call site needs. */
export function buildBondAnimate(
	animations: Animation[],
	skelName: string
): { rule: BondRule; animate: Animate } {
	const rule = getBondRule(skelName);
	return { rule, animate: new Animate(animations, rule) };
}
