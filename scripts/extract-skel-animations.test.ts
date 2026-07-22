import { it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	SkeletonBinary,
	RegionAttachment,
	MeshAttachment,
	BoundingBoxAttachment,
	PathAttachment,
	PointAttachment,
	ClippingAttachment,
} from "@esotericsoftware/spine-core";
import { Animate } from "../src/lib/core/animate";
import { getBondRule } from "../src/lib/core/bondRules";

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
 * Optional HERO_ID=<id> applies that hero's bondRules.ts override (skip/
 * rename/disable) before grouping, same as the app would.
 *
 * TEST_GALLERY_DIR is read from .env at repo root (see .env.example).
 */

function loadDotEnv(repoRoot: string): Record<string, string> {
	const envPath = path.join(repoRoot, ".env");
	const env: Record<string, string> = {};
	if (!fs.existsSync(envPath)) {
		return env;
	}

	for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
		const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
		if (!match) continue;
		env[match[1]] = match[2].replace(/^["']|["']$/g, "");
	}
	return env;
}

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
	const stubLoader: any = {
		newRegionAttachment: (_skin: any, name: string, imgPath: string) => {
			const region = new RegionAttachment(name, imgPath);
			region.region = { u: 0, v: 0, u2: 1, v2: 1 } as any;
			return region;
		},
		newMeshAttachment: (_skin: any, name: string, imgPath: string) => {
			const mesh = new MeshAttachment(name, imgPath);
			mesh.region = { u: 0, v: 0, u2: 1, v2: 1 } as any;
			return mesh;
		},
		newBoundingBoxAttachment: (_skin: any, name: string) =>
			new BoundingBoxAttachment(name),
		newPathAttachment: (_skin: any, name: string) => new PathAttachment(name),
		newPointAttachment: (_skin: any, name: string) => new PointAttachment(name),
		newClippingAttachment: (_skin: any, name: string) =>
			new ClippingAttachment(name),
	};

	const binary = new SkeletonBinary(stubLoader);
	const bytes = fs.readFileSync(skelPath);
	return binary.readSkeletonData(new Uint8Array(bytes));
}

function printReport(skelPath: string, heroId?: string) {
	console.log(`\n=== ${skelPath} ===`);

	const skeletonData = parseSkeleton(skelPath);
	skeletonData.animations.forEach((a, i) => console.log(`  [${i}] ${a.name}`));

	const rule = heroId ? getBondRule(heroId) : undefined;
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
			"Usage: SKEL_ID=<id or path fragment> [HERO_ID=<id>] npx vitest run scripts/extract-skel-animations.test.ts"
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
		printReport(skelPath, process.env.HERO_ID);
	}
});
