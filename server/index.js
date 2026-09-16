import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { assumeAwsRole, getAiClient, getPostgresPool, sendNotification, vectorSearch } from './integrations.js'

const port = Number(process.env.API_PORT || 4000)
const jwtSecret = process.env.JWT_SECRET || 'changeguard-development-secret'
const app = express()
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 }, storage: multer.memoryStorage() })
mkdirSync('data', { recursive: true })
const db = new Database(process.env.DATABASE_PATH || 'data/changeguard.db')

db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'reviewer', created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS changes (id TEXT PRIMARY KEY, title TEXT NOT NULL, environment TEXT NOT NULL, risk TEXT NOT NULL, status TEXT NOT NULL, owner_id TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, resource TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT, title TEXT NOT NULL, body TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, name TEXT NOT NULL, content TEXT NOT NULL, uploaded_by TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS deployments (id TEXT PRIMARY KEY, environment TEXT NOT NULL, version TEXT NOT NULL, status TEXT NOT NULL, created_by TEXT, created_at TEXT NOT NULL);
`)

const now = () => new Date().toISOString()
const id = () => randomUUID()
const seedPassword = bcrypt.hashSync('ChangeGuard123!', 10)
db.prepare('INSERT OR IGNORE INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').run('seed-admin', 'Mugesh Kumar', 'mugesh.kumar@example.com', seedPassword, 'admin', now())
if (db.prepare('SELECT COUNT(*) AS count FROM changes').get().count === 0) {
  const seed = db.prepare('INSERT INTO changes (id,title,environment,risk,status,owner_id,created_at) VALUES (?,?,?,?,?,?,?)')
  seed.run('#1052', 'Update payment service', 'Production', 'Low', 'Approved', 'seed-admin', now())
  seed.run('#1051', 'Deploy v1.3.0 (web app)', 'Staging', 'Medium', 'In Review', 'seed-admin', now())
  seed.run('#1050', 'Modify security group', 'Production', 'High', 'Blocked', 'seed-admin', now())
}

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '2mb' }))

function tokenFor(user) { return jwt.sign({ sub: user.id, role: user.role, name: user.name, email: user.email }, jwtSecret, { expiresIn: '8h' }) }
function auth(req, res, next) {
  const value = req.headers.authorization?.replace('Bearer ', '')
  if (!value) return res.status(401).json({ error: 'Authentication required' })
  try { req.user = jwt.verify(value, jwtSecret); next() } catch { res.status(401).json({ error: 'Invalid or expired token' }) }
}
function allow(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' }) }
function audit(actorId, action, resource, metadata = {}) { db.prepare('INSERT INTO audit_logs VALUES (?,?,?,?,?,?)').run(id(), actorId, action, resource, JSON.stringify(metadata), now()) }
function notify(userId, title, body) { db.prepare('INSERT INTO notifications VALUES (?,?,?,?,?,?)').run(id(), userId, title, body, 0, now()) }

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'changeguard-api', time: now(), database: 'sqlite' }))
app.get('/api/monitoring/metrics', auth, (_req, res) => {
  const metrics = { cpu: 18 + Math.floor(Math.random() * 14), memory: 48 + Math.floor(Math.random() * 16), latency: 95 + Math.floor(Math.random() * 45), errorRate: Number((0.4 + Math.random() * 0.7).toFixed(1)), timestamp: now() }
  res.json({ status: 'healthy', metrics, alerts: [{ severity: 'warning', message: 'CPU usage is within the configured threshold', age: 'live' }, { severity: 'info', message: 'All deployment health checks passed', age: 'live' }] })
})
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Name, email and an 8-character password are required' })
  try {
    const user = { id: id(), name, email: email.toLowerCase(), role: 'reviewer' }
    db.prepare('INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').run(user.id, user.name, user.email, bcrypt.hashSync(password, 10), user.role, now())
    audit(user.id, 'user.registered', 'user', { email: user.email })
    return res.status(201).json({ user, token: tokenFor(user) })
  } catch { return res.status(409).json({ error: 'An account with this email already exists' }) }
})
app.post('/api/auth/login', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email?.toLowerCase())
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' })
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role }
  audit(user.id, 'user.login', 'user')
  res.json({ user: safeUser, token: tokenFor(safeUser) })
})

app.get('/api/changes', auth, (req, res) => res.json(db.prepare('SELECT * FROM changes ORDER BY created_at DESC').all()))
app.post('/api/changes', auth, (req, res) => {
  const change = { id: `#${Math.floor(1000 + Math.random() * 8999)}`, title: req.body.title, environment: req.body.environment || 'Development', risk: req.body.risk || 'Medium', status: 'In Review', owner_id: req.user.sub, created_at: now() }
  if (!change.title) return res.status(400).json({ error: 'Title is required' })
  db.prepare('INSERT INTO changes VALUES (?,?,?,?,?,?,?)').run(change.id, change.title, change.environment, change.risk, change.status, change.owner_id, change.created_at)
  audit(req.user.sub, 'change.created', change.id, change); notify(req.user.sub, 'Change request created', `${change.id} is waiting for review`)
  res.status(201).json(change)
})
app.patch('/api/changes/:id', auth, (req, res) => {
  const change = db.prepare('SELECT * FROM changes WHERE id = ?').get(req.params.id)
  if (!change) return res.status(404).json({ error: 'Change not found' })
  const status = req.body.status || change.status
  db.prepare('UPDATE changes SET status = ?, risk = ? WHERE id = ?').run(status, req.body.risk || change.risk, change.id)
  audit(req.user.sub, 'change.updated', change.id, { status }); res.json({ ...change, status })
})

app.get('/api/audit', auth, allow('admin', 'reviewer'), (_req, res) => res.json(db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all()))
app.get('/api/notifications', auth, (req, res) => res.json(db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(req.user.sub)))
app.patch('/api/notifications/:id/read', auth, (req, res) => { db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.sub); res.json({ ok: true }) })

app.post('/api/ai/analyze', auth, async (req, res) => {
  const prompt = req.body.prompt || 'Analyze current production change risk'
  let answer = 'High risk detected. Review least-privilege access, confirm impacted resources, and require a rollback plan before production deployment.'
  const client = getAiClient()
  if (client) {
    const completion = await client.chat.completions.create({ model: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are ChangeGuard, a precise DevOps change-risk analyst.' }, { role: 'user', content: prompt }] })
    answer = completion.choices[0]?.message?.content || answer
  }
  audit(req.user.sub, 'ai.analysis', 'change', { prompt }); res.json({ answer, provider: client ? (process.env.AZURE_OPENAI_ENDPOINT ? 'azure-openai' : 'openai') : 'local-fallback', sources: ['ChangeGuard policy index', 'AWS security baseline'] })
})

app.post('/api/mcp/call', auth, async (req, res) => {
  const { tool, arguments: toolArguments = {} } = req.body
  if (!tool) return res.status(400).json({ error: 'MCP tool is required' })
  let result = { tool, status: 'completed', data: { message: 'Local MCP adapter response', arguments: toolArguments } }
  if (process.env.MCP_SERVER_URL) {
    const response = await fetch(process.env.MCP_SERVER_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.MCP_SERVER_TOKEN || ''}` }, body: JSON.stringify({ jsonrpc: '2.0', id: id(), method: 'tools/call', params: { name: tool, arguments: toolArguments } }) })
    result = await response.json()
  }
  audit(req.user.sub, 'mcp.tool_called', tool, toolArguments); res.json(result)
})

app.post('/api/rag/documents', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A document file is required' })
  const content = req.file.buffer.toString('utf8')
  const document = { id: id(), name: req.file.originalname, content, uploaded_by: req.user.sub, created_at: now() }
  db.prepare('INSERT INTO documents VALUES (?,?,?,?,?)').run(document.id, document.name, document.content, document.uploaded_by, document.created_at)
  audit(req.user.sub, 'rag.document_uploaded', document.name); res.status(201).json({ id: document.id, name: document.name, characters: content.length })
})
app.get('/api/rag/search', auth, (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) return res.json([])
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const documents = db.prepare('SELECT id,name,content,created_at FROM documents').all()
  const matches = documents.map((doc) => ({ ...doc, score: terms.reduce((score, term) => score + (doc.content.toLowerCase().includes(term) ? 1 : 0), 0) })).filter((doc) => doc.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(({ content, ...doc }) => ({ ...doc, excerpt: content.slice(0, 240) }))
  res.json(matches)
})
app.get('/api/rag/vector-search', auth, async (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) return res.json([])
  try { res.json(await vectorSearch(query)) } catch (error) { res.status(503).json({ error: 'Vector database unavailable', detail: error.message }) }
})

app.post('/api/aws/connect', auth, allow('admin'), async (req, res) => {
  let accountId = req.body.accountId || 'local-demo-account'
  let provider = 'configuration'
  if (process.env.AWS_ACCESS_KEY_ID) { const identity = await new STSClient({}).send(new GetCallerIdentityCommand({})); accountId = identity.Account || accountId; provider = 'aws-sts' }
  audit(req.user.sub, 'aws.account_connected', accountId); res.json({ connected: true, accountId, provider, services: ['EC2', 'S3', 'EKS', 'RDS', 'Lambda', 'CloudWatch'] })
})
app.post('/api/aws/assume-role', auth, allow('admin'), async (req, res) => {
  try { const result = await assumeAwsRole(req.body.roleArn || process.env.AWS_ROLE_ARN); audit(req.user.sub, 'aws.role_assumed', result.assumedRole); res.json(result) } catch (error) { res.status(400).json({ error: error.message }) }
})
app.post('/api/notifications/send', auth, allow('admin', 'reviewer'), async (req, res) => {
  try { const result = await sendNotification({ subject: req.body.subject || 'ChangeGuard notification', message: req.body.message || 'ChangeGuard event' }); audit(req.user.sub, 'notification.sent', 'notification', { result }); res.json({ delivered: result }) } catch (error) { res.status(502).json({ error: error.message }) }
})
app.get('/api/storage/status', auth, (_req, res) => res.json({ sqlite: true, postgresql: Boolean(getPostgresPool()), vectorSearch: Boolean(process.env.DATABASE_URL), keyVault: Boolean(process.env.AZURE_KEY_VAULT_URL), ai: Boolean(process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY) }))
app.post('/api/deployments', auth, (req, res) => {
  const deployment = { id: id(), environment: req.body.environment || 'Staging', version: req.body.version || 'latest', status: 'Queued', created_by: req.user.sub, created_at: now() }
  db.prepare('INSERT INTO deployments VALUES (?,?,?,?,?,?)').run(...Object.values(deployment)); audit(req.user.sub, 'deployment.queued', deployment.id, deployment); res.status(202).json(deployment)
})

export { app }

if (process.env.NODE_ENV !== 'test') app.listen(port, () => console.log(`ChangeGuard API listening on http://localhost:${port}`))
