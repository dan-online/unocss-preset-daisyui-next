import { defineConfig } from 'vite'
import unocss from 'unocss/vite'
import { presetIcons, presetWind3 } from 'unocss'
import { presetDaisy } from '..';

export default defineConfig({
	plugins: [
		unocss({
			presets: [presetWind3(), presetIcons(), presetDaisy({
				themes: true
			})],
		}),
	],
})
