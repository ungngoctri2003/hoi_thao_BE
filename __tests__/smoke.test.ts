import request from 'supertest';
import app from '../src/app';

describe('Smoke', () => {
  it('GET /healthz should return ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/v1/ping should return pong', async () => {
    const res = await request(app).get('/api/v1/ping');
    expect(res.status).toBe(200);
    expect(res.body.data).toBe('pong');
  });
});


















