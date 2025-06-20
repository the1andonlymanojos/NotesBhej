import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET as string
const JWT_EXPIRES_IN = "24h" // or however long you want

export async function GET(request: Request) {
  try {
    // Extract redirect parameter from URL query params if needed
    const url = new URL(request.url)
    const redirectParam = url.searchParams.get('redirect')
    
    // Ensure user is logged in
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      )
    }

    // Generate your own custom JWT
    const payload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      // Add any other custom claims you want
    }

    const customJWT = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: "your-app-name", // customize this
      audience: "your-backend-service" // customize this
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
    // Extract redirect parameter from URL query params if needed
    const url = new URL(request.url)
    const redirectParam = url.searchParams.get('redirect')
    
    // Ensure user is logged in
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      )
    }

    // Generate your own custom JWT
    const payload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      // Add any other custom claims you want
    }

    const customJWT = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: "your-app-name", // customize this
      audience: "your-backend-service" // customize this
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
