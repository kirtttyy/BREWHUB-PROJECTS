const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const DB_PATH = path.join(ROOT, 'models', 'db.json')
const IMAGES = path.join(ROOT, 'images')
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
  '.gif': 'image/gif',
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
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

function extFromName(name = '', dataUrl = '') {
  const fromName = path.extname(name).toLowerCase()
  if (fromName) return fromName
  if (dataUrl.includes('image/png')) return '.png'
  if (dataUrl.includes('image/webp')) return '.webp'
  if (dataUrl.includes('image/gif')) return '.gif'
  return '.jpg'
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, JSON.stringify({ ok: true, upload: true }), 'application/json')
  }

  if (req.method === 'POST' && url.pathname === '/api/upload') {
    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw)
      const folder = ['stores', 'products'].includes(body.folder) ? body.folder : 'products'
      const dataUrl = String(body.dataUrl || '')
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (!match) {
        return send(res, 400, JSON.stringify({ ok: false, error: 'Invalid image data.' }), 'application/json')
      }
      const buf = Buffer.from(match[2], 'base64')
      if (buf.length > 2.5 * 1024 * 1024) {
        return send(res, 400, JSON.stringify({ ok: false, error: 'Image must be under 2.5MB.' }), 'application/json')
      }
      const dir = path.join(IMAGES, folder)
      fs.mkdirSync(dir, { recursive: true })
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extFromName(body.name, dataUrl)}`
      fs.writeFileSync(path.join(dir, filename), buf)
      const rel = `images/${folder}/${filename}`
      return send(res, 200, JSON.stringify({ ok: true, path: rel }), 'application/json')
    } catch (err) {
      return send(res, 500, JSON.stringify({ ok: false, error: err.message || 'Upload failed.' }), 'application/json')
    }
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
  console.log(`BrewHub MVC app → http://127.0.0.1:${PORT}`)
  console.log(`Model DB → ${DB_PATH}`)
  console.log(`Images → ${IMAGES}`)
})
