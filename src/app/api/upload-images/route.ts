import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { PDFDocument } from "pdf-lib"
import { v4 as uuidv4 } from "uuid"
import { createClient } from "@/utils/supabase/server"

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

// ===== CONFIGURE S3 CLIENT =====
const s3Client = new S3Client({
  region: UseDev ? "us-east-1" : "auto",
  endpoint: UseDev ? MINIO_ENDPOINT : R2_ENDPOINT,
  forcePathStyle: UseDev,
  credentials: {
    accessKeyId: UseDev ? MINIO_ACCESS_KEY! : R2_ACCESS_KEY!,
    secretAccessKey: UseDev ? MINIO_SECRET_KEY! : R2_SECRET_KEY!,
  },
})

const PublicURL = UseDev
  ? `https://s3.mshiv.net/notes`
  : `https://data.miga.mshiv.net`

export async function POST(request: Request) {
  try {
    // Ensure user is logged in
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const images = formData.getAll('images') as File[]
    const courseId = formData.get('courseId') as string
    const professorId = formData.get('professorId') as string
    const year = formData.get('year') as string
    const batch = formData.get('batch') as string
    const semesterNumber = formData.get('semesterNumber') as string
    const isAnonymous = formData.get('isAnonymous') === 'true'

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      )
    }

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      )
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()

    // Process each image and add to PDF
    for (const imageFile of images) {
      try {
        // Convert File to ArrayBuffer
        const arrayBuffer = await imageFile.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // Determine image type and embed it
        let image
        const mimeType = imageFile.type

        if (mimeType === 'image/png') {
          image = await pdfDoc.embedPng(uint8Array)
        } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
          image = await pdfDoc.embedJpg(uint8Array)
        } else {
          // Try to embed as PNG as fallback
          console.warn(`Unsupported image type: ${mimeType}, attempting to embed as PNG`)
          image = await pdfDoc.embedPng(uint8Array)
        }

        // Get image dimensions
        const { width, height } = image.scale(1)

        // Add a new page with the image dimensions
        const page = pdfDoc.addPage([width, height])
        
        // Draw the image on the page
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        })
      } catch (error) {
        console.error(`Error processing image ${imageFile.name}:`, error)
        // Continue with other images even if one fails
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Generate unique filename for PDF
    const uniqueFileName = `${uuidv4()}.pdf`
    const contentType = 'application/pdf'

    // Upload PDF to R2/MinIO
    const command = new PutObjectCommand({
      Bucket: UseDev ? MINIO_BUCKET_NAME : R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: contentType,
      Body: Buffer.from(pdfBytes),
    })

    try {
      await s3Client.send(command)
    } catch (error) {
      console.error("Error uploading PDF to object store:", error)
      return NextResponse.json(
        { error: "Failed to upload PDF" },
        { status: 500 }
      )
    }

    const publicUrl = `${PublicURL}/${uniqueFileName}`

    // Save metadata to Supabase
    const { error: dbError } = await supabase.from("course_contentnew").insert({
      course_id: courseId,
      filetype: contentType,
      user_id: user.id,
      professor_id: professorId ? parseInt(professorId) : null,
      year: parseInt(year),
      batch: batch.toUpperCase(),
      semester_number: parseInt(semesterNumber),
      resource_url: publicUrl,
      tag_ids: null,
      title: `Images Upload - ${new Date().toLocaleDateString()}`,
      visible: false,
      anon: isAnonymous,
    })

    if (dbError) {
      console.error("Error saving to database:", dbError)
      return NextResponse.json(
        { error: "Failed to save content metadata" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      fileName: uniqueFileName,
      message: `Successfully converted ${images.length} image(s) to PDF and uploaded`,
    })
  } catch (error) {
    console.error("Error in upload-images route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

