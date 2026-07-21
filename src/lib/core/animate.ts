import type { Animation } from "@esotericsoftware/spine-core";

type AnimationMode = "idle" | "loop" | "finish" | "end" | "bg" | "skip";

interface AnimationName {
	fullName: string;

	prefix: number;
	stage: number;
	part: number;

	mode: AnimationMode;
	transition: boolean;

	suffix: number;
}

interface AnimationEntry {
	animations: Animation[];
}

export class Animate {
	groups!: AnimationEntry[][];
	background!: Animation[];

	readonly specials = ["hand", "lick", "slap", "kiss", "touch", "emo"];
	readonly transitions = ["in", "out", "to", "off"];

	constructor(animations: Animation[]) {
		this.groupAnimations(animations);
	}

	groupAnimations(animations: Animation[]) {
		this.groups = [];
		this.background = [];
		let currentGroup: AnimationEntry[] = [];

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
			const name = this.parseName(animation.name);
			return { animation: { animations: [animation] }, name };
		};

		const getFullNameNoSuffix = (name: AnimationName): string => {
			return name.suffix === 0
				? name.fullName
				: name.fullName.substring(0, name.fullName.length - 1);
		};

		const flush = (next?: AnimationEntry) => {
			this.groups.push(currentGroup);
			currentGroup = [];
			if (next) {
				currentGroup.push(next);
			}
		};

		const addCycle = (animation: AnimationEntry) => {
			currentGroup[0].animations.push(animation.animations[0]);
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
            else if (name.fullName === "90_BG") {
				// reliable bg channel
				this.background.push(curr.animations[0]);
			} else if (name.stage >= 8) {
				// skip background and misc effects
				continue;
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
				if (name.prefix === 0) {
					// stop on first idle
					// first anim must be first idle
					this.groups = [];
					currentGroup = [];
					currentGroup.push(curr);
				} else if (
					prev?.name.mode === "idle" &&
					prev.name.prefix === name.prefix
				) {
					// skip repeat idles
					continue;
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
					(Math.abs(prev.name.suffix - name.suffix) === 1 ||
						prev.name.prefix === name.prefix)
				) {
					const prevFull = getFullNameNoSuffix(prev.name);
					const currFull = getFullNameNoSuffix(name);
					if (prevFull === currFull) {
						// cycle among related loops
						addCycle(curr);
					} else {
						// skip seeming related but actually invalid loops
						continue;
					}
				} else {
					// always stop on loops
					flush(curr);
				}
			}

			// finish
			else if (name.mode === "finish") {
				if (
					prev?.name.mode === "finish" &&
					name.fullName.startsWith(prev.name.fullName)
				) {
					// skip invalid finish
					continue;
				}
				// always bypass a finish
				currentGroup.push(curr);
			}

			// end
			else if (name.mode === "end") {
				if (prev?.name.mode === "end") {
					// cycle among following ends
					addCycle(curr);
				} else {
					// always stop on an end
					flush(curr);
				}
			}
		}
		flush();
	}

	parseName(name: string): AnimationName {
		const fullName = name.replaceAll(" ", "_").toLocaleLowerCase();
		const parts = fullName.split("_");

		const prefix = Number(parts[0]);
		const stage = Number(parts[0][0]);
		const part = Number(parts[0][1]);

		const mode = this.parseAnimationMode(fullName, parts[1]);
		const transition = this.transitions.some((trans) =>
			this.hasPart(fullName, trans)
		);

		let suffix = Number(fullName[fullName.length - 1]);
		suffix = Number.isNaN(suffix) ? 0 : suffix;

		return {
			fullName,

			prefix,
			stage,
			part,

			mode,
			transition,

			suffix,
		};
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
