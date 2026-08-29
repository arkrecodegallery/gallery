export const defaultKeybinds = {
	Skin_Decrement: "a",
	Skin_Increment: "d",
	Hero_Decrement: "w",
	Hero_Increment: "s",
	Cutscene: "q",
	Touch: "e",
	Hero_View: "z",
	Skill_View: "x",
	Bond_View: "c",
	Collection_View: "v",
	Listing: "f",
	Hide_UI: "r",
	Home: "h",
} as const;

export type KeybindAction = keyof typeof defaultKeybinds;

export const keybindLabels: Record<KeybindAction, string> = {
	Skin_Decrement: "Previous Skin",
	Skin_Increment: "Next Skin",
	Hero_Decrement: "Previous Hero",
	Hero_Increment: "Next Hero",
	Cutscene: "Cutscene",
	Touch: "Touch",
	Hero_View: "Hero View",
	Skill_View: "Skill View",
	Bond_View: "Bond View",
	Collection_View: "Collection View",
	Listing: "Listing",
	Hide_UI: "Hide UI",
	Home: "Home",
};

const STORAGE_KEY = "keybinds";

function loadKeybinds(): Record<KeybindAction, string> {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return { ...defaultKeybinds };

	try {
		return { ...defaultKeybinds, ...JSON.parse(stored) };
	} catch {
		return { ...defaultKeybinds };
	}
}

export const keybinds: Record<KeybindAction, string> = $state(loadKeybinds());

export function setKeybind(action: KeybindAction, key: string) {
	keybinds[action] = key;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(keybinds));
}

export function resetKeybinds() {
	Object.assign(keybinds, defaultKeybinds);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(keybinds));
}

export function addKeydownListener(callback: (ev: KeyboardEvent) => void) {
	window.addEventListener("keydown", (ev) => {
		const tag = (ev.target as HTMLElement)?.tagName;
		const isInput =
			tag === "INPUT" ||
			tag === "TEXTAREA" ||
			(ev.target as HTMLElement).isContentEditable;

		if (isInput) {
			return;
		}

		callback(ev);
	});
}
