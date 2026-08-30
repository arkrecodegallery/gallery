// Spine atlas format: each page block starts with its image filename as
// the first line after a blank line (or the start of the file).
export function parseAtlasPageImages(atlasText: string): string[] {
	const images: string[] = [];
	let expectHeader = true;
	for (const raw of atlasText.split(/\r?\n/)) {
		const line = raw.trim();
		if (line === "") {
			expectHeader = true;
			continue;
		}
		if (expectHeader) {
			images.push(line);
			expectHeader = false;
		}
	}
	return images;
}
