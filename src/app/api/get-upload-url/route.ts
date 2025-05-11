import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY = process.env.R2_ACESS_KEY_ID
const R2_SECRET_KEY = process.env.R2_SECRET_KEY

if (!R2_BUCKET_NAME || !R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
  throw new Error("Missing required R2 environment variables")
}
const PublicURL  = `https://pub-1354f5107a514c08865382b79b7ad90c.r2.dev`

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

const s3Client = new S3Client({
  region: "auto",
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
  endpoint: R2_ENDPOINT,
})

//const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  try {
    const { fileName, fileType } = await request.json()

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "File name and type are required" }, { status: 400 })
    }
    const formattedFileName = fileName.replace(/ /g, "_")
    const uniqueFileName = `${uuidv4()}-${formattedFileName}`
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueFileName
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
    return NextResponse.json({
      signedUrl,
      fileName: uniqueFileName,
      publicUrl: `${PublicURL}/${uniqueFileName}`
    })
  } catch (error) {
    console.error("Error generating signed URL:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 