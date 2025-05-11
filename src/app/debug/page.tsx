// "use client"
// import { useState } from "react"

// export default function DebugUpload() {
//   const [file, setFile] = useState<File | null>(null)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files) {
//       setFile(e.target.files[0])
//     }
//   }

//   const handleUpload = async () => {
//     if (!file) {
//       alert("Please select a file first!")
//       return
//     }

//     setLoading(true)
//     setError(null)

//     try {
//       const formData = new FormData()
//       formData.append("files", file)
//       formData.append("course_id", "1234") // Add your course ID or pass it dynamically
//       formData.append("instructor", "John Doe") // Replace with actual instructor name
//       formData.append("year", "2025") // Replace with actual year
//       formData.append("semester", "Spring") // Replace with actual semester
//       formData.append("tags", JSON.stringify(["exam", "notes"])) // Add tags as needed

//       const response = await fetch("/api/upload-to-r2", {
//         method: "POST",
//         body: formData,
//       })

//       const result = await response.json()

//       if (!response.ok) {
//         throw new Error(result.error || "Error uploading file")
//       }

//       setUploadedUrl(result.uploadedFiles[0]) // Assuming the result is an array of file URLs
//       alert("File uploaded successfully!")
//     } catch (err: any) {
//       setError(err.message || "Unknown error")
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="debug-upload">
//       <h2>Upload Debug File to R2</h2>
      
//       {error && <p className="error-text">{error}</p>}

//       <input
//         type="file"
//         onChange={handleFileChange}
//         accept=".pdf,.docx,.pptx"
//       />

//       <button
//         onClick={handleUpload}
//         disabled={loading}
//         className="upload-btn"
//       >
//         {loading ? "Uploading..." : "Upload File"}
//       </button>

//       {uploadedUrl && (
//         <div>
//           <p>Uploaded File URL: </p>
//           <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
//             {uploadedUrl}
//           </a>
//         </div>
//       )}
//     </div>
//   )
// }
