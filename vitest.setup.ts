if (typeof globalThis.window === "undefined") {
	(globalThis as unknown as { window: unknown }).window = {
		addEventListener: () => {},
		removeEventListener: () => {},
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
