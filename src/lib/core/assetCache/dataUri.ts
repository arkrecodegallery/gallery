const CHUNK_SIZE = 0x8000;

function bytesToBase64(bytes: ArrayBuffer): string {
	const uint8 = new Uint8Array(bytes);
	let binary = "";
	for (let i = 0; i < uint8.length; i += CHUNK_SIZE) {
		binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK_SIZE));
	}
	return btoa(binary);
}

export function toDataUri(bytes: ArrayBuffer, mimeType: string): string {
	return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}
