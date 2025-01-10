import { defineConfig } from 'vite'
import unocss from 'unocss/vite'
import { presetUno, presetIcons } from 'unocss'
import { presetDaisy } from '..'

export default defineConfig({
	plugins: [
		unocss({
			presets: [presetUno(), presetIcons(), presetDaisy({
				themes: true
			})],
		}),
	],
})
