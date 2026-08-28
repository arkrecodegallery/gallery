import { it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Animate } from "../src/lib/core/animate";
import { getBondRule } from "../src/lib/core/bondRules";
import { skelName } from "../src/lib/core/skelName";
import { parseSkeletonBinary } from "../src/lib/core/skeletonParser";
import { loadDotEnv } from "./loadDotEnv";

/**
 * Dormant diagnostic script, not part of the regular test suite (lives
 * outside src/, so `npm run test`'s `src/**\/*.test.ts` glob skips it).
 *
 * Parses a real .skel file's true animation name order directly with
 * spine-core's binary reader, then runs it through Animate so bond
 * sequencing bugs (wrong stage/stop/bypass grouping) can be diagnosed
 * against real hero data without opening the app.
 *
 * Usage (from repo root):
 *   SKEL_ID=A0145 npx vitest run scripts/extract-skel-animations.test.ts
 *
 * SKEL_ID matches (case-insensitive substring) against .skel paths under
 * $TEST_GALLERY_DIR/containers - usually a bond id (A0145) or hero id
 * (H003), but any path fragment works.
 *
 * bondRules.ts is keyed by skel name, so the matched file's own basename
 * (e.g. "A0145") is used to look up its override (skip/rename/disable)
 * before grouping, exactly as the app would - no extra id needs passing.
 *
 * TEST_GALLERY_DIR is read from .env at repo root (see .env.example).
 */

function findSkelFiles(containersDir: string, query: string): string[] {
	const entries = fs.readdirSync(containersDir, {
		withFileTypes: true,
		recursive: true,
	});

	const results: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".skel")) {
			continue;
		}
		const full = path.join(entry.parentPath, entry.name);
		if (full.toLowerCase().includes(query.toLowerCase())) {
			results.push(full);
		}
	}
	return results;
}

function parseSkeleton(skelPath: string) {
	const bytes = fs.readFileSync(skelPath);
	return parseSkeletonBinary(new Uint8Array(bytes));
}

function printReport(skelPath: string) {
	console.log(`\n=== ${skelPath} ===`);

	const skeletonData = parseSkeleton(skelPath);
	skeletonData.animations.forEach((a, i) => console.log(`  [${i}] ${a.name}`));

	const rule = getBondRule(skelName(skelPath));
	const animate = new Animate(skeletonData.animations, rule);

	console.log("\n  -- Animate grouping (bond stages) --");
	animate.groups.forEach((group, stageIndex) => {
		const stop = group[0]?.animations.map((a) => a.name).join(" | ") ?? "(empty)";
		const bypass = group
			.slice(1)
			.map((entry) => entry.animations.map((a) => a.name).join(" | "))
			.join(", ");
		console.log(
			`  stage ${stageIndex}: stop=${stop}${bypass ? `  bypass=[${bypass}]` : ""}`
		);
	});

	if (animate.background.length > 0) {
		console.log(`  bg: ${animate.background.map((a) => a.name).join(", ")}`);
	}
}

it("extracts and groups a real skeleton's animations for manual inspection", () => {
	const query = process.env.SKEL_ID;
	if (!query) {
		console.log(
			"Usage: SKEL_ID=<id or path fragment> npx vitest run scripts/extract-skel-animations.test.ts"
		);
		return;
	}

	const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const env = loadDotEnv(repoRoot);
	const galleryDir = process.env.TEST_GALLERY_DIR ?? env.TEST_GALLERY_DIR;
	if (!galleryDir) {
		throw new Error("TEST_GALLERY_DIR not set (check .env at repo root)");
	}

	const containersDir = path.join(galleryDir, "containers");
	const matches = findSkelFiles(containersDir, query);
	if (matches.length === 0) {
		throw new Error(`No .skel files found matching "${query}" under ${containersDir}`);
	}

	for (const skelPath of matches) {
		printReport(skelPath);
	}
});
