import { Hono } from 'hono'
import { blogRouter } from './Routes/blog'
import userRouter from './Routes/user'
import { verify } from 'hono/jwt'
const app =  new Hono<{
  Bindings:{
    DATABASE_URL:string,
    JWT_SECRET:string
  }
}>





app.route('/api/v1/user',userRouter)
app.route('/api/v1/blog',blogRouter)
export default app
