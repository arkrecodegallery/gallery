export function getAnimationPrefix(name: string): number {
	const fullName = name.replaceAll(" ", "_").toLocaleLowerCase();
	return Number(fullName.split("_")[0]);
}
