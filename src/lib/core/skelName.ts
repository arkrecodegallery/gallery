/** Basename of a skel path, e.g. "Assets/Game/Hero/H003/H003b/H003b.skel" -> "H003b". */
export function skelName(path: string): string {
	const file = path.split(/[/\\]/).pop() ?? path;
	return file.replace(/\.skel$/i, "").trim();
}
