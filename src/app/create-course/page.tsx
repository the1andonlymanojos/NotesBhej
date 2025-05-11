"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, BookOpen } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function CreateCoursePage() {
  const supabase = createClient()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreateCourse = async () => {
    setLoading(true)
    // By default, Supabase insert does not return the inserted row(s) unless you chain .select() after .insert().
    // So, we need to add .select() to get the inserted row(s) back.
    const { data, error } = await supabase
      .from("course")
      .insert([{ title, code, description }])
      .select() // This will return the inserted row(s)
    console.log(data)
    console.log(error)
    if (error) {
      alert("Error creating course." + error)
      setLoading(false)
      return
    }
    setLoading(false)
    // Defensive: data could be null or empty, so check before accessing [0].id
    if (data && data.length > 0) {
      router.push(`/add-content/${data[0].id}`)
    } else {
      alert("Course created, but could not retrieve new course ID.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-xl bg-white/80 dark:bg-zinc-900/80 shadow-2xl rounded-3xl p-8 mt-12 mb-8 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="text-indigo-500 dark:text-indigo-300" size={32} />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
            Create New Course
          </h1>
        </div>
        <p className="mb-6 text-zinc-600 dark:text-zinc-300 text-lg">
          <span className="font-semibold">Step 1:</span> Fill in the details below to create your course.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Course Title
            </label>
            <Input
              placeholder="e.g., Introduction to Computer Science"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Course Code
            </label>
            <Input
              placeholder="e.g., CS101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Description
            </label>
            <Input
              placeholder="Brief description of your course..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
        </div>

        <Button
          onClick={handleCreateCourse}
          disabled={loading}
          className="w-full mt-8 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-400 dark:from-indigo-700 dark:via-fuchsia-700 dark:to-sky-700 text-white font-semibold shadow-lg hover:scale-[1.02] hover:shadow-2xl transition-all duration-200"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Sparkles className="animate-pulse" size={20} />
              Creating Course...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              Create Course
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}
