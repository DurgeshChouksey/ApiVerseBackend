import { Hono } from 'hono'
import { BadRequestError } from './utils/errors'
import z from 'zod'
import { errorHandler } from './middlewares/error.middleware'
import v1Router from './routes/v1'

const app = new Hono()

app.route('/api/v1', v1Router);

app.onError(errorHandler);

export default app;
