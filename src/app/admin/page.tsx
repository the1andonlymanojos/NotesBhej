// // app/admin/page.tsx
// "use client"
// import { useState, useEffect } from "react"
// import { createClient } from "@/utils/supabase/client"
// import { Database } from '@/types/supabase' // adjust path as needed

// type Note = Database['public']['Tables']['course']['Row'];


// const supabase = createClient()

// export default function AdminPage() {
//   const [classes, setClasses] = useState<any[]>([])

//   const fetchClasses = async () => {
//     const { data, error } = await supabase.from("notes").select("*");
//     console.log(data)
//     if (!error) setClasses(data || [])
//   }

//   useEffect(() => {
//     fetchClasses()
//   }, [])

//   return (
//     <div className="p-8">
//       <h1 className="text-2xl font-bold mb-4">Admin Page</h1>
//       <ClassForm onCreated={fetchClasses} />
//       <hr className="my-6" />
//       <div className="space-y-4">
//         {classes.map(cls => (
//           <ClassCard key={cls.id} cls={cls} onResourceAdded={fetchClasses} />
//         ))}
//       </div>
//     </div>
//   )
// }

// function ClassForm({ onCreated }: { onCreated: () => void }) {
//   const [form, setForm] = useState({ title: "", semester: "", year: "", professor_name: "" })

//   const handleSubmit = async (e: any) => {
//     e.preventDefault()
//     const { error } = await supabase.from("classes").insert(form)
//     if (!error) {
//       setForm({ title: "", semester: "", year: "", professor_name: "" })
//       onCreated()
//     }
//   }

//   return (
//     <form onSubmit={handleSubmit} className="space-y-2">
//       <input type="text" placeholder="Title" className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
//       <input type="text" placeholder="Semester" className="input" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} required />
//       <input type="number" placeholder="Year" className="input" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required />
//       <input type="text" placeholder="Professor Name" className="input" value={form.professor_name} onChange={e => setForm(f => ({ ...f, professor_name: e.target.value }))} />
//       <button type="submit" className="btn">Create Class</button>
//     </form>
//   )
// }

// function ClassCard({ cls, onResourceAdded }: { cls: any, onResourceAdded: () => void }) {
//   return (
//     <div className="border p-4 rounded">
//       <h2 className="font-semibold text-lg">{cls.title} ({cls.semester} {cls.year})</h2>
//       <p className="text-sm text-gray-600">Professor: {cls.professor_name}</p>
//       <ResourceForm classId={cls.id} onAdded={onResourceAdded} />
//       <ResourceList resources={cls.resources} />
//     </div>
//   )
// }

// function ResourceForm({ classId, onAdded }: { classId: string, onAdded: () => void }) {
//   const [form, setForm] = useState({ title: "", description: "", file_path: "" })

//   const handleSubmit = async (e: any) => {
//     e.preventDefault()
//     const { error } = await supabase.from("resources").insert({ ...form, class_id: classId })
//     if (!error) {
//       setForm({ title: "", description: "", file_path: "" })
//       onAdded()
//     }
//   }

//   return (
//     <form onSubmit={handleSubmit} className="mt-4 space-y-2">
//       <input type="text" placeholder="Resource Title" className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
//       <input type="text" placeholder="Description" className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
//       <input type="text" placeholder="Local File Path" className="input" value={form.file_path} onChange={e => setForm(f => ({ ...f, file_path: e.target.value }))} required />
//       <button type="submit" className="btn">Add Resource</button>
//     </form>
//   )
// }

// function ResourceList({ resources }: { resources: any[] }) {
//   if (!resources || resources.length === 0) return <p className="text-sm text-gray-500 mt-2">No resources yet.</p>

//   return (
//     <ul className="mt-2 list-disc ml-6 text-sm">
//       {resources.map(res => (
//         <li key={res.id}>
//           <strong>{res.title}</strong> - {res.description || "No description"} <code>({res.file_path})</code>
//         </li>
//       ))}
//     </ul>
//   )
// }

// // Add some basic Tailwind classes for input & button
// // .input => border px-3 py-2 rounded w-full
// // .btn => bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700

export default function AdminPage() {
  return (
    <div>
      <h1>Admin Page</h1>
    </div>
  )
}