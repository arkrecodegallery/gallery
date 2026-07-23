import fs from "node:fs";
import path from "node:path";

export function loadDotEnv(repoRoot: string): Record<string, string> {
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
