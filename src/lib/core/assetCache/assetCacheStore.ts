import type { CacheMeta } from "./assetCacheLru";

const DB_NAME = "gallery-asset-cache";
const DB_VERSION = 1;
const ASSETS_STORE = "assets";
const META_STORE = "meta";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);
			request.onupgradeneeded = () => {
				const db = request.result;
				db.createObjectStore(ASSETS_STORE, { keyPath: "url" });
				db.createObjectStore(META_STORE, { keyPath: "url" });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
	return dbPromise;
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function runTx(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

export async function listCacheMeta(): Promise<CacheMeta[]> {
	const db = await openDb();
	const tx = db.transaction(META_STORE, "readonly");
	return runRequest(tx.objectStore(META_STORE).getAll());
}

export async function getStoredBytes(url: string): Promise<ArrayBuffer | undefined> {
	const db = await openDb();
	const tx = db.transaction(ASSETS_STORE, "readonly");
	const record = await runRequest<{ url: string; bytes: ArrayBuffer } | undefined>(
		tx.objectStore(ASSETS_STORE).get(url)
	);
	return record?.bytes;
}

export async function putStoredAsset(meta: CacheMeta, bytes: ArrayBuffer): Promise<void> {
	const db = await openDb();
	const tx = db.transaction([ASSETS_STORE, META_STORE], "readwrite");
	tx.objectStore(ASSETS_STORE).put({ url: meta.url, bytes });
	tx.objectStore(META_STORE).put(meta);
	await runTx(tx);
}

export async function touchMeta(meta: CacheMeta): Promise<void> {
	const db = await openDb();
	const tx = db.transaction(META_STORE, "readwrite");
	tx.objectStore(META_STORE).put(meta);
	await runTx(tx);
}

export async function deleteStoredAsset(url: string): Promise<void> {
	const db = await openDb();
	const tx = db.transaction([ASSETS_STORE, META_STORE], "readwrite");
	tx.objectStore(ASSETS_STORE).delete(url);
	tx.objectStore(META_STORE).delete(url);
	await runTx(tx);
}

export async function clearStore(): Promise<void> {
	const db = await openDb();
	const tx = db.transaction([ASSETS_STORE, META_STORE], "readwrite");
	tx.objectStore(ASSETS_STORE).clear();
	tx.objectStore(META_STORE).clear();
	await runTx(tx);
}
