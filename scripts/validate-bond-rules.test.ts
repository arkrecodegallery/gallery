import { expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Animation } from "@esotericsoftware/spine-core";
import { Animate } from "../src/lib/core/animate";
import { getBondRule } from "../src/lib/core/bondRules";
import { skelName } from "../src/lib/core/skelName";
import type { AnimationSheetEntry } from "../src/lib/core/animationSheet";
import { loadDotEnv } from "./loadDotEnv";

/**
 * Dormant diagnostic script, not part of the regular test suite (lives
 * outside src/, so `npm run test`'s `src/**\/*.test.ts` glob skips it).
 *
 * Re-groups every bond skel's already-exported raw animation order (from
 * animations.json, see the dev-only "export animation sheet" button) through
 * the live Animate + bondRules pipeline, and diffs the result against the
 * groups/background animations.json already recorded. This is a regression
 * net for editing bondRules.ts - it never touches .skel bytes, so it's much
 * faster than scripts/extract-skel-animations.test.ts for iterating on rules.
 *
 * Usage (from repo root):
 *   npx vitest run --config scripts/vitest.scripts.config.ts scripts/validate-bond-rules.test.ts
 *   SKEL_ID=A0145 npx vitest run --config scripts/vitest.scripts.config.ts scripts/validate-bond-rules.test.ts
 *
 * SKEL_ID matches (case-insensitive substring) against entry.skel paths.
 * TEST_GALLERY_DIR is read from .env at repo root (see .env.example); the
 * animations.json it points at must already exist (generate it once from the
 * running app's dev-only export button).
 */

function regroup(entry: AnimationSheetEntry) {
	const stub = entry.animations.map((name) => ({ name }) as Animation);
	const rule = getBondRule(skelName(entry.skel));
	const animate = new Animate(stub, rule);

	return {
		groups: animate.groups.map((group) =>
			group.map((groupEntry) => groupEntry.animations.map((a) => a.name))
		),
		background: animate.background.map((a) => a.name),
	};
}

it("recomputes every bond skel's groups/background and matches animations.json", () => {
	const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const env = loadDotEnv(repoRoot);
	const galleryDir = process.env.TEST_GALLERY_DIR ?? env.TEST_GALLERY_DIR;
	if (!galleryDir) {
		throw new Error("TEST_GALLERY_DIR not set (check .env at repo root)");
	}

	const sheetPath = path.join(galleryDir, "animations.json");
	if (!fs.existsSync(sheetPath)) {
		throw new Error(
			`animations.json not found at ${sheetPath} - export it once from the running app first`
		);
	}

	const sheet: AnimationSheetEntry[] = JSON.parse(fs.readFileSync(sheetPath, "utf-8"));
	const query = process.env.SKEL_ID?.toLowerCase();
	const bonds = sheet.filter(
		(entry) =>
			entry.kind === "bond" && (!query || entry.skel.toLowerCase().includes(query))
	);

	if (bonds.length === 0) {
		throw new Error(
			query ? `No bond entries matching SKEL_ID="${query}"` : "No bond entries in animations.json"
		);
	}

	const mismatches: string[] = [];
	for (const entry of bonds) {
		const recomputed = regroup(entry);
		const expected = { groups: entry.groups, background: entry.background };

		if (JSON.stringify(recomputed) !== JSON.stringify(expected)) {
			mismatches.push(entry.skel);
			console.log(`\n=== mismatch: ${entry.skel} ===`);
			console.log("expected groups:    ", JSON.stringify(expected.groups));
			console.log("recomputed groups:  ", JSON.stringify(recomputed.groups));
			console.log("expected background:  ", JSON.stringify(expected.background));
			console.log("recomputed background:", JSON.stringify(recomputed.background));
		}
	}

	console.log(`checked ${bonds.length} bond skel(s), ${mismatches.length} mismatch(es)`);
	expect(mismatches).toEqual([]);
});
