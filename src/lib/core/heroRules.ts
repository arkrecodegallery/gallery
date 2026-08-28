export interface HeroRule {
	/** Exact raw animation names to exclude from the q-cycle / checkbox list. */
	skip?: string[];
}

// Keyed by skel basename (see skelName.ts), not hero id: a hero's alt skel
// is a distinct file (e.g. H003 vs H003b) that needs its own entry here.
const rules: Record<string, HeroRule> = {
	H009: { skip: ["00_Idle2"] },
	H023: { skip: ["00_Idle2"] },
	CG_H027_a: { skip: ["00_Idle2"] }, // H027's hero skel is named CG_H027_a, not H027
	H032: { skip: ["01_Attack1"] },
	H047: { skip: ["00_Idle2"] },
	H049: { skip: ["00_Idle_B"] },
	// H054 has BG
	H060: {
		skip: [
			"00_Idle2",
			"00_Idle_angry",
			"00_Idle_normal",
			"00_Idle_sad",
			"01_Attack2",
		],
	},
	H080: { skip: ["01_Attack2"] },
	H089: { skip: ["01_Attack_Water"] },
	H093: { skip: ["00_Idle_B"] },
	// H107 has BG
	// H113 has BG
	H124: { skip: ["00_Idle_B", "00_Idle_enemy", "01_Attack_B"] },
	H147: { skip: ["00_Idle_B"] },
	H148: { skip: ["01_Attack_Lion"] },
};

export function getHeroRule(skelName: string): HeroRule {
	return rules[skelName] ?? {};
}
