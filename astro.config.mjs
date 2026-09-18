// @ts-check

import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

import cloudflare from '@astrojs/cloudflare';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  output: isGitHubPages ? 'static' : 'server',

  site: isGitHubPages
    ? 'https://serein020.github.io'
    : 'https://rocophotogallery.weykeiii.workers.dev',

  base: isGitHubPages ? '/RocoPhotoGallery' : undefined,

  integrations: [vue()],

  ...(isGitHubPages
    ? {}
    : {
        adapter: cloudflare(),
      }),
});