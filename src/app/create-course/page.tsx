"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, BookOpen, ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LoginPopup } from "@/components/loginpopup"
import { apiCreateCourse, apiGetMe } from "@/lib/api/client"
import type { ApiUser } from "@/lib/api/types"

function CreateCourseForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<ApiUser | null>(null)
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // Validation check
  const isFormValid = title.trim() !== "" && description.trim() !== ""

  // Pre-fill title from URL query parameter
  useEffect(() => {
    const nameParam = searchParams.get('name')
    if (nameParam) {
      setTitle(decodeURIComponent(nameParam))
    }
  }, [searchParams])

  useEffect(() => {
    const getUser = async () => {
      try {
        const me = await apiGetMe()
        setUser(me)
      } catch {
        setShowLoginPopup(true)
      }
      setAuthLoading(false)
    }
    getUser()
  }, [])

  const handleCancelLogin = () => {
    setShowLoginPopup(false)
    router.back()
  }

  const handleCreateCourse = async () => {
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
    try {
      const createdCourse = await apiCreateCourse({
        title: title.trim(),
        code: "NA",
        abbreviation: description.trim(),
      })
      const id = createdCourse?.id
      if (typeof id === "number") {
        router.push(`/add-content/${id}`)
        return
      }
      alert("Course created, but could not retrieve new course ID.")
    } catch (error) {
      alert(`Error creating course. ${error instanceof Error ? error.message : "Please try again."}`)
    } finally {
      setLoading(false)
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
    <div className="min-h-screen flex flex-col items-center justify-center transition-colors duration-500">
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
          {searchParams.get('name') && (
            <span className="block mt-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              💡 Course title pre-filled from your search
            </span>
          )}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Course Title (full name please) <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder={searchParams.get('name') ? "Title pre-filled from search" : "e.g., Software Engineering"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

export default function CreateCoursePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500">
        <div className="flex items-center gap-3">
          <Sparkles className="animate-pulse text-indigo-500" size={24} />
          <p className="text-lg text-zinc-600 dark:text-zinc-300">Loading...</p>
        </div>
      </div>
    }>
      <CreateCourseForm />
    </Suspense>
  )
}
