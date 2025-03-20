import { defineConfig } from 'vite'
import unocss from 'unocss/vite'
import {  presetIcons, presetWind4 } from 'unocss'
import { presetDaisy } from 'unocss-preset-daisyui-next';

export default defineConfig({
	plugins: [
		unocss({
			presets: [presetWind4(), presetIcons(), presetDaisy({
				themes: true
			})],
		}),
	],
})
