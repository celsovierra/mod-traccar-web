import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';
import path from 'path';

const SIZES_PATH = () => path.resolve(process.cwd(), 'src/resources/images/icon/iconSizes.json');

function readSizes() {
  try {
    return JSON.parse(fs.readFileSync(SIZES_PATH(), 'utf-8'));
  } catch (e) {
    return { default: { tamanho: 1, largura: 1, altura: 1 } };
  }
}

function writeSizes(sizes) {
  fs.writeFileSync(SIZES_PATH(), JSON.stringify(sizes, null, 2));
}

function saveIconPlugin() {
  return {
    name: 'save-icon-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/dev-save-icon') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { name, dataUrl } = JSON.parse(body);
              const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
              if (!matches) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'invalid image' }));
                return;
              }
              const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
              const base64Data = matches[2];
              const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `icon-${Date.now()}`;
              const dir = path.resolve(process.cwd(), 'src/resources/images/icon/rotativos');
              fs.mkdirSync(dir, { recursive: true });
              const filePath = path.join(dir, `${safeName}.${ext}`);
              fs.writeFileSync(filePath, base64Data, 'base64');

              const sizes = readSizes();
              if (!Object.prototype.hasOwnProperty.call(sizes, safeName)) {
                sizes[safeName] = { tamanho: 1, largura: 1, altura: 1 };
                writeSizes(sizes);
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, fileName: `${safeName}.${ext}`, name }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        } else if (req.method === 'POST' && req.url === '/api/save-icon-size') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { key, tamanho, largura, altura } = JSON.parse(body);
              if (!key) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'missing key' }));
                return;
              }
              const sizes = readSizes();
              sizes[key] = {
                tamanho: Number(tamanho) || 1,
                largura: Number(largura) || 1,
                altura: Number(altura) || 1,
              };
              writeSizes(sizes);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, sizes: sizes[key] }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        } else if (req.method === 'GET' && req.url === '/api/get-icon-sizes') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(readSizes()));
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => ({
  server: {
    proxy: {
      '/api-smsmarket': {
        target: 'https://api.smsmarket.com.br/webservice-rest',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-smsmarket/, ''),
      },
      '/api/socket': {
        target: 'wss://gpscell.site',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'https://gpscell.site',
        changeOrigin: true,
      },
    },
    hmr: { overlay: false },
    port: 3000,
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1100,
  },
  plugins: [
    svgr(),
    react(),
    saveIconPlugin(),
    VitePWA({
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,woff,woff2,mp3}'],
      },
      manifest: {
        short_name: 'Traccar',
        name: 'Traccar Web',
        theme_color: '#1976d2',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js', dest: '' },
      ],
    }),
  ],
}));
