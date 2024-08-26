import { Hono } from "hono";

import {PrismaClient} from "@prisma/client/edge"
import { withAccelerate } from '@prisma/extension-accelerate'
import {decode,sign,verify} from "hono/jwt"
import { createPost,updateBlogPost } from "@inductionOtg/medium-common";
export const blogRouter = new Hono<{
    Bindings:{
      DATABASE_URL:string,
      JWT_SECRET:string
    },
    Variables:{
        userId:String
    }
   
  }>
blogRouter.use('/*',async(c,next)=>{

    const authorization = c.req.header('authorization')
    const token = authorization?.split(' ')[1]
    try{
        const verifiedToken = await verify(token||"",c.env.JWT_SECRET)
            console.log(verifiedToken,'ritesh')
            if(verifiedToken){
                //@ts-ignore
                c.set("userId",verifiedToken.id)
            await next()
            }
            else {
                c.status(403)
                return c.json({
                    message:'Unverified Token'
                })
            }

    }catch(e){
        c.status(403)
        return c.json({
            message:'You are not logged in'
        })
    }
    
})
blogRouter.post('/',async(c)=>{
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
        }).$extends(withAccelerate())
    
    const body = await c.req.json()
    const { success } = createPost.safeParse(body)
    if(!success){
        c.status(411)
        return c.json({
            message:'Wrong input'
        })
    }
    const authorId = c.get('userId')
    const postCreation = await prisma.post.create({
        data:{
            title:body.title,
            content:body.content,
            //@ts-ignore
            authorId:authorId
        }
    })

    return c.json({
        message:postCreation
    })
  
})

blogRouter.put('/',async(c)=>{
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
        }).$extends(withAccelerate())
    
    const body = await c.req.json()
    const authorId = c.get('userId')
    const { success } = updateBlogPost.safeParse(body)
    if(!success){
        c.status(411)
        return c.json({
            message:'Wrong input'
        })
    }
    const postCreation = await prisma.post.update({
        where:{
            //@ts-ignore
           id:body.id
        },
        data:{
            title:body.title,
            content:body.content
        }
    })

    return c.json({
        message:postCreation
    })
  
})

blogRouter.get('/get/:id',async(c)=>{
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
        }).$extends(withAccelerate())
    
    const id = c.req.param("id")
    try {
        const getBlogs = await prisma.post.findFirst({
            where:{
                //@ts-ignore
                id:id
            }
        })
        return c.json({
            getBlogs
        })
        
    } catch (error) {
        console.log("error",error)
        c.status(411)
        return c.json({
            "message":'Error while fetching the blog'
        })
    }
})

blogRouter.get('/bulk',async(c)=>{
    const prisma = new PrismaClient({
        datasourceUrl:c.env.DATABASE_URL,
        }).$extends(withAccelerate())
    
   
    try {
        const getBlogs = await prisma.post.findMany()
        console.log(getBlogs,"jiijj")
        return c.json({
            getBlogs
        })
        
    } catch (error) {
        console.log("error",error)
        c.status(411)
        return c.json({
            "message":'Error while fetching the blog'
        })
    }
})