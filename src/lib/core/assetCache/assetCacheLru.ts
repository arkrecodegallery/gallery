export interface CacheMeta {
	url: string;
	size: number;
	lastAccessed: number;
}

export function selectEvictions(
	entries: CacheMeta[],
	incomingSize: number,
	capBytes: number
): string[] {
	let total = entries.reduce((sum, entry) => sum + entry.size, 0) + incomingSize;
	if (total <= capBytes) return [];

	const oldestFirst = [...entries].sort((a, b) => a.lastAccessed - b.lastAccessed);
	const evicted: string[] = [];
	for (const entry of oldestFirst) {
		if (total <= capBytes) break;
		evicted.push(entry.url);
		total -= entry.size;
	}
	return evicted;
}

export function touchMapLru<T>(map: Map<string, T>, key: string): void {
	const value = map.get(key);
	if (value === undefined) return;
	map.delete(key);
	map.set(key, value);
}

export function insertMapLru<T>(
	map: Map<string, T>,
	key: string,
	value: T,
	sizeOf: (value: T) => number,
	capBytes: number
): void {
	map.delete(key);
	map.set(key, value);

	let total = 0;
	for (const entry of map.values()) total += sizeOf(entry);

	while (total > capBytes && map.size > 1) {
		const oldestKey = map.keys().next().value as string;
		if (oldestKey === key) break;
		total -= sizeOf(map.get(oldestKey)!);
		map.delete(oldestKey);
	}
}
