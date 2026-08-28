import type { Animation } from "@esotericsoftware/spine-core";
import type { BondRule, BondRuleOverride } from "./bondRules";
import { getAnimationPrefix } from "./animationName";

type AnimationMode = "idle" | "loop" | "finish" | "end" | "bg" | "skip";

interface AnimationName {
	fullName: string;

	prefix: number;
	stage: number;
	part: number;

	mode: AnimationMode;
	transition: boolean;
	variant: boolean;
}

interface AnimationEntry {
	animations: Animation[];
}

/** Moves each key immediately before its value; classification never reorders, only this does. */
function reorderAnimations(
	animations: Animation[],
	reorderBefore?: Record<string, string>
): Animation[] {
	if (!reorderBefore) {
		return animations;
	}

	const result = [...animations];
	for (const [name, before] of Object.entries(reorderBefore)) {
		const fromIndex = result.findIndex((a) => a.name === name);
		if (fromIndex === -1) {
			continue;
		}

		const [moved] = result.splice(fromIndex, 1);
		const toIndex = result.findIndex((a) => a.name === before);
		result.splice(toIndex === -1 ? result.length : toIndex, 0, moved);
	}
	return result;
}

export class Animate {
	groups!: AnimationEntry[][];
	background!: Animation[];
	stageByName!: Map<string, number>;

	readonly specials = ["hand", "lick", "slap", "kiss", "touch", "emo"];
	readonly transitions = ["in", "out", "to", "off"];

	constructor(animations: Animation[], rule?: BondRule) {
		const reordered = reorderAnimations(animations, rule?.reorderBefore);
		const filtered = rule?.skip?.length
			? reordered.filter((a) => !rule.skip!.includes(a.name))
			: reordered;
		this.groupAnimations(filtered, rule?.rename, rule?.overrides);
	}

	groupAnimations(
		animations: Animation[],
		rename?: Record<string, string>,
		overrides?: Record<string, BondRuleOverride>
	) {
		this.groups = [];
		this.background = [];
		let currentGroup: AnimationEntry[] = [];
		let seenInitialIdle = false;

		const getAnimation = (
			index: number
		):
			| {
					animation: AnimationEntry;
					name: AnimationName;
			  }
			| undefined => {
			if (index < 0 || index >= animations.length) {
				return undefined;
			}

			const animation = animations[index];
			const alias = rename?.[animation.name] ?? animation.name;
			const name = this.parseName(alias);

			// override wins over whatever the naming convention parsed
			const override = overrides?.[animation.name];
			if (override === "stop") {
				// same as "loop": always flushes a new group
				name.mode = "loop";
				name.transition = false;
			} else if (override === "transition") {
				name.transition = true;
			} else if (override === "variant") {
				name.variant = true;
			} else if (override === "bypass") {
				name.mode = "finish";
				name.transition = false;
			}

			return { animation: { animations: [animation] }, name };
		};

		const flush = (next?: AnimationEntry) => {
			this.groups.push(currentGroup);
			currentGroup = [];
			if (next) {
				currentGroup.push(next);
			}
		};

		const addCycle = (animation: AnimationEntry) => {
			currentGroup[currentGroup.length - 1].animations.push(
				animation.animations[0]
			);
		};

		for (let i = 0; i < animations.length; i++) {
			const prev = getAnimation(i - 1);
			const { animation: curr, name } = getAnimation(i)!;
			const next = getAnimation(i + 1);

			if (name.mode === "skip") {
				// skip outright
				continue;
			}

            // bg
            else if (name.fullName === "90_bg") {
				// reliable bg channel
				this.background.push(curr.animations[0]);
			} else if (name.stage >= 8) {
				// skip background and misc effects
				continue;
			}

			// forced variant, regardless of naming-based continuation
			else if (name.variant) {
				if (currentGroup.length > 0) {
					addCycle(curr);
				} else {
					currentGroup.push(curr);
				}
			}

			// transition
			else if (name.transition) {
				if (prev?.name.transition) {
					// skip multiple transitions in a row
					continue;
				}
				// always bypass transition
				currentGroup.push(curr);
			}

			// idle
			else if (name.mode === "idle") {
				if (!seenInitialIdle && name.prefix === 0) {
					// stop on first idle
					// first anim must be first idle
					seenInitialIdle = true;
					this.groups = [];
					currentGroup = [];
					currentGroup.push(curr);
				} else if (
					prev?.name.mode === "idle" &&
					this.isVariantContinuation(prev.name, name)
				) {
					// numbered variant of the same idle - part of one big loop
					addCycle(curr);
				} else if (next?.name.mode === "loop") {
					// stop on idle before a loop
					flush(curr);
				} else if (next?.name.transition) {
					// stop on idle before a transition
					flush(curr);
				} else {
					// otherwise bypass idle
					currentGroup.push(curr);
				}
			}

			// loop
			else if (name.mode === "loop") {
				if (
					prev?.name.mode === "loop" &&
					this.isVariantContinuation(prev.name, name)
				) {
					// numbered variant of the same loop - part of one big loop
					addCycle(curr);
				} else {
					// always stop on loops
					flush(curr);
				}
			}

			// finish
			else if (name.mode === "finish") {
				// always bypass a finish, only ever plays once
				currentGroup.push(curr);
			}

			// end
			else if (name.mode === "end") {
				if (
					prev?.name.mode === "end" &&
					this.isVariantContinuation(prev.name, name)
				) {
					// numbered variant of the same end - part of one big loop
					addCycle(curr);
				} else {
					// always stop on an end
					flush(curr);
				}
			}
		}
		flush();

		this.stageByName = new Map();
		this.groups.forEach((group, stageIndex) => {
			group.forEach((entry, entryIndex) => {
				// bypass footage (entryIndex > 0) leads into the next
				// stop, so display it grouped with that stop, not this one
				const displayStage =
					entryIndex > 0 && stageIndex + 1 < this.groups.length
						? stageIndex + 1
						: stageIndex;
				for (const animation of entry.animations) {
					this.stageByName.set(animation.name, displayStage);
				}
			});
		});
	}

	parseName(name: string): AnimationName {
		const fullName = name.replaceAll(" ", "_").toLocaleLowerCase();
		const parts = fullName.split("_");

		const prefix = getAnimationPrefix(name);
		const stage = Number(parts[0][0]);
		const part = Number(parts[0][1]);

		const mode = this.parseAnimationMode(fullName, parts[1]);
		const transition = this.transitions.some((trans) =>
			this.hasPart(fullName, trans)
		);

		return {
			fullName,

			prefix,
			stage,
			part,

			mode,
			transition,
			variant: false,
		};
	}

	nextVariantName(fullName: string): string {
		const match = fullName.match(/\d+$/);
		if (!match) {
			return `${fullName}2`;
		}

		const digits = match[0];
		const next = Number(digits) + 1;
		return `${fullName.slice(0, fullName.length - digits.length)}${next}`;
	}

	isVariantContinuation(prev: AnimationName, curr: AnimationName): boolean {
		return (
			curr.fullName === prev.fullName ||
			curr.fullName === this.nextVariantName(prev.fullName)
		);
	}

	parseAnimationMode(fullName: string, mode: string): AnimationMode {
		if (mode === "loop") {
			// loop trumps special cases
			return "loop";
		}

		for (const special of this.specials) {
			if (this.hasPart(fullName, special)) {
				mode = special;
			}
		}

		switch (mode) {
			case "idle":
				return "idle";
			case "loop":
				return "loop";
			case "finish":
				return "finish";
			case "end":
				return "end";
			case "bg":
				return "bg";
			case "touch":
			case "emo":
				return "skip";
			default:
				// if not a known special category
				// just bypass it
				return "finish";
		}
	}

	hasPart(fullName: string, substring: string): boolean {
		return (
			fullName.includes(`_${substring}_`) ||
			fullName.endsWith(`_${substring}`)
		);
	}
}
