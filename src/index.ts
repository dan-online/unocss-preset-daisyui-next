import type { DynamicRule, Preflight, Preset } from "@unocss/core";
import autoprefixer from "autoprefixer";
import camelCase from "camelcase";

import { interpolate, type Oklch, oklch } from "culori";
import { getDaisyUIObjects, type CssInJs } from "./utils";

const base = await getDaisyUIObjects("base");
const utilities = await getDaisyUIObjects("utilities");
const components = await getDaisyUIObjects("components");

import variables from "daisyui/functions/variables.js";
import allThemes from "daisyui/theme/object.js";
import { type ClassToken, tokenize } from "parsel-js";
import postcss, { type Rule, type ChildNode } from "postcss";
import { parse } from "postcss-js";

const colorNames = variables.colors;

const processor = postcss(autoprefixer);
const process = (object: CssInJs) =>
	processor.process(object, { parser: parse });

const replacePrefix = (css: string) => css.replaceAll("--tw-", "--un-");

const defaultOptions = {
	styled: true,
	themes: false as
		| boolean
		| Array<string | Record<string, Record<string, string>>>,
	base: true,
	utils: true,
	rtl: false,
	darkTheme: "dark",
};

export const defaultThemes = Object.keys(allThemes);

const colorObjToString = (colorObj: Oklch) =>
	`${colorObj.l} ${colorObj.c} ${colorObj.h}`;

const generateDarkenColorFrom = (input: string, percentage = 0.07) => {
	try {
		const result = interpolate([input, "black"], "oklch")(percentage);
		return colorObjToString(result);
	} catch (e) {
		// colorIsInvalid(input)
		return false;
	}
};

const isDark = (color: string) => {
	const [l] = color.split(" ").map((n) => Number.parseFloat(n)) as [number];
	return l < 50;
};

const generateForegroundColorFrom = (
	input: string | undefined,
	percentage = 0.8,
) => {
	if (!input) {
		return "0% 0 0";
	}

	try {
		const result = interpolate(
			[input, isDark(input) ? "white" : "black"],
			"oklch",
		)(percentage);
		return colorObjToString(result);
	} catch (e) {
		// colorIsInvalid(input)
		return false;
	}
};

const themeDefaults = {
	themeOrder: Object.keys(allThemes),
	variables: {
		"--rounded-box": "1rem",
		"--rounded-btn": "0.5rem",
		"--rounded-badge": "1.9rem",
		"--animation-btn": "0.25s",
		"--animation-input": ".2s",
		"--btn-focus-scale": "0.95",
		"--border-btn": "1px",
		"--tab-border": "1px",
		"--tab-radius": "0.5rem",
	},
};

const convertColorFormat = (input: Record<string, string>) => {
	const resultObj: Record<string, typeof variables.colors> = {};

	for (const [rule, value] of Object.entries(input)) {
		if (rule in colorNames) {
			try {
				const colorObj = oklch(value)!;
				resultObj[colorNames[rule]] = colorObjToString(colorObj);
			} catch (e) {
				return false;
			}
		} else {
			resultObj[rule] = value;
		}

		// auto generate base colors
		if (!("base-100" in input)) {
			resultObj["--b1"] = "100% 0 0";
		}
		if (!("base-200" in input)) {
			resultObj["--b2"] = generateDarkenColorFrom(input["base-100"]!, 0.07);
		}
		if (!("base-300" in input)) {
			if ("base-200" in input) {
				resultObj["--b3"] = generateDarkenColorFrom(input["base-200"], 0.07);
			} else {
				resultObj["--b3"] = generateDarkenColorFrom(input["base-100"]!, 0.14);
			}
		}

		// auto generate state colors
		if (!("info" in input)) {
			resultObj["--in"] = "72.06% 0.191 231.6";
		}
		if (!("success" in input)) {
			resultObj["--su"] = "64.8% 0.150 160";
		}
		if (!("warning" in input)) {
			resultObj["--wa"] = "84.71% 0.199 83.87";
		}
		if (!("error" in input)) {
			resultObj["--er"] = "71.76% 0.221 22.18";
		}

		// auto generate content colors
		if (!("base-content" in input)) {
			resultObj["--bc"] = generateForegroundColorFrom(input["base-100"]!, 0.8);
		}
		if (!("primary-content" in input)) {
			resultObj["--pc"] = generateForegroundColorFrom(input["primary"], 0.8);
		}
		if (!("secondary-content" in input)) {
			resultObj["--sc"] = generateForegroundColorFrom(input["secondary"], 0.8);
		}
		if (!("accent-content" in input)) {
			resultObj["--ac"] = generateForegroundColorFrom(input["accent"], 0.8);
		}
		if (!("neutral-content" in input)) {
			resultObj["--nc"] = generateForegroundColorFrom(input["neutral"], 0.8);
		}
		if (!("info-content" in input)) {
			if ("info" in input) {
				resultObj["--inc"] = generateForegroundColorFrom(input["info"], 0.8);
			} else {
				resultObj["--inc"] = "0% 0 0";
			}
		}
		if (!("success-content" in input)) {
			if ("success" in input) {
				resultObj["--suc"] = generateForegroundColorFrom(input["success"], 0.8);
			} else {
				resultObj["--suc"] = "0% 0 0";
			}
		}
		if (!("warning-content" in input)) {
			if ("warning" in input) {
				resultObj["--wac"] = generateForegroundColorFrom(input["warning"], 0.8);
			} else {
				resultObj["--wac"] = "0% 0 0";
			}
		}
		if (!("error-content" in input)) {
			if ("error" in input) {
				resultObj["--erc"] = generateForegroundColorFrom(input["error"], 0.8);
			} else {
				resultObj["--erc"] = "0% 0 0";
			}
		}

		// add css variables if not exist
		for (const item of Object.entries(themeDefaults.variables)) {
			const [variable, value] = item;
			if (!(variable in input)) {
				resultObj[variable] = value;
			}
		}

		// add other custom styles
		if (!(rule in colorNames)) {
			resultObj[rule] = value;
		}
	}

	return resultObj;
};

const injectThemes = (
	addBase: (themes: unknown) => void,
	config: (key: string) => unknown,
	themes: Record<string, Record<string, string>>,
) => {
	const includedThemesObj: Record<string, Record<string, string> | false> = {};
	// add default themes
	const themeRoot = (config("daisyui.themeRoot") as string) ?? ":root";
	for (const [theme, value] of Object.entries(themes)) {
		includedThemesObj[theme] = convertColorFormat(
			value as Record<string, string>,
		);
	}

	// add custom themes
	if (Array.isArray(config("daisyui.themes"))) {
		for (const item of config("daisyui.themes") as Array<
			string | Record<string, Record<string, string>>
		>) {
			if (typeof item === "object" && item !== null) {
				for (const [customThemeName, customThemevalue] of Object.entries(
					item,
				)) {
					includedThemesObj[customThemeName] = convertColorFormat(
						customThemevalue as Record<string, string>,
					);
				}
			}
		}
	}

	let themeOrder = [];
	if (Array.isArray(config("daisyui.themes"))) {
		for (const theme of config("daisyui.themes") as Array<
			string | Record<string, Record<string, string>>
		>) {
			if (typeof theme === "object" && theme !== null) {
				for (const customThemeName of Object.keys(theme)) {
					themeOrder.push(customThemeName);
				}
			} else if (theme in includedThemesObj) {
				themeOrder.push(theme);
			}
		}
	} else if (config("daisyui.themes") === true) {
		themeOrder = themeDefaults.themeOrder;
	} else {
		themeOrder = ["light", "dark"];
	}

	// inject themes in order
	const themesToInject: Record<string, unknown> = {};
	themeOrder.forEach((themeName, index) => {
		if (index === 0) {
			// first theme as root
			themesToInject[themeRoot] = includedThemesObj[themeName];
		} else if (index === 1) {
			// auto dark
			if (config("daisyui.darkTheme")) {
				if (
					themeOrder[0] !== config("daisyui.darkTheme") &&
					themeOrder.includes(config("daisyui.darkTheme") as string)
				) {
					themesToInject["@media (prefers-color-scheme: dark)"] = {
						[themeRoot]: includedThemesObj[`${config("daisyui.darkTheme")}`],
					};
				}
			} else if (config("daisyui.darkTheme") === false) {
				// disables prefers-color-scheme: dark
			} else {
				if (themeOrder[0] !== "dark" && themeOrder.includes("dark")) {
					themesToInject["@media (prefers-color-scheme: dark)"] = {
						[themeRoot]: includedThemesObj["dark"],
					};
				}
			}
			// theme 0 with name
			themesToInject[`[data-theme=${themeOrder[0]}]`] =
				includedThemesObj[themeOrder[0]!];
			themesToInject[
				`${themeRoot}:has(input.theme-controller[value=${themeOrder[0]}]:checked)`
			] = includedThemesObj[themeOrder[0]!];
			// theme 1 with name
			themesToInject[`[data-theme=${themeOrder[1]}]`] =
				includedThemesObj[themeOrder[1]!];
			themesToInject[
				`${themeRoot}:has(input.theme-controller[value=${themeOrder[1]}]:checked)`
			] = includedThemesObj[themeOrder[1]!];
		} else {
			themesToInject[`[data-theme=${themeName}]`] =
				includedThemesObj[themeName];
			themesToInject[
				`${themeRoot}:has(input.theme-controller[value=${themeName}]:checked)`
			] = includedThemesObj[themeName];
		}
	});

	addBase(themesToInject);

	return {
		includedThemesObj,
		themeOrder,
	};
};

export const presetDaisy = (o: Partial<typeof defaultOptions> = {}): Preset => {
	const options = { ...defaultOptions, ...o };

	const rules = new Map<string, string>();
	const specialRules: Record<string, string[]> = {
		keyframes: [],
		supports: [],
	};
	const nodes: Rule[] = [];

	// const styles = [options.styled ? styled : unstyled];
	const styles = options.styled ? Object.values(components) : [];
	// console.log(styles)
	// if (options.utils) {
	// 	styles.push(...Object.values(utilities));
	// }

	const categorizeRules = (node: ChildNode) => {
		if (node.type === "rule") {
			nodes.push(node);
		} else if (node.type === "atrule") {
			if (Array.isArray(specialRules[node.name])) {
				specialRules[node.name]?.push(String(node));
			} else if (node.nodes) {
				// ignore and keep traversing, e.g. for @media
				for (const child of node.nodes) {
					categorizeRules(child);
				}
			}
		}
	};

	for (const style of styles) {
		const root = process(style).root;

		for (const node of root.nodes as ChildNode[]) {
			categorizeRules(node);
		}
	}

	for (const node of nodes) {
		const selector = node.selectors[0]!;
		const tokens = tokenize(selector);
		const token = tokens[0]!;
		let base = "";

		if (token.type === "class") {
			// Resolve conflicts with @unocss/preset-wind link variant
			// .link-* -> .link
			if (selector.startsWith(".link-")) {
				base = "link";
			} else if (selector.startsWith(".modal-open")) {
				base = "modal";
			} else {
				base = token.name;
			}
		} else if (token.type === "pseudo-class" && token.name === "where") {
			// :where(.foo) -> .foo
			base = (tokenize(token.argument!)[0] as ClassToken).name;
		} else if (['[dir="rtl"]', ":root"].includes(token.content)) {
			// Special case for https://github.com/saadeghi/daisyui/blob/6db14181733915278621d9b2d128b0af43c52323/src/components/unstyled/modal.css#LL28C1-L28C89
			base = tokens[1]?.content.includes(".modal-open")
				? "modal"
				: // Skip prefixes
					(tokens[2] as ClassToken).name;
		}

		rules.set(base, `${(rules.get(base) ?? "") + String(node)}\n`);
	}

	const preflights: Preflight[] = Object.entries(specialRules).map(
		([key, value]) => ({
			getCSS: () => value.join("\n"),
			layer: `daisy-${key}}`,
		}),
	);

	if (options.base) {
		preflights.unshift({
			getCSS: () => replacePrefix(process(base).css),
			layer: "daisy-base",
		});
	}

	injectThemes(
		(theme) => {
			preflights.push({
				getCSS: () => replacePrefix(process(theme as CssInJs).css),
				layer: "daisy-themes",
			});
		},
		(key) => {
			if (key === "daisyui.themes") {
				return options.themes;
			}

			if (key === "daisyui.darkTheme") {
				return options.darkTheme;
			}

			return;
		},
		allThemes,
	);

	if (options.utils) {
		for (const util of Object.values(utilities)) {
			preflights.push({
				getCSS: () => replacePrefix(process(util).css),
				layer: "daisy-utilities",
			});
		}
	}

	return {
		name: "unocss-preset-daisyui-next",
		preflights,
		theme: {
			colors: {
				...Object.fromEntries(
					Object.entries(variables.colors)
						.filter(
							([color]) =>
								// Already in @unocss/preset-mini
								// https://github.com/unocss/unocss/blob/0f7efcba592e71d81fbb295332b27e6894a0b4fa/packages/preset-mini/src/_theme/colors.ts#L11-L12
								// !["transparent", "current"].includes(color) && // Removed in daisyui v5
								// Added below
								!color.startsWith("base"),
						)
						.map(([color, value]) => [camelCase(color), value]),
				),
				base: Object.fromEntries(
					Object.entries(variables.colors)
						.filter(([color]) => color.startsWith("base"))
						.map(([color, value]) => [color.replace("base-", ""), value]),
				),
			},
			// ...utilities,
		},
		rules: [...rules].map(
			([base, rule]) =>
				[
					new RegExp(`^${base}$`),
					() => replacePrefix(rule),
					{
						layer: base.startsWith("checkbox-")
							? "daisy-components-post"
							: "daisy-components",
					},
				] satisfies DynamicRule,
		),
	};
};
