// @ts-check

import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

import cloudflare from '@astrojs/cloudflare';

const isNetlify = process.env.NETLIFY === 'true';

export default defineConfig({
  output: isNetlify ? 'static' : 'server',

  integrations: [vue()],

  ...(isNetlify
    ? {}
    : {
        adapter: cloudflare(),
      }),
});