import { describe, expect, it } from "vitest";
import { getAnimationPrefix } from "$lib/core/animationName";

describe("getAnimationPrefix", () => {
	it("parses the leading two-digit number", () => {
		expect(getAnimationPrefix("04_Touch")).toBe(4);
		expect(getAnimationPrefix("90_BG")).toBe(90);
	});

	it("is case-insensitive and treats spaces like underscores", () => {
		expect(getAnimationPrefix("20 Loop 1")).toBe(20);
		expect(getAnimationPrefix("20_LOOP")).toBe(20);
	});

	it("returns NaN for a name with no leading number", () => {
		expect(Number.isNaN(getAnimationPrefix("idle"))).toBe(true);
	});
});
