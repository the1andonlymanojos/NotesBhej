// import { NextResponse } from "next/server"
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
// import { Readable } from "stream"
// import { v4 as uuidv4 } from "uuid"
// import { log } from "console"

// const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
// const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
// const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY
// const R2_SECRET_KEY = process.env.R2_SECRET_KEY

// if (!R2_BUCKET_NAME || !R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
//   console.log(R2_BUCKET_NAME, R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY)
//   throw new Error("Missing required R2 environment variables")
  
// }

// const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

// // Initialize R2 Client
// // const s3Client = new S3Client({
// //   region: "auto",
// //   credentials: {
// //     accessKeyId: R2_ACCESS_KEY,
// //     secretAccessKey: R2_SECRET_KEY,
// //   },
// //   endpoint: R2_ENDPOINT,
// // })
// const s3Client = new S3Client({
//     region: "auto",
//     credentials: {
//         accessKeyId: R2_ACCESS_KEY,
//         secretAccessKey: R2_SECRET_KEY,
//     },
//     endpoint: R2_ENDPOINT,
// })

// async function uploadFileToR2(file: File) {
//   const arrayBuffer = await file.arrayBuffer()
//   const buffer = Buffer.from(arrayBuffer)
//   const fileName = `${uuidv4()}-${file.name}`

//   const command = new PutObjectCommand({
//     Bucket: R2_BUCKET_NAME,
//     Key: fileName,
//     Body: buffer,
//     ContentType: file.type,
//   })

//   const data = await s3Client.send(command)
//   return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${fileName}`
// }

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData()
//     const files = formData.getAll('files') as File[]
//     const course_id = formData.get('course_id')
//     const instructor = formData.get('instructor')
//     const year = formData.get('year')
//     const semester = formData.get('semester')
//     const tags = formData.get('tags')

//     if (!files.length) {
//       return NextResponse.json({ error: "No files provided" }, { status: 400 })
//     }

//     const uploadedFiles = await Promise.all(
//       files.map(async (file) => {
//         const fileUrl = await uploadFileToR2(file)
//         return fileUrl
//       })
//     )

//     return NextResponse.json({
//       uploadedFiles,
//       course_id,
//       instructor,
//       year,
//       semester,
//       tags
//     })
//   } catch (error) {
//     console.error("Error uploading files:", error)
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 })
//   }
// }

import { NextResponse } from "next/server"

export const GET = async () => {
  return NextResponse.json({ message: "Hello, world!" })
}