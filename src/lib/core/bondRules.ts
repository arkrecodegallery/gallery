export type BondRuleOverride = "stop" | "transition" | "variant" | "bypass";

export interface BondRuleBackground {
	/** Raw animation name to loop on the background track by default, and again whenever the sequence cycles back to stage 0. */
	base: string;
	/** Raw background animation name -> raw main-track animation name whose start triggers switching to it. */
	progress?: Record<string, string>;
}

export interface BondRule {
	/** Exact raw animation names to drop before grouping. */
	skip?: string[];
	/** Raw animation name -> alias used only for classification (parseName input). */
	rename?: Record<string, string>;
	/** Raw animation name -> forced stop/transition/variant/bypass classification, skipping the naming-convention parser entirely. */
	overrides?: Record<string, BondRuleOverride>;
	/** Raw animation name -> raw name it should be moved to immediately before, reordering actual playback (not just classification). */
	reorderBefore?: Record<string, string>;
	/** Overrides the default single "90_bg" loop with a base clip plus progress-triggered switches. */
	background?: BondRuleBackground;
}

const rules: Record<string, BondRule> = {
	A0002: {
		rename: {
			"12_Loop_ani2": "12_Loop_ani_Next",
			"14_Loop_ani2": "14_Loop_ani_Next",
			"14_Loop_ani3": "14_Loop_ani_Next_Next",
		},
	},
	A0003: {
		overrides: { "12_Loop_ani2": "variant" },
	},
	A0004: {
		skip: [
			"BG_Dust",
			"BG_Girl_Idle",
			"BG_Girl_Shock",
			"BG_Light_Off",
			"BG_Light_On",
		],
		background: {
			base: "BG_Dust",
		},
	},
	A0005: {
		rename: {
			"12_Loop_ani3": "12_Loop_ani_Next",
			"12_Loop_ani4": "12_Loop_ani_Next_Next",
		},
	},
	A0006: {
		rename: { "21_Loop_ani2": "21_Loop_ani_Next" },
		overrides: { "10_Idle_ani": "stop", "10_Idle_ani2": "variant" },
	},
	A0010: {
		skip: ["00_Idle_ani3"],
		rename: {
			"00_Idle_ani1": "00_Idle_ani",
			"00_Idle_ani2": "01_Idle_ani",
			"01_Loop_ani1": "10_Loop_ani",
			"01_Loop_ani2": "11_Loop_ani",
			"01_Loop_ani3": "12_Loop_ani",
		},
		overrides: {
			"00_Idle_ani2": "stop",
			"00_Idle_ani4": "stop",
		},
		reorderBefore: { "01_Idle_in_ani": "00_Idle_ani4" },
	},
	A0012_N: {
		skip: ["12B2", "12B3", "16A2", "16A3"],
		rename: {
			"00": "00_idle_ani0",
			"02": "02_loop",
			"03": "03_loop",
			"04": "04_loop",
			"06": "06_loop",
			"08": "08_loop",
			"09": "09_loop",
			"10": "10_loop",
			"12A": "12A_loop",
			"12B": "12B_loop_ani1",
			"12B2": "12B_loop_ani2",
			"12B3": "12B_loop_ani3",
			"14-2": "14-2_loop",
			"16A": "16A_loop_ani1",
			"16A2": "16A_loop_ani2",
			"16A3": "16A_loop_ani3",
			"16B": "16B_loop",
			"19": "19_loop",
			BG: "90_BG",
		},
	},
	A0013: {
		skip: ["03_End_ani2"],
		rename: { "01_Loop_ani2": "01_Loop_ani_Next" },
		overrides: { "01_Loop_ani2-1": "variant" },
	},
	A0014: {
		rename: {
			"10_Loop_ain2": "10_Loop_ain_Next",
			"10_Loop_ain3": "10_Loop_ain_Next_Next",
		},
	},
	A0015: {
		skip: ["22_Loop_ani2", "22_Loop_ani3", "22_Loop_ani4"],
	},
	A0016: {
		rename: {
			"01_Idle_ani1": "00_Idle_ani",
			"01_Idle_ani_1": "01_Pull_ani",
		},
		overrides: {
			"01_Idle_ani_2": "stop",
			"02_Idle_ani2": "variant",
			"01_Idle_ani_1": "stop",
			"21_Loop_ani2to3": "transition",
		},
		reorderBefore: {
			"22_Loop_ani2": "21_Loop_ani2to3",
			"20_Loop_ani3": "30_Finish_ani",
		},
	},
	A0017: {
		skip: [
			"01_00_Idle_ani0_singleLoop",
			"02_01_Loop_ani2",
			"02_01_Loop_ani3",
			"02_01_Loop_ani_singleLoop",
			"04_10_Idle_ani0_singleLoop",
			"05_21_Loop_ani1_",
			"07_30_Finish_ani_wG",
			"08_40_End_ani_singleLoop",
			"08_40_End_ani_wG",
			"09_BreastWave_ani",
			"FaceTest",
		],
		rename: {
			"01_00_Idle_ani0": "00_Idle_ani0",
			"02_01_Loop_ani": "01_Loop_ani",
			"03_10_Idle_in_ani": "10_Idle_in_ani",
			"04_10_Idle_ani0": "10_Idle_ani0",
			"05_21_Loop_ani1": "21_Loop_ani1",
			"06_22_Loop_ani2": "22_Loop_ani2",
			"06_23_Loop_ani3": "23_Loop_ani3",
			"07_30_Finish_ani": "30_Finish_ani",
			"08_40_End_ani": "40_End_ani",
		},
	},
	A0020: {
		rename: {
			"11_Loop_ani1-2": "11_Loop_ani1-Next",
		},
	},
	A0021: {
		skip: ["02_Finish_ani_Flash"],
		rename: {
			"01_Loop_ani2": "01_Loop_ani_Next",
		},
		overrides: {
			"00_Idle_in_ani_L": "stop",
		},
		reorderBefore: {
			"00_Idle_out_ani": "03_End_ani",
		},
	},
	A0022: {
		skip: ["00_Idle_ani3", "00_Idle_ani4", "00_Idle_ani5", "00_Idle_ani6"],
		reorderBefore: {
			"01_Loop_ani2": "01_Loop_ani",
			"00_Get_in_ani": "01_Loop_ani2",
			"00_Get_out_ani": "03_End_ani",
		},
	},
	A0023: {
		skip: [
			"30_ManHand_01",
			"30_ManHand_02",
			"30_ManHand_03",
			"GPussyblush_01",
			"HButtblush_01",
		],
		rename: {
			"01_Idle_Top": "00_Idle_Top",
		},
	},
	A0024: {
		skip: [
			"12_Trans_Flash",
			"12_Trans_Flash1",
			"12_Trans_Flash2",
			"12_Trans_Flash3",
			"30_Finish_ani2",
			"21_Loop_ani2",
		],
	},
	A0027: {
		skip: ["01_Loop_ani4", "01_Loop_ani5", "sky"],
		rename: {
			"01_Loop_ani1": "01_Loop_ani_Next",
			"01_Loop_ani2": "01_Loop_ani_Next_Next",
		},
		background: {
			base: "sky",
		},
	},
	A0028: {
		overrides: {
			"01_idle_ani": "variant",
			"02_Loop_Lick2_ani": "variant",
		},
	},
	A0029: {
		overrides: {
			"05_Loop_ani": "transition",
			"40_End_ani": "bypass",
		},
	},
	A0030: {
		skip: ["01_Loop_in_ani"],
	},
	A0032: {
		skip: ["11_Loop_ani1-3", "11_Loop_ani1-4"],
		reorderBefore: {
			"11_Loop_ani1-2": "11_Loop_ani1-1",
		},
	},
	A0033: {
		skip: ["41_End_ani"],
	},
	A0034: {
		// artistic decision to skip the second in/out animations
		skip: ["00_Idle_ani4", "01_Loop_in_ani2", "01_Loop_out_ani"],
		rename: {
			"01_Loop_ani1": "01_Loop_ani_Next",
			"01_Loop_ani2": "01_Loop_ani_Next_Next",
			"01_Loop_ani3": "01_Loop_ani_Next_Next_Next",
		},
		reorderBefore: {
			"00_Idle_in_ani": "00_Idle_ani3",
			"01_Loop_in_ani1": "01_Loop_ani0",
		},
	},
	A0037: {
		overrides: {
			"11_Loop_ani2": "transition",
			"12_Loop_ani3": "variant",
		},
	},
	A0079: {
		overrides: {
			"02_Idle_ani": "variant",
			"10_Idle_ani": "stop",
			"11_Idle_hand_ani": "stop",
		},
	},
	A0098: {
		overrides: {
			"01_idle_ani": "stop",
			"02_idle_ani": "variant",
			"12_idle_ani": "stop",
		},
	},
	A0114: {
		overrides: {
			"01_Idle_ani": "stop",
		},
	},
	A0119: {
		overrides: {
			"01_Idle_ani": "stop",
			"02_Idle_ani": "stop",
		},
	},
	A0131: {
		background: {
			base: "90_Sweat_ani",
		},
	},
	A0134: {
		background: {
			base: "90_BG_cold",
			progress: {
				"90_BG_hot": "20_Loop_ani",
			},
		},
	},
	A0139: {
		skip: ["21_Loop_ani2", "22_Loop_ani2", "22_Loop_ani3"],
	},
	A0142: {
		overrides: {
			"01_Idle_ani": "variant",
			"10_Idle_ani": "stop",
		},
		background: {
			base: "90_Oil_Flow",
			progress: {
				"90_Sweat_Flow": "10_Idle_ani",
			},
		},
	},
	A0145: {
		rename: {
			"01_Idle_hand_ani": "01_idle_ani",
			"41_End_ani": "40_end_ani",
		},
	},
	A0159: {
		background: {
			base: "90_BG_ani",
		},
	},
	A0168: {
		skip: ["03_Lick_ani"],
		overrides: {
			"01_Lick_ani": "stop",
			"02_Lick_ani": "stop",
		},
	},
	A0171: {
		skip: ["BG"],
		overrides: {
			"10_Idle_ani": "stop",
		},
		background: {
			base: "BG",
		},
	},
	A0174: {
		overrides: {
			"10_Idle_ani": "stop",
			"11_Idle_ani": "variant",
			"41_End_ani": "variant",
		},
	},
	A0184: {
		skip: ["21_Loop_ani2", "22_Loop_ani2"],
		rename: { "01_Idle_ani": "00_Idle_ani" },
		reorderBefore: {
			"23_Loop_ani": "22_Loop_ani2",
			"22_Loop_ani": "30_Finish_ani",
		},
	},
	A0189: {
		skip: ["02_Idle_ani", "03_Loop_ani"],
		overrides: {
			"01_Idle_ani": "variant",
		},
	},
	A0198: {
		skip: ["22_Loop_ani3"],
	},
	A0201: {
		skip: ["11_Idle_ani"],
	},
	A0204_HCG: {
		skip: ["21_Loop_ani2", "22_Loop_ani2", "22_Loop_ani3"],
	},
	A0219: {
		skip: ["21_Loop_ani2", "22_Loop_ani2", "22_Loop_ani3"],
	},
	A0225: {
		rename: {
			"01_Loop_ani": "00_Idle_ani",
		},
		overrides: {
			"10_Idle_ani": "bypass",
			"31_Finish_out_ani": "bypass",
		},
	},
	A0228: {
		overrides: {
			"01_Idle_ani": "variant",
			"02_Idle_ani": "variant",
		},
	},
	A0231: {
		overrides: {
			"01_Face_ani": "stop",
			"02_Face_ani": "variant",
			"10_Idle_ani": "stop",
			"11_Idle_ani": "variant",
		},
	},
	A0234: {
		overrides: {
			"41_End_ani": "variant",
		},
	},
	A0240: {
		overrides: {
			"01_Idle_ani": "variant",
			"02_Idle_ani": "variant",
		},
	},
	A0243: {
		overrides: {
			"01_Idle_hand_ani": "stop",
			"02_Idle_hand_ani": "variant",
		},
	},
	A0246: {
		overrides: {
			"01_Idle_ani": "variant",
		},
	},
	A0249: {
		overrides: {
			"01_Idle_ani": "stop",
		},
	},
	A0252: {
		overrides: {
			"01_Idle_ani": "variant",
			"10_Idle_ani": "stop",
		},
	},
	A0257: {
		skip: ["01_Idle_ani_1loop", "21_Loop_ani_1loop", "BG"],
		rename: {
			"01_Idle_ani": "00_Idle_ani",
		},
		background: {
			base: "BG",
		},
	},
	A0260: {
		skip: ["10_Idle_slap_ani"],
		overrides: {
			"09_Idle_ani": "stop",
		},
	},
	A0263: {
		overrides: {
			"02_Hand_ani": "stop",
			"03_Hand_ani": "stop",
			"04_Idle_ani": "stop",
			"05_Hand_ani": "stop",
		},
	},
	A0266: {
		overrides: {
			"01_Idle_ani": "variant",
		},
	},
	A0269: {
		overrides: {
			"01_Idle_ani": "variant",
			"11_Hand_ani": "stop",
			"12_Hand_ani": "stop",
			"13_Hand_ani": "stop",
		},
	},
	A0272: {
		overrides: {
			"01_Lick_ani": "stop",
		},
	},
	A0284: {
		overrides: {
			"01_Idle_ani": "variant",
			"02_Idle_Hand_ani": "stop",
			"03_Idle_Hand_ani": "variant",
		},
	},
	A0296: {
		overrides: {
			"01_Idle_ani": "variant",
			"02_Hand_ani": "stop",
			"03_Hand_ani": "variant",
			"05_Hand_ani": "stop",
			"06_Hand_ani": "variant",
			"41_End_ani": "variant",
		},
		background: {
			base: "91_BG",
			progress: {
				"90_BG": "19_Loop_ani",
			},
		},
	},
	A0302: {
		overrides: {
			"01_Idle_ani": "variant",
			"02_Friction_ani": "stop",
			"03_Friction_ani": "variant",
			"04_Friction_ani": "variant",
		},
	},
	A0305: {
		skip: ["06_ldle_Hand_ani", "07_ldle_Hand_ani"],
		// they used l instead of I fml
		overrides: {
			"01_ldle_Hand_ani": "stop",
		},
		background: {
			base: "90_BG_Start",
			progress: {
				"90_BG_Open": "20_Loop_ani",
				"91_BG_Fast": "23_Loop_ani",
				"92_BG_Stop": "30_Finish_ani",
			},
		},
	},
	A0311: {
		overrides: {
			"10_Idle_Candle_ani": "stop",
			"11_Friction_ani": "stop",
		},
	},
	A0314: {
		rename: {
			"01_Idle_ani": "00_Idle_ani",
		},
		overrides: {
			"02_Friction_ani": "stop",
		},
	},
	A0317: {
		// they did it again but only for some???
		overrides: {
			"01_ldle_ani": "variant",
			"02_ldle_Pull": "stop",
			"03_Idle_destroy": "bypass",
		},
	},
	A0320: {
		overrides: {
			"01_Idle_ani": "variant",
			"10_Hand_ani": "stop",
			"11_Hand_ani": "variant",
			"41_End_ani": "variant",
		},
	},
	A0326: {
		rename: {
			"01_Idle_ani": "00_Idle_ani",
		},
		overrides: {
			"01_Idle_Hand_ani": "stop",
			"02_Idle_Hand_ani": "variant",
		},
	},
	A0329: {
		overrides: {
			"01_Idle_ani": "variant",
			"02_Hand_ani": "stop",
			"03_Hand_ani": "variant",
		},
	},
	A0332: {
		overrides: {
			"01_Friction_ani": "stop",
			"02_Friction_ani": "variant",
			"11_Loop_ani": "variant",
		},
	},
	A0335: {
		overrides: {
			"01_Idle_ani": "variant",
			"10_Idle_Hand_ani": "stop",
			"11_Idle_Hand_ani": "variant",
			"41_End_ani": "variant",
		},
	},
	A0338: {
		overrides: {
			"01_Friction_ani": "stop",
		},
	},
	A0341: {
		overrides: {
			"19_Idle_In_ani": "stop",
			"20_Idle_In_ani": "variant",
		},
	},
	A0344: {
		overrides: {
			"01_Idle_ani": "variant",
			"10_Lick_ani": "stop",
			"11_Lick_ani": "variant",
		},
	},
	A0347: {
		rename: {
			"01_Idle_ani": "00_Idle_ani",
		},
		overrides: {
			"04_Lick_ani": "stop",
			"05_Lick_ani": "variant",
		},
	},
	A0350: {
		overrides: {
			"01_Foot_ani": "variant",
			"02_Foot_ani": "stop",
			"03_Foot_ani": "variant",
			"10_Idle_ani": "stop",
			"11_Idle_ani": "variant",
		},
	},
	A0353: {
		skip: ["03_Toy_ani"],
		overrides: {
			"01_Idle_ani": "variant",
			"01_Toy_ani": "stop",
			"02_Toy_ani": "variant",
		},
	},
	A0356: {
		overrides: {
			"10_Friction_ani": "stop",
			"11_Friction_ani": "variant",
			"41_End_ani": "variant",
		},
	},
	A0359: {
		skip: [
			"01_Friction_loop_ani",
			"05_Nipple_loop_ani",
			"10_Idle_ani",
			"21_Loop_ani_short",
			"23_Loop_ani_short3",
			"23_Loop_ani_short4",
			"23_Loop_ani_short_m",
			"40_End_loop_ani",
		],
		overrides: {
			"05_Nipple_ani": "stop",
		},
	},
	A0362: {
		overrides: {
			"01_Idle_ani": "variant",
			"11_Hand_ani": "stop",
			"12_Friction_ani": "stop",
		},
	},
	A0368: {
		overrides: {
			"11_Loop_Hand_ani": "variant",
			"30_Loop_In_ani": "stop",
		},
	},
	A0377: {
		rename: {
			"01_Idle_ani": "00_Idle_ani",
		},
		overrides: {
			"02_Friction_ani": "stop",
			"03_Friction_ani": "variant",
		},
	},
	A0380: {
		skip: ["22_Loop_ani2", "22_Loop_ani3"],
		overrides: {
			"01_Friction_ani": "stop",
		},
	},
	A0386: {
		skip: ["22_Loop_ani2", "22_Loop_ani3"],
	},
	A0392: {
		rename: {
			"01_Idle_ani": "00_Idle_ani",
		},
		overrides: {
			"02_Friction_ani": "stop",
		},
	},
	A0410: {
		overrides: {
			"01_Idle_ani": "variant",
			"02_Hand_ani": "stop",
			"03_Hand_ani": "variant",
			"05_Hand_ani": "stop",
			"06_Hand_ani": "variant",
		},
	},
	A0413: {
		overrides: {
			"01_Idle_ani2": "variant",
			"02_Hand_ani2": "stop",
			"03_Hand_ani2": "variant",
		},
	},
	A0419: {
		overrides: {
			"11_Loop_Kiss_ani": "variant",
			"30_Idle_ani": "stop",
			"31_Loop1_ani": "stop",
			"31_Loop2_ani": "variant",
			"32_Loop1_ani": "stop",
			"33_Loop1_ani": "stop",
			"34_Loop1_ani": "stop",
		},
	},
	A0434: {
		overrides: {
			"01_Idle_ani": "variant",
			"10_Friction_ani": "stop",
			"11_Friction_ani": "variant",
			"41_End_ani": "variant",
		},
	},
};

export function getBondRule(skelName: string): BondRule {
	return rules[skelName] ?? {};
}
