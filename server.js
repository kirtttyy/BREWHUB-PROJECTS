const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const DB_PATH = path.join(ROOT, 'data', 'db.json')
const PORT = Number(process.env.PORT) || 5501

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function safePath(urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0])
  const resolved = path.normalize(path.join(ROOT, clean === '/' ? 'index.html' : clean))
  if (!resolved.startsWith(ROOT)) return null
  return resolved
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'POST' && url.pathname === '/api/save-db') {
    try {
      const raw = await readBody(req)
      const data = JSON.parse(raw)
      if (!data || typeof data !== 'object' || !Array.isArray(data.users) || !Array.isArray(data.stores)) {
        return send(res, 400, JSON.stringify({ ok: false, error: 'Invalid database payload.' }), 'application/json')
      }
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8')
      return send(res, 200, JSON.stringify({ ok: true, path: 'data/db.json', savedAt: new Date().toISOString() }), 'application/json')
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message || 'Save failed.' }), 'application/json')
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, JSON.stringify({ ok: true, save: true }), 'application/json')
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed')
  }

  let filePath = safePath(url.pathname)
  if (!filePath) return send(res, 400, 'Bad path')

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html')
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return send(res, 404, 'Not found')
  }

  const ext = path.extname(filePath).toLowerCase()
  const type = TYPES[ext] || 'application/octet-stream'
  const buf = fs.readFileSync(filePath)
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(req.method === 'HEAD' ? undefined : buf)
})

server.listen(PORT, () => {
  console.log(`BrewHub running at http://127.0.0.1:${PORT}`)
  console.log(`Admin Save to db.json → POST /api/save-db → ${DB_PATH}`)
})
