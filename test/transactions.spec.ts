import { it, beforeAll, afterAll, expect, beforeEach } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../src/app'
import { describe } from 'node:test'

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('Should be able to create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        title: 'hotdog',
        amount: 4000,
        type: 'debit',
      })
      .expect(201)
  })

  it('Should be able to list all transactions', async () => {
    const createTransactionsresponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'hotdog',
        amount: 4000,
        type: 'debit',
      })

    const cookies = createTransactionsresponse.get('Set-Cookie')

    const listTransctionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransctionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'hotdog',
        amount: -4000,
      }),
    ])
  })

  it('Should be able to get a specific transaction', async () => {
    const createTransactionsresponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'hotdog',
        amount: 4000,
        type: 'debit',
      })

    const cookies = createTransactionsresponse.get('Set-Cookie')

    const listTransctionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransctionsResponse.body.transactions[0].id

    const getTransctionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransctionResponse.body.transactions).toEqual(
      expect.objectContaining({
        title: 'hotdog',
        amount: -4000,
      }),
    )
  })

  it('Should be able to get sumary', async () => {
    const createTransactionsresponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'credit',
        amount: 4000,
        type: 'credit',
      })

    const cookies = createTransactionsresponse.get('Set-Cookie')

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        title: 'debit',
        amount: 2000,
        type: 'debit',
      })

    const sumaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(sumaryResponse.body.summary).toEqual({
      amount: 2000,
    })
  })
})
