import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";

export type CssInJs = {
	[x: string]: unknown;
};

export const getDaisyUIObjects = async (type: string) => {
	const req = createRequire(import.meta.url);
	const path = resolve(dirname(req.resolve("daisyui")), type);
	const content: Record<string, CssInJs> = {};

	for (const file of readdirSync(path, {
		recursive: true,
	})) {
		const filePath = resolve(path, file.toString());

		if (basename(filePath) === "object.js") {
			const name = basename(dirname(filePath));

			// vite-ignore should be fine here
			content[name] = (await import(/* @vite-ignore */ filePath))
				.default as CssInJs;
		}
	}

	return content;
};
