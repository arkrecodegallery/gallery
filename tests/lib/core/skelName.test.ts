import { describe, expect, it } from "vitest";
import { skelName } from "$lib/core/skelName";

describe("skelName", () => {
	it("extracts the basename without extension", () => {
		expect(skelName("Assets/Game/Hero/H003/H003b/H003b.skel")).toBe("H003b");
	});

	it("handles backslash-separated paths", () => {
		expect(skelName("Assets\\Game\\Hero\\H003\\H003b.skel")).toBe("H003b");
	});

	it("trims a trailing space left over from a mangled source filename", () => {
		expect(skelName("Assets/Game/CG/A0368/A0368/A0368 .skel")).toBe("A0368");
	});
});
