import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../server/index.js'

describe('ChangeGuard API', () => {
  it('reports service health without authentication', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
  })

  it('rejects protected resources without a token', async () => {
    const response = await request(app).get('/api/changes')
    expect(response.status).toBe(401)
  })

  it('authenticates the seeded admin account', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'mugesh.kumar@example.com', password: 'ChangeGuard123!' })
    expect(response.status).toBe(200)
    expect(response.body.user.role).toBe('admin')
    expect(response.body.token).toEqual(expect.any(String))
  })
})
