import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createClient } from "@/utils/supabase/server"

// ===== CONFIG =====
const UseDev = process.env.UseDev === "true"
const BUCKET_NAME = UseDev ? process.env.MINIO_BUCKET_NAME : process.env.R2_BUCKET_NAME
const ENDPOINT = UseDev
  ? process.env.MINIO_ENDPOINT
  : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
const s3Client = new S3Client({
  region: UseDev ? "us-east-1" : "auto",
  endpoint: ENDPOINT,
  forcePathStyle: UseDev,
  credentials: {
    accessKeyId: UseDev ? process.env.MINIO_ACCESS_KEY! : process.env.R2_ACESS_KEY_ID!,
    secretAccessKey: UseDev ? process.env.MINIO_SECRET_KEY! : process.env.R2_SECRET_KEY!,
  },
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { fileKey, fileType } = await request.json()
    if (!fileKey || !fileType) {
      return NextResponse.json({ error: "Missing file key or type" }, { status: 400 })
    }

    // Generate a signed PUT URL to overwrite the file (same key → new version)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({
      signedUrl,
      fileKey,
      message: "Use this signed URL to upload and update the file."
    })
  } catch (error) {
    console.error("Failed to generate update URL:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
