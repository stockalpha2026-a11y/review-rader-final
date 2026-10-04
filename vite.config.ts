import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Local development only: serves /api/chat from api/chat.js so the chatbot works
// with `npm run dev`. On Vercel the real serverless function handles it instead.
// The key is read from .env (OPENROUTER_API_KEY, no VITE_ prefix, so it is never
// sent to the browser).
function devChatApi(): Plugin {
  return {
    name: 'dev-chat-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), '')
      for (const k of ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL']) if (env[k]) process.env[k] = env[k]
      server.middlewares.use('/api/chat', async (req, res) => {
        let raw = ''
        for await (const chunk of req) raw += chunk
        const shim: any = {
          status(c: number) { res.statusCode = c; return shim },
          json(b: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); return shim },
          end() { res.end(); return shim },
          setHeader(k: string, v: string) { res.setHeader(k, v) },
        }
        try {
          const mod = await server.ssrLoadModule('/api/chat.js')
          await mod.default({ method: req.method, headers: req.headers, body: raw }, shim)
        } catch (e) {
          shim.status(500).json({ error: 'Local chat API error' })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devChatApi()],
})
