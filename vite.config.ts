import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { nasaApiPlugin } from './vite/nasaApiPlugin.ts';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const releaseBuild = mode === 'release';
  const env = loadEnv(mode, projectRoot, '');
  if (!process.env.NASA_API_KEY && env.NASA_API_KEY) {
    process.env.NASA_API_KEY = env.NASA_API_KEY;
  }
  return {
    plugins: [react(), tailwindcss(), nasaApiPlugin()],
    assetsInclude: ['**/*.glb'],
    resolve: {
      alias: [
        { find: '@', replacement: resolve(projectRoot, '.') },
        ...(releaseBuild
          ? [{
              find: /^\.\.\/\.\.\/assets\/images\/dashboard_poster_1794643417554\.jpg$/,
              replacement: resolve(projectRoot, 'src/utils/noPosterImage.ts'),
            }]
          : []),
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // The release pipeline copies only an explicit runtime asset allowlist after Vite builds.
      // This prevents local-only GLBs from being swept into dist-release by publicDir copying.
      ...(releaseBuild ? { outDir: 'dist-release', emptyOutDir: true } : {}),
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'three-vendor',
                test: /node_modules[\\/](?:three|three-stdlib|@react-three[\\/](?:fiber|drei))(?:[\\/]|$)/,
                maxSize: 400_000,
                priority: 10,
              },
            ],
          },
        },
      },
    },
    ...(releaseBuild ? { publicDir: false } : {}),
  };
});
