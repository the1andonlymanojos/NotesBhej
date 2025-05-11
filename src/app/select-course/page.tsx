// File: app/(course)/select-course/page.tsx
"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function SelectCoursePage() {
  const supabase = createClient()
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase.from("course").select("*")
      setCourses(data || [])
    }
    fetchCourses()
  }, [])

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-xl bg-white/80 dark:bg-zinc-900/80 shadow-2xl rounded-3xl p-8 mt-12 mb-8 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="text-indigo-500 dark:text-indigo-300 animate-pulse" size={32} />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
            Select a Course
          </h1>
        </div>
        <p className="mb-6 text-zinc-600 dark:text-zinc-300 text-lg">
          <span className="font-semibold">Step 1:</span> Find your course below or search by title.
        </p>
        <Input
          placeholder="🔍 Search by course title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-6 border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
        />

        <div className="grid gap-4">
          {filteredCourses.length === 0 ? (
            <div className="text-center text-zinc-400 dark:text-zinc-500 py-8">
              <span className="text-2xl">😕</span>
              <div className="mt-2">No courses found.</div>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <Button
                key={course.id}
                className="justify-start text-left px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-400 dark:from-indigo-700 dark:via-fuchsia-700 dark:to-sky-700 text-white font-semibold shadow-lg hover:scale-[1.025] hover:shadow-2xl transition-all duration-200"
                onClick={() => router.push(`/add-content/${course.id}`)}
              >
                <span className="text-lg font-bold mr-2">{course.code}</span>
                <span className="text-base">{course.title}</span>
              </Button>
            ))
          )}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/create-course"
            className="inline-block text-indigo-600 dark:text-indigo-300 font-medium underline underline-offset-4 hover:text-fuchsia-500 dark:hover:text-fuchsia-400 transition"
          >
            <span className="mr-1">Don't see your class?</span>
            <span className="font-bold">Create a new one &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
