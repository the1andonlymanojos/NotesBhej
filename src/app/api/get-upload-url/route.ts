import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"
import { createClient } from "@/utils/supabase/server"
import mime from "mime-types";
const UseDev = process.env.UseDev === "true"

// ===== MINIO CONFIG =====
const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT

// ===== R2 CONFIG =====
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY = process.env.R2_ACESS_KEY_ID
const R2_SECRET_KEY = process.env.R2_SECRET_KEY
const R2_ENDPOINT = R2_ACCOUNT_ID
  ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : undefined

// ===== VALIDATION =====
if (UseDev) {
  if (!MINIO_BUCKET_NAME || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY || !MINIO_ENDPOINT) {
    throw new Error("Missing required MinIO environment variables")
  }
} else {
  if (!R2_BUCKET_NAME || !R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    throw new Error("Missing required R2 environment variables")
  }
}

// ===== CONFIGURE S3 CLIENT =====
const s3Client = new S3Client({
  region: UseDev ? "us-east-1" : "auto", // MinIO needs dummy region
  endpoint: UseDev ? MINIO_ENDPOINT : R2_ENDPOINT,
  forcePathStyle: UseDev, // required for MinIO; not needed for R2
  credentials: {
    accessKeyId: UseDev ? MINIO_ACCESS_KEY! : R2_ACCESS_KEY!,
    secretAccessKey: UseDev ? MINIO_SECRET_KEY! : R2_SECRET_KEY!,
  },
})
const PublicURL = UseDev
  ? `https://s3.mshiv.net/notes` // this should match MINIO_ENDPOINT's public domain
  : `https://data.miga.mshiv.net`


export async function POST(request: Request) {
  try {
    // Extract redirect parameter from URL query params
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

    const { fileName, fileTypee } = await request.json()
    let fileType = fileTypee;
    console.log("fileName",fileName)

    if (!fileName) {
      return NextResponse.json({ error: "File name and type are required" }, { status: 400 })
    }
    const extension = fileName.split('.').pop()

    let uniqueFileName = `${uuidv4()}`
    if(!fileType){

    uniqueFileName = `${uuidv4()}.${extension}`
    fileType = mime.lookup(fileName) || "application/octet-stream";
    }
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: fileType
    })

    let signedUrl = ""
    try{
     signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // URL expires in 1 hour

    }
    catch(error){
      console.error("Error generating signed URL:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
    
   console.log(signedUrl)
    const publicUrl = `${PublicURL}/${uniqueFileName}`
    return NextResponse.json({
      signedUrl,
      fileName: uniqueFileName,
      publicUrl,
      isR2Url: !UseDev, // R2 in prod; MinIO in dev — callers use this to set r2_url
      redirect: redirectParam, // Include redirect parameter in response
      userId: user.id // Include user ID for reference
    })
  } catch (error) {
    console.error("Error generating signed URL:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 