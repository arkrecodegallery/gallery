export interface BondRule {
	/** Bypass automated sequencing entirely; fall back to the manual picker. */
	disable?: boolean;
	/** Exact raw animation names to drop before grouping. */
	skip?: string[];
	/** Raw animation name -> alias used only for classification (parseName input). */
	rename?: Record<string, string>;
}

const rules: Record<string, BondRule> = {
	H003: { disable: true }, // poorly made, doesn't follow the naming convention
	H006: { disable: true }, // poorly made; missing 1{1..3}_Loop_{1..3}
	H015: { disable: true }, // very scuffed
	H025: { disable: true }, // incorrect skel/atlas - data problem, not a sequencing one
	H117: { skip: ["03_Lick_ani"] },
	H115: {
		rename: {
			// "hand" in the name misclassifies this real idle stop as a
			// one-off bypass clip; RoleCollection lists it as its own stage
			"01_Idle_hand_ani": "01_idle_ani",
			// 40/41 are alternate ends of the same stage, not sequential ones
			"41_End_ani": "40_end_ani",
		},
	},
	H040: { skip: [/* TODO: exact "manhand" clip name(s), confirm in-app */] },
	H033: {
		rename: {
			/* TODO: "<raw get-in name>": "01_idle_in", "<raw get-out name>": "01_idle_out" */
		},
	},
};

export function getBondRule(id: string): BondRule {
	return rules[id] ?? {};
}
