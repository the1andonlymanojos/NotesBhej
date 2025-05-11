// "use client"

// import { useState, useEffect } from "react"
// import { createClient } from "@/utils/supabase/client"

// import { Input } from "@/components/ui/input"
// import { Search, FileText, Download, Moon } from "lucide-react"
// import { ThemeToggle } from "@/components/theme-toggle"
// import { Database } from "@/types/supabase"

// type CourseContent = Database['public']['Tables']['course_content']['Row']

// export default function SleepPage() {
//   const [content, setContent] = useState<CourseContent[]>([])
//   const [search, setSearch] = useState("")
//   const [selectedTags, setSelectedTags] = useState<string[]>([])
//   const [availableTags, setAvailableTags] = useState<string[]>([])
//   const supabase = createClient()

//   useEffect(() => {
//     const fetchContent = async () => {
//       const { data } = await supabase
//         .from("course_content")
//         .select("*, course(*)")
//         .order("created_at", { ascending: false })

//       if (data) {
//         setContent(data)
//         // Extract unique tags
//         const tags = new Set<string>()
//         data.forEach((item) => {
//           item.tags.forEach((tag: string) => tags.add(tag))
//         })
//         setAvailableTags(Array.from(tags))
//       }
//     }
//     fetchContent()
//   }, [supabase])

//   const filteredContent = content.filter((item) => {
//     const matchesSearch = 
//       item.course.title.toLowerCase().includes(search.toLowerCase()) ||
//       item.course.code.toLowerCase().includes(search.toLowerCase()) ||
//       item.instructor.toLowerCase().includes(search.toLowerCase())
    
//     const matchesTags = selectedTags.length === 0 || 
//       selectedTags.every(tag => item.tags.includes(tag))

//     return matchesSearch && matchesTags
//   })

//   const toggleTag = (tag: string) => {
//     setSelectedTags(prev => 
//       prev.includes(tag) 
//         ? prev.filter(t => t !== tag)
//         : [...prev, tag]
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500">
//       <div className="absolute top-4 right-4">
//         <ThemeToggle />
//       </div>

//       <div className="max-w-7xl mx-auto px-4 py-8">
//         <div className="flex items-center gap-3 mb-8">
//           <Moon className="text-indigo-500 dark:text-indigo-300 h-8 w-8" />
//           <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
//             Browse Content
//           </h1>
//         </div>

//         <div className="mb-8">
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
//             <Input
//               placeholder="Search by course, code, or instructor..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="pl-10 border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
//             />
//           </div>

//           <div className="mt-4 flex flex-wrap gap-2">
//             {availableTags.map((tag) => (
//               <button
//                 key={tag}
//                 onClick={() => toggleTag(tag)}
//                 className={`px-3 py-1 rounded-full text-sm transition-colors ${
//                   selectedTags.includes(tag)
//                     ? "bg-indigo-500 text-white"
//                     : "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
//                 }`}
//               >
//                 {tag}
//               </button>
//             ))}
//           </div>
//         </div>

//         <div className="grid gap-6">
//           {filteredContent.map((item) => (
//             <div
//               key={item.id}
//               className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-all"
//             >
//               <div className="flex items-start justify-between">
//                 <div>
//                   <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
//                     {item.course.code} - {item.course.title}
//                   </h2>
//                   <p className="text-zinc-600 dark:text-zinc-400 mt-1">
//                     {item.year} - {item.semester} - {item.instructor}
//                   </p>
//                 </div>
//                 <a
//                   href={item.resource_url}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
//                 >
//                   <Download size={20} />
//                   <span>Download</span>
//                 </a>
//               </div>

//               <div className="flex flex-wrap gap-2 mt-4">
//                 {item.tags.map((tag: string, index: number) => (
//                   <span
//                     key={index}
//                     className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
//                   >
//                     {tag}
//                   </span>
//                 ))}
//               </div>
//             </div>
//           ))}

//           {filteredContent.length === 0 && (
//             <div className="text-center py-12">
//               <FileText className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
//               <p className="text-zinc-500 dark:text-zinc-400 text-lg">
//                 No content found matching your criteria.
//               </p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// } 
export default function SleepPage() {
  return (
    <div>Sleep</div>
  )
}