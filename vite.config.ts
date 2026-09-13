import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'

// Dev-only: serve api/ai-agent.ts through the Vite dev server so `npm run dev` can
// be used to test the AI agent end-to-end without needing the Vercel CLI. Vercel
// itself picks up files under api/ automatically in production — this plugin only
// applies to `vite dev`.
function apiDevMiddleware(): Plugin {
  return {
    name: 'lifeup-api-dev-middleware',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/ai-agent', async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const mod = await server.ssrLoadModule('/api/ai-agent.ts')
          const handler = mod.default as (request: Request) => Promise<Response>

          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const bodyBuffer = Buffer.concat(chunks)

          const headers: Record<string, string> = {}
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers[key] = value
          }

          const webReq = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? bodyBuffer : undefined,
          })

          const webRes = await handler(webReq)
          res.statusCode = webRes.status
          webRes.headers.forEach((value, key) => res.setHeader(key, value))
          const text = await webRes.text()
          res.end(text)
        } catch (err) {
          console.error('[api dev middleware]', err)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'dev middleware error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
// The AI Agent needs a serverless backend (to call Gemini without exposing the API
// key), which GitHub Pages cannot run. Hosting is on Vercel, which serves the
// project from its own root domain — so the base path is just "/".
const BASE_PATH = '/'

export default defineConfig(({ mode }) => {
  const projectRoot = fileURLToPath(new URL('.', import.meta.url))

  // Make .env.local's GEMINI_API_KEY available to api/ai-agent.ts when it runs
  // inside the Vite dev server (Vite only auto-exposes VITE_-prefixed vars to
  // client code; this is for the Node-side dev middleware above). Loaded from the
  // project root explicitly — the dev server's OS process.cwd() can differ from it
  // depending on how it was launched.
  const env = loadEnv(mode, projectRoot, '')
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY

  return {
    root: projectRoot,
    base: BASE_PATH,
    // Flat output (no assets/ subfolder) — keeps drag-and-drop uploads foolproof
    // if this project is ever hand-uploaded again.
    build: {
      assetsDir: '.',
    },
    plugins: [
      react(),
      tailwindcss(),
      apiDevMiddleware(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        includeAssets: ['favicon-32.png'],
        manifest: {
          id: BASE_PATH,
          name: 'LifeUp — ניהול חיים וכסף',
          short_name: 'LifeUp',
          description: 'תגיד לי לאן אתה רוצה להגיע — ואני אראה לך איך להגיע לשם.',
          lang: 'he',
          dir: 'rtl',
          theme_color: '#070a14',
          background_color: '#070a14',
          display: 'standalone',
          orientation: 'portrait',
          start_url: BASE_PATH,
          scope: BASE_PATH,
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        },
      }),
    ],
    server: {
      host: true,
    },
  }
})
