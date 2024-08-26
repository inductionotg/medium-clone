import { Hono } from "hono";
import {PrismaClient} from "@prisma/client/edge"
import { withAccelerate } from '@prisma/extension-accelerate'
import {decode,sign} from "hono/jwt"
import { inputSign,inputLogin } from "@inductionOtg/medium-common";
export const userRouter =  new Hono<{
    Bindings:{
      DATABASE_URL:string,
      JWT_SECRET:string
    }
  }>


userRouter.post('/signup',async(c)=>{
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const body = await c.req.json()
    console.log(body)
    const {  success, data, error} = inputSign.safeParse(body)
    console.log(success)
    console.log("body",body.email)
    if(!success){
        c.status(411)
        return c.json({
            message:'Inputs not correct',
            errors:error.errors
        })
    }
    const findUser =await prisma.user.findUnique({
        where:{
            email:body.email
        }
    })
    console.log("copntext",findUser)
    if(findUser){
        return c.json({message:'User already exist'})
    }
    const user = await prisma.user.create({
        data:{
            email:body.email,
            password:body.password
        }
    })
    const token  =await sign({id:user.id},c.env.JWT_SECRET)
    return c.json({
        jwt:token
    })
})

userRouter.post('/signin',async (c)=>{
    const prisma = new PrismaClient({
    datasourceUrl:c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const body = await c.req.json()
    console.log("body",body.email)
    const { success} = inputLogin.safeParse(body)
    console.log(success)
    console.log("body",body.email)
    if(!success){
        c.status(411)
        return c.json({
            message:'Inputs not coorect'
        })
    }

    const findUser =await prisma.user.findUnique({
        where:{
            email:body.email,
            password:body.password
        }
    })

    if(!findUser){
        c.status(403)
        return c.json({error:"Users already exists"})
    }

    const token  =await sign({id:findUser.id},c.env.JWT_SECRET)

    return c.json({
        jwt:token
    })


})

export default userRouter