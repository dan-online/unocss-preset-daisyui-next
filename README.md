# unocss-preset-daisyui-next

> [UnoCSS](https://github.com/unocss/unocss) preset for [daisyUI v4](https://github.com/saadeghi/daisyui)

> Extended from [unocss-preset-daisyui](https://github.com/MatthiesenXYZ/unocss-preset-daisyui)

[Checkout the demo!](https://unocss-preset-daisyui-next.pages.dev/)

## Installation

```sh
npm install unocss daisyui unocss-preset-daisyui-next
```

## Usage

> **Note**: `@unocss/reset` comes with `unocss`. If you are using pnpm, install it separately unless you enable hoisting.

### Vite

```ts
import { defineConfig } from 'vite'
import unocss from 'unocss/vite'
import { presetUno } from 'unocss'
import { presetDaisy } from 'unocss-preset-daisyui-next'

export default defineConfig({
	plugins: [
		unocss({
			presets: [presetUno(), presetDaisy()],
		}),
	],
})
```

```js
import '@unocss/reset/tailwind.css'
import 'uno.css'
```

### Astro

```js
import { defineConfig } from 'astro/config'
import unocss from 'unocss/astro'
import { presetUno } from 'unocss'
import { presetDaisy } from 'unocss-preset-daisyui-next'

export default defineConfig({
	integrations: [
		unocss({
			presets: [presetUno(), presetDaisy()],
			injectReset: true,
		}),
	],
})
```

### Nuxt

To use UnoCSS with Nuxt, `@unocss/nuxt` must be installed as well.

```js
import {defineNuxtConfig } from 'nuxt/config'
import { presetUno } from 'unocss'
import { presetDaisy } from 'unocss-preset-daisyui-next'

export default defineNuxtConfig({
	modules: ['@unocss/nuxt'],
	css: ['@unocss/reset/tailwind.css'],
	unocss: {
		presets: [presetUno(), presetDaisy()],
	},
})
```

## Config

This preset accepts [the same config as daisyUI](https://daisyui.com/docs/config/) (except for `logs` and `prefix`).

```js
{
	presets: [
		presetUno(),
		presetDaisy({
			styled: false,
			themes: ['light', 'dark'],
		}),
	],
}
```

## Limitations

**This is not a full daisyUI port.** All daisyUI components/utilities should work but they may not work with some UnoCSS features:

- [#14](https://github.com/kidonng/unocss-preset-daisy/issues/14): [variants](https://windicss.org/utilities/general/variants.html) do not work

**Unused styles may be imported.** This is both due to lots of hacks being used and how UnoCSS works. However, the preset will try to figure out the minimum styles needed, thus the cost is trivial most of the time.

## License

Distributed under the MIT License. See [LICENSE](https://dancodes.mit-license.org) for more information.