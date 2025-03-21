import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
	entries: ["src/index", "src/colors"],
	clean: true,
	declaration: true,
	rollup: {
		dts: {
			respectExternal: false,
		},
	},
});
