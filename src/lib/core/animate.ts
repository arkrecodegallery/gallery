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

interface AnimationLookup {
	animation: AnimationEntry;
	name: AnimationName;
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

	private animations: Animation[] = [];
	private rename?: Record<string, string>;
	private overrides?: Record<string, BondRuleOverride>;
	private currentGroup: AnimationEntry[] = [];
	private seenInitialIdle = false;

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
		this.animations = animations;
		this.rename = rename;
		this.overrides = overrides;
		this.groups = [];
		this.background = [];
		this.currentGroup = [];
		this.seenInitialIdle = false;

		for (let i = 0; i < animations.length; i++) {
			const prev = this.getAnimation(i - 1);
			const { animation: curr, name } = this.getAnimation(i)!;
			const next = this.getAnimation(i + 1);
			this.classify(prev, curr, name, next);
		}
		this.flush();

		this.buildStageByName();
	}

	private classify(
		prev: AnimationLookup | undefined,
		curr: AnimationEntry,
		name: AnimationName,
		next: AnimationLookup | undefined
	) {
		if (name.mode === "skip") {
			// skip outright
			return;
		}

		if (name.fullName === "90_bg") {
			// reliable bg channel
			this.background.push(curr.animations[0]);
			return;
		}

		if (name.stage >= 8) {
			// skip background and misc effects
			return;
		}

		if (name.variant) {
			// forced variant, regardless of naming-based continuation
			this.handleVariant(curr);
			return;
		}

		if (name.transition) {
			this.handleTransition(prev, curr);
			return;
		}

		if (name.mode === "idle") {
			this.handleIdle(prev, curr, name, next);
			return;
		}

		if (name.mode === "loop") {
			this.handleLoop(prev, curr, name);
			return;
		}

		if (name.mode === "finish") {
			// always bypass a finish, only ever plays once
			this.currentGroup.push(curr);
			return;
		}

		if (name.mode === "end") {
			this.handleEnd(prev, curr, name);
		}
	}

	private handleVariant(curr: AnimationEntry) {
		if (this.currentGroup.length > 0) {
			this.addCycle(curr);
		} else {
			this.currentGroup.push(curr);
		}
	}

	private handleTransition(prev: AnimationLookup | undefined, curr: AnimationEntry) {
		if (prev?.name.transition) {
			// skip multiple transitions in a row
			return;
		}
		// always bypass transition
		this.currentGroup.push(curr);
	}

	private handleIdle(
		prev: AnimationLookup | undefined,
		curr: AnimationEntry,
		name: AnimationName,
		next: AnimationLookup | undefined
	) {
		if (!this.seenInitialIdle && name.prefix === 0) {
			// stop on first idle
			// first anim must be first idle
			this.seenInitialIdle = true;
			this.groups = [];
			this.currentGroup = [];
			this.currentGroup.push(curr);
		} else if (
			prev?.name.mode === "idle" &&
			this.isVariantContinuation(prev.name, name)
		) {
			// numbered variant of the same idle - part of one big loop
			this.addCycle(curr);
		} else if (next?.name.mode === "loop") {
			// stop on idle before a loop
			this.flush(curr);
		} else if (next?.name.transition) {
			// stop on idle before a transition
			this.flush(curr);
		} else {
			// otherwise bypass idle
			this.currentGroup.push(curr);
		}
	}

	private handleLoop(
		prev: AnimationLookup | undefined,
		curr: AnimationEntry,
		name: AnimationName
	) {
		if (prev?.name.mode === "loop" && this.isVariantContinuation(prev.name, name)) {
			// numbered variant of the same loop - part of one big loop
			this.addCycle(curr);
		} else {
			// always stop on loops
			this.flush(curr);
		}
	}

	private handleEnd(
		prev: AnimationLookup | undefined,
		curr: AnimationEntry,
		name: AnimationName
	) {
		if (prev?.name.mode === "end" && this.isVariantContinuation(prev.name, name)) {
			// numbered variant of the same end - part of one big loop
			this.addCycle(curr);
		} else {
			// always stop on an end
			this.flush(curr);
		}
	}

	private flush(next?: AnimationEntry) {
		this.groups.push(this.currentGroup);
		this.currentGroup = [];
		if (next) {
			this.currentGroup.push(next);
		}
	}

	private addCycle(animation: AnimationEntry) {
		this.currentGroup[this.currentGroup.length - 1].animations.push(
			animation.animations[0]
		);
	}

	private getAnimation(index: number): AnimationLookup | undefined {
		if (index < 0 || index >= this.animations.length) {
			return undefined;
		}

		const animation = this.animations[index];
		const alias = this.rename?.[animation.name] ?? animation.name;
		const name = this.parseName(alias);

		// override wins over whatever the naming convention parsed
		const override = this.overrides?.[animation.name];
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
	}

	private buildStageByName() {
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
