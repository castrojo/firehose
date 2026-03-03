// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // DOMAIN MIGRATION: When releases.cncf.io is live, update site to:
  //   site: 'https://releases.cncf.io'
  // No other code changes are needed — base is already '/' (custom domain root).
  //
  // Also update these three hardcoded GitHub repo links if the repo moves:
  //   src/layouts/MainLayout.astro  (footer "View on GitHub" link)
  //   src/pages/index.astro         (InfoBox "GitHub Repository" link)
  //   src/pages/news/index.astro    (InfoBox "GitHub Repository" link)
  //
  // GitHub Pages (current): site = 'https://castrojo.github.io', base = '/'
  // Custom domain (future):  site = 'https://releases.cncf.io',  base = '/'
  site: 'https://castrojo.github.io',
  base: '/',
  vite: {
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js']
      }
    }
  }
});
