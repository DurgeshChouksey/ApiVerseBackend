import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { errorHandler } from './middlewares/error.middleware'
import v1Router from './routes/v1'

const app = new Hono()

app.use('*',
    cors({
    origin: ['http://localhost:5173', 'https://api-verse-frontend.vercel.app'],
    credentials: true,
  })
)

app.route('/api/v1', v1Router);

app.onError(errorHandler);

export default app;
