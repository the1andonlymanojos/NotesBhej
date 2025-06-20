"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, BookOpen, ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LoginPopup } from "@/components/loginpopup"
import { User } from "@supabase/supabase-js"

export default function CreateCoursePage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // Validation check
  const isFormValid = title.trim() !== "" && code.trim() !== "" && description.trim() !== ""

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        setShowLoginPopup(true)
      }
      setAuthLoading(false)
    }
    getUser()
  }, [supabase, router])

  const handleCancelLogin = () => {
    setShowLoginPopup(false)
    router.back()
  }

  const handleCreateCourse = async () => {
    console.log("randomly printing user email because i cant have unused variables", user?.email)
    if (!user) {
      setShowLoginPopup(true)
      return
    }
    // Double-check validation before submitting
    if (!isFormValid) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)
    // By default, Supabase insert does not return the inserted row(s) unless you chain .select() after .insert().
    // So, we need to add .select() to get the inserted row(s) back.
    const { data, error } = await supabase
      .from("course")
      .insert([{ title: title.trim(), code: code.trim(), description: description.trim() }])
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500">
      <LoginPopup
        open={showLoginPopup}
        onOpenChange={setShowLoginPopup}
        title="Login Required"
        description="You need to be logged in to create a new course."
        onCancel={handleCancelLogin}
      />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-xl bg-white/80 dark:bg-zinc-900/80 shadow-2xl rounded-3xl p-8 mt-12 mb-8 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="text-indigo-500 dark:text-indigo-300" size={32} />
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
              Create New Course
            </h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft />
          </Button>
        </div>
        <p className="mb-6 text-zinc-600 dark:text-zinc-300 text-lg">
          <span className="font-semibold">Step 1:</span> Fill in the details below to create your course.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Course Title (full name please) <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Software Engineering"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Course Code (What it says in the course of study) <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., ITIT-3103"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Abbreviation <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="eg. SE"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
        </div>

        {!isFormValid && (
          <p className="text-red-500 text-sm mt-4">
            * All fields are required
          </p>
        )}

        <Button
          onClick={handleCreateCourse}
          disabled={loading || !isFormValid}
          className="w-full mt-8 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-400 dark:from-indigo-700 dark:via-fuchsia-700 dark:to-sky-700 text-white font-semibold shadow-lg hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
