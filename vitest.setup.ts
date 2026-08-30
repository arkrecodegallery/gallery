if (typeof globalThis.window === "undefined") {
	const listeners = new Map<string, Set<(ev: unknown) => void>>();
	(globalThis as unknown as { window: unknown }).window = {
		addEventListener: (type: string, cb: (ev: unknown) => void) => {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type)!.add(cb);
		},
		removeEventListener: (type: string, cb: (ev: unknown) => void) => {
			listeners.get(type)?.delete(cb);
		},
		dispatchEvent: (ev: { type: string }) => {
			listeners.get(ev.type)?.forEach((cb) => cb(ev));
		},
		__clearEventListeners: () => {
			listeners.clear();
		},
	};
}

if (typeof globalThis.localStorage === "undefined") {
	const data = new Map<string, string>();
	(globalThis as unknown as { localStorage: Storage }).localStorage = {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		},
		clear: () => {
			data.clear();
		},
		key: (index: number) => Array.from(data.keys())[index] ?? null,
		get length() {
			return data.size;
		},
	} as Storage;
}
