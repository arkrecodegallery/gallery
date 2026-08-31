export interface HeroRule {
	/** Exact raw animation names to exclude from the q-cycle / checkbox list. */
	skip?: string[];
}

const rules: Record<string, HeroRule> = {
	H009: { skip: ["00_Idle2"] },
	H023: { skip: ["00_Idle2"] },
	CG_H027_a: { skip: ["00_Idle2"] },
	H032: { skip: ["01_Attack1"] },
	H047: { skip: ["00_Idle2"] },
	H049: { skip: ["00_Idle_B"] },
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
	H124: { skip: ["00_Idle_B", "00_Idle_enemy", "01_Attack_B"] },
	H147: { skip: ["00_Idle_B"] },
	H148: { skip: ["01_Attack_Lion"] },
};

export function getHeroRule(skelName: string): HeroRule {
	return rules[skelName] ?? {};
}
