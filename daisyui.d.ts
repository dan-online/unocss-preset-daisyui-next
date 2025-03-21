declare module "daisyui/theme/object.js" {
	import type { CssInJs } from "postcss-js";
	const css = CssInJs;
	export default css;
}

declare module "daisyui/functions/variables.js" {
	const colors: Record<string, string>;
	const variables: Record<"colors", colors>;
	export default variables;
}
