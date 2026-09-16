import pg from 'pg'
import { DefaultAzureCredential } from '@azure/identity'
import { SecretClient } from '@azure/keyvault-secrets'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import nodemailer from 'nodemailer'
import OpenAI from 'openai'

const { Pool } = pg
let pool

export function getPostgresPool() {
  if (!process.env.DATABASE_URL) return null
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }, max: 10 })
  return pool
}

export async function ensureVectorStore() {
  const database = getPostgresPool()
  if (!database) return false
  await database.query('CREATE EXTENSION IF NOT EXISTS vector')
  await database.query('CREATE TABLE IF NOT EXISTS rag_documents (id uuid PRIMARY KEY, name text NOT NULL, content text NOT NULL, embedding vector(1536), uploaded_by text, created_at timestamptz NOT NULL DEFAULT now())')
  return true
}

export async function vectorSearch(query, embedding) {
  const database = getPostgresPool()
  if (!database) return []
  await ensureVectorStore()
  const sql = embedding?.length
    ? 'SELECT id, name, LEFT(content, 240) AS excerpt, 1 - (embedding <=> $1::vector) AS score FROM rag_documents WHERE content ILIKE $2 ORDER BY score DESC LIMIT 5'
    : 'SELECT id, name, LEFT(content, 240) AS excerpt, 1 AS score FROM rag_documents WHERE content ILIKE $1 LIMIT 5'
  return (await database.query(sql, embedding?.length ? [JSON.stringify(embedding), `%${query}%`] : [`%${query}%`])).rows
}

export async function getSecret(name) {
  if (!process.env.AZURE_KEY_VAULT_URL) return process.env[name]
  const client = new SecretClient(process.env.AZURE_KEY_VAULT_URL, new DefaultAzureCredential())
  return (await client.getSecret(name)).value
}

export function getAiClient() {
  const key = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!key) return null
  if (process.env.AZURE_OPENAI_ENDPOINT) return new OpenAI({ apiKey: key, baseURL: `${process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '')}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini'}`, defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-10-21' }, defaultHeaders: { 'api-key': key } })
  return new OpenAI({ apiKey: key })
}

export async function assumeAwsRole(roleArn, sessionName = 'changeguard-session') {
  if (!roleArn) throw new Error('AWS_ROLE_ARN is required')
  const client = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' })
  const result = await client.send(new AssumeRoleCommand({ RoleArn: roleArn, RoleSessionName: sessionName, DurationSeconds: 3600 }))
  return { assumedRole: roleArn, expiresAt: result.Credentials?.Expiration, accessKeyId: result.Credentials?.AccessKeyId }
}

export async function sendNotification({ subject, message }) {
  const results = []
  if (process.env.SLACK_WEBHOOK_URL) {
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `*${subject}*\n${message}` }) })
    results.push({ channel: 'slack', ok: response.ok })
  }
  if (process.env.SMTP_HOST && process.env.NOTIFICATION_EMAIL) {
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } })
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: process.env.NOTIFICATION_EMAIL, subject, text: message })
    results.push({ channel: 'email', ok: true })
  }
  return results
}
