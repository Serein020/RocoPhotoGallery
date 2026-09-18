// @ts-check

import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  integrations: [vue()],
  adapter: cloudflare(),
});