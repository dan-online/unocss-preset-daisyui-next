import type { DynamicRule, Preflight, Preset } from "@unocss/core";
import autoprefixer from "autoprefixer";
import camelCase from "camelcase";
import base from "daisyui/dist/base.js";
import styled from "daisyui/dist/styled.js";
import unstyled from "daisyui/dist/unstyled.js";
import utilitiesStyled from "daisyui/dist/utilities-styled.js";
import utilitiesUnstyled from "daisyui/dist/utilities-unstyled.js";
import utilities from "daisyui/dist/utilities.js";
import utilityClasses from "daisyui/src/lib/utility-classes.js";
import colorFunctions from "daisyui/src/theming/functions.js";
import colors from "daisyui/src/theming/index.js";
import allThemes from "daisyui/src/theming/themes.js";
import { type ClassToken, tokenize } from "parsel-js";
import postcss, { type Rule, type ChildNode } from "postcss";
import { type CssInJs, parse } from "postcss-js";

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

export const presetDaisy = (o: Partial<typeof defaultOptions> = {}): Preset => {
	const options = { ...defaultOptions, ...o };

	const rules = new Map<string, string>();
	const specialRules: Record<string, string[]> = {
		keyframes: [],
		supports: [],
	};
	const nodes: Rule[] = [];

	const styles = [options.styled ? styled : unstyled];
	if (options.utils) {
		styles.push(utilities, utilitiesUnstyled, utilitiesStyled);
	}

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

	colorFunctions.injectThemes(
		(theme) => {
			preflights.push({
				getCSS: () => process(theme).css,
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

	return {
		name: "unocss-preset-daisy",
		preflights,
		theme: {
			colors: {
				...Object.fromEntries(
					Object.entries(colors)
						.filter(
							([color]) =>
								// Already in @unocss/preset-mini
								// https://github.com/unocss/unocss/blob/0f7efcba592e71d81fbb295332b27e6894a0b4fa/packages/preset-mini/src/_theme/colors.ts#L11-L12
								!["transparent", "current"].includes(color) &&
								// Added below
								!color.startsWith("base"),
						)
						.map(([color, value]) => [camelCase(color), value]),
				),
				base: Object.fromEntries(
					Object.entries(colors)
						.filter(([color]) => color.startsWith("base"))
						.map(([color, value]) => [color.replace("base-", ""), value]),
				),
			},
			...utilityClasses,
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
