import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "vitest";
import { loadDotEnv } from "./loadDotEnv";
import { parseAtlasPageImages } from "../src/lib/core/atlasPages";
import type { Bundle, Entry, Map as GalleryMap } from "../src/lib/core/types";

/**
 * Deploy-prep script: tree-shakes containers/ down to only the files
 * map.json actually references (skel/atlas/textures/CG images),
 * for the static (non-Tauri) build. containers/ dumps are full AssetStudio
 * exports and are typically orders of magnitude larger than what's used.
 *
 * Usage (from repo root):
 *   npx vitest run --config scripts/vitest.scripts.config.ts scripts/prepare-static-data.test.ts
 *
 * Reads source data from TEST_GALLERY_DIR (see .env / .env.example).
 * Optional OUT_DIR overrides the default output of static/gallery-data.
 */

function collectBundlePaths(bundle: Bundle | undefined, out: Set<string>) {
	if (!bundle) return;
	out.add(bundle.skel);
	out.add(bundle.atlas);
}

function collectEntryPaths(entry: Entry, out: Set<string>) {
	collectBundlePaths(entry.hero, out);
	collectBundlePaths(entry.alt, out);
	collectBundlePaths(entry.skill, out);

	for (const presentation of entry.bond ?? []) {
		if (presentation.kind === "animated") {
			collectBundlePaths(presentation.bundle, out);
		} else {
			presentation.images.forEach((image) => out.add(image));
		}
	}

	(entry.collection ?? []).forEach((image) => out.add(image));
}

function addAtlasTextures(containersDir: string, atlasRelativePath: string, out: Set<string>) {
	const atlasAbsolutePath = path.join(containersDir, ...atlasRelativePath.split("/"));
	if (!fs.existsSync(atlasAbsolutePath)) return;

	const atlasDir = path.posix.dirname(atlasRelativePath);
	const atlasText = fs.readFileSync(atlasAbsolutePath, "utf-8");
	for (const image of parseAtlasPageImages(atlasText)) {
		out.add(atlasDir === "." ? image : `${atlasDir}/${image}`);
	}
}

function copyReferencedFile(
	containersDir: string,
	outContainersDir: string,
	relativePath: string
): number {
	const src = path.join(containersDir, ...relativePath.split("/"));
	if (!fs.existsSync(src)) {
		console.warn(`  missing: ${relativePath}`);
		return 0;
	}

	const dest = path.join(outContainersDir, ...relativePath.split("/"));
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(src, dest);
	return fs.statSync(src).size;
}

function directorySize(dir: string): number {
	let total = 0;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
		if (entry.isFile()) {
			total += fs.statSync(path.join(entry.parentPath, entry.name)).size;
		}
	}
	return total;
}

it("tree-shakes containers/ down to the files map.json references", () => {
	const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const env = loadDotEnv(repoRoot);
	const galleryDir = process.env.TEST_GALLERY_DIR ?? env.TEST_GALLERY_DIR;
	if (!galleryDir) {
		throw new Error("TEST_GALLERY_DIR not set (check .env at repo root)");
	}

	const outDir = path.resolve(repoRoot, process.env.OUT_DIR ?? "static/gallery-data");
	const containersDir = path.join(galleryDir, "containers");
	const outContainersDir = path.join(outDir, "containers");

	const map: GalleryMap = JSON.parse(
		fs.readFileSync(path.join(galleryDir, "map.json"), "utf-8")
	);

	const referenced = new Set<string>();
	for (const entry of Object.values(map)) {
		collectEntryPaths(entry, referenced);
	}

	for (const relativePath of [...referenced]) {
		if (relativePath.endsWith(".atlas")) {
			addAtlasTextures(containersDir, relativePath, referenced);
		}
	}

	fs.rmSync(outContainersDir, { recursive: true, force: true });

	let copiedBytes = 0;
	for (const relativePath of referenced) {
		copiedBytes += copyReferencedFile(containersDir, outContainersDir, relativePath);
	}

	fs.mkdirSync(outDir, { recursive: true });
	fs.copyFileSync(path.join(galleryDir, "map.json"), path.join(outDir, "map.json"));

	const sourceBytes = directorySize(containersDir);
	console.log(
		`\nCopied ${referenced.size} files (${(copiedBytes / 1e6).toFixed(1)}MB) into ${outDir}, ` +
			`out of ${(sourceBytes / 1e6).toFixed(1)}MB in the source containers/ folder.`
	);
}, 600_000);
