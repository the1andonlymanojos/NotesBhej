"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Calendar, User, ArrowLeft, Plus, Search, Filter } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import PDFViewer from "@/components/pdf-viewer"
import { Skeleton } from "@/components/ui/skeleton"
import { Database } from "@/types/supabase"

type CourseContent = Database["public"]["Tables"]["course_content"]["Row"]

type Course = Database["public"]["Tables"]["course"]["Row"]

function CourseSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4 sm:p-6">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            className="hover:bg-white/50 dark:hover:bg-zinc-800/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Loading Course...
            </h1>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              placeholder="Search content..."
              className="pl-10 border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
              disabled
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Sort by:</span>
              <select
                className="bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 transition"
                disabled
              >
                <option>Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Grid Skeleton */}
        <div className="space-y-6">
          {[1, 2].map((group) => (
            <div
              key={group}
              className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-500" />
                <Skeleton className="h-6 w-32" />
              </div>

              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-2 min-w-min">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="flex flex-col w-64 flex-shrink-0 p-3 bg-white/50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
                    >
                      <Skeleton className="h-5 w-48 mb-2" />
                      <div className="flex flex-wrap gap-2">
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CourseViewPage({
  params,
}: {
  params: Promise<{ "course-id": string }>
}) {
  const router = useRouter()
  const courseId = use(params)["course-id"]
  const [course, setCourse] = useState<Course | null>(null)
  const [content, setContent] = useState<CourseContent[]>([])
  const [search, setSearch] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"year" | "instructor">("year")
  const [showViewer, setShowViewer] = useState(false)
  const [selectedContent, setSelectedContent] = useState<CourseContent | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()
console.log(selectedContent)
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const fetchCourseData = async () => {
      setIsLoading(true)
      try {
        const { data: courseData } = await supabase
          .from("course")
          .select("*")
          .eq("id", courseId)
          .single()

        const { data: contentData } = await supabase
          .from("course_content")
          .select("*")
          .eq("course_id", courseId)
          .order(sortBy, { ascending: true })

        setCourse(courseData)
        setContent(contentData || [])
        // Extract unique tags
        const tags = new Set<string>()
        contentData?.forEach(item => {
          item.tags?.forEach((tag: string) => tags.add(tag))
        })
        setAvailableTags(Array.from(tags))
      } catch (error) {
        console.error("Error fetching course data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourseData()
  }, [courseId, sortBy, supabase])

  if (isLoading) {
    return <CourseSkeleton />
  }

  if (!course) return null

  const filteredContent = content.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.instructor?.toLowerCase().includes(search.toLowerCase()) ||
      item.semester?.toLowerCase().includes(search.toLowerCase())

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => item.tags?.includes(tag))

    return matchesSearch && matchesTags
  })

  // Group content by year, semester, and instructor
  const groupedContent = filteredContent.reduce((groups, item) => {
    const key = `${item.year}*${item.semester}*${item.instructor || 'Unknown'}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, CourseContent[]>)

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleContentClick = (item: CourseContent) => {
    if (isMobile && item.resource_url) {
      window.open(item.resource_url, '_blank')
    } else {
      setSelectedContent(item)
      setSelectedFileId(item.id)
      setShowViewer(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4 sm:p-6">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="hover:bg-white/50 dark:hover:bg-zinc-800/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {course.code} - {course.title}
            </h1>
            {course.description && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "year" | "instructor")}
                className="bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 transition"
              >
                <option value="year">Year</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded-full text-xs transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-indigo-500 text-white"
                      : "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="space-y-6">
          {search ? (
            // Flat list view when searching
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContent.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col p-3 bg-white/50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    setSelectedContent(item)
                    setSelectedFileId(item.id)
                    setShowViewer(true)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {item.title || "Untitled Resource"}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span>{item.year} - {item.semester}</span>
                      {item.instructor && (
                        <>
                          <User className="h-4 w-4 ml-2" />
                          <span>{item.instructor}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 mt-2">
                      {item.tags?.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      <FileText className="h-5 w-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Grouped view when not searching
            (Object.entries(groupedContent) as [string, CourseContent[]][]).map(([key, items]) => {
              const [year, semester, instructor] = key.split('*')
              return (
                <div
                  key={key}
                  className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {year} - {semester}
                      </h3>
                      {instructor && instructor !== 'Unknown' && (
                        <div className="flex items-center gap-2 ml-2">
                          <User className="h-4 w-4 text-zinc-500" />
                          <span className="text-zinc-600 dark:text-zinc-400">{instructor}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isMobile) {
                          // Open all PDFs in new tabs
                          items.forEach(item => {
                            if (item.resource_url) {
                              window.open(item.resource_url, '_blank')
                            }
                          })
                        } else {
                          // Show all PDFs in viewer
                          setSelectedContent(items[0])
                          setSelectedFileId(items[0].id)
                          setShowViewer(true)
                        }
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      View All
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="flex gap-4 pb-2 min-w-min">
                      {items.map((item: CourseContent) => (
                        <div
                          key={item.id}
                          className="group flex flex-col w-64 flex-shrink-0 p-3 bg-white/50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 cursor-pointer"
                          onClick={() => handleContentClick(item)}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {item.title || "Untitled Resource"}
                            </h4>
                            <div className="flex flex-wrap justify-between gap-2 mt-2">
                              {item.tags?.map((tag: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              <FileText className="h-5 w-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {filteredContent.length === 0 && (
            <div className="text-center py-12 bg-white/30 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <FileText className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                No content found matching your criteria.
              </p>
              <Button 
                className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white"
                onClick={() => {
                  setSearch('');
                  setSelectedTags([]);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* PDF Viewer Modal */}
        {showViewer && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="absolute inset-4">
              <PDFViewer 
                files={filteredContent
                  .filter(item => item.title && item.resource_url && item.year && item.semester)
                  .map(item => ({
                    id: item.id,
                    title: item.title!,
                    resource_url: item.resource_url!,
                    year: item.year!,
                    semester: item.semester!,
                    instructor: item.instructor || undefined
                  }))} 
                onClose={() => setShowViewer(false)}
                initialFileId={selectedFileId}
              />
            </div>
          </div>
        )}

        {/* Add Content Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => router.push(`/add-content/${courseId}`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-md sm:px-4 sm:py-2 flex items-center justify-center"
          >
            <Plus className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Add Content</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 