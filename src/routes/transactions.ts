import crypto, { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { z } from 'zod'
import { FastifyInstance } from 'fastify'
import { checkeSessionIdExist } from '../middleware/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {
  // app.addHook('preHandler', async (request) => {
  //   console.log(`[${request.method}  ${request.url}]`)
  // })
  app.get(
    '/',
    {
      preHandler: [checkeSessionIdExist],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const transactions = await knex('transactions')
        .where('session_id', sessionId)
        .select('*')

      return {
        transactions,
      }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkeSessionIdExist],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const getTransactionParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getTransactionParamsSchema.parse(request.params)

      const transactions = await knex('transactions')
        .where({
          id,
          session_id: sessionId,
        })
        .first()

      return { transactions }
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [checkeSessionIdExist],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const summary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amount', { as: 'amount' })
        .first()

      return { summary }
    },
  )

  app.post('/', async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['debit', 'credit']),
    })

    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId
    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: crypto.randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })
}
