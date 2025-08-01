import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET as string
const JWT_EXPIRES_IN = "24h" 

export async function GET(request: Request) {
  try {
    
    const url = new URL(request.url)
    const redirectParam = url.searchParams.get('redirect')
    
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      )
    }

    
    const payload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      
    }

    const customJWT = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: "your-app-name", 
      audience: "your-backend-service" 
    })

    return NextResponse.json({
      jwt: customJWT,
      userId: user.id,
      userEmail: user.email,
      redirect: redirectParam,
    })
  } catch (error) {
    console.error("Error generating chat key:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
   
    const url = new URL(request.url)
    const redirectParam = url.searchParams.get('redirect')
    
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      )
    }

    
    const payload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      
    }

    const customJWT = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: "your-app-name", 
      audience: "your-backend-service" 
    })

    return NextResponse.json({
      jwt: customJWT,
      userId: user.id,
      userEmail: user.email,
      redirect: redirectParam,
    })
  } catch (error) {
    console.error("Error generating chat key:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
