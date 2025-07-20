"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { FileText, Calendar, User, ArrowLeft, Plus, Search, Filter, Lock, AlertTriangle, Coffee, Heart } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import PDFViewer from "@/components/pdf-viewer"
import { Database } from "@/types/supabase"
import Chatbox from "@/components/chatbox"

type CourseNew = Database["public"]["Tables"]["coursenew"]["Row"]
type Course_Contentnew = Database["public"]["Tables"]["course_contentnew"]["Row"]
type Professor = Database["public"]["Tables"]["professorsnew"]["Row"]
type Tag = Database["public"]["Tables"]["tags"]["Row"]
type Course_content_anon = Database["public"]["Views"]["course_contentnew_safe"]["Row"]
type Course_content_user = Database["public"]["Views"]["course_contentnew_user"]["Row"]
type pinnedShit = Database['public']['Tables']['user_pinned_courses']['Row']
type logbook = Database['public']['Tables']['user_course_interaction']['Row']

// Enhanced content type with resolved professor and tags
type EnhancedContent = (Course_content_anon | Course_content_user) & {
  professor_name?: string
  tag_names?: string[]
  semester_display?: string
}

export default function CourseViewPage({
  params,
}: {
  params: Promise<{ "course-id": string }>
}) {
  const router = useRouter()
  const courseId = use(params)["course-id"]
  const [course, setCourse] = useState<CourseNew | null>(null)
  const [content, setContent] = useState<(Course_content_anon | Course_content_user)[]>([])
  const [enhancedContent, setEnhancedContent] = useState<EnhancedContent[]>([])
  const [professors, setProfessors] = useState<Professor[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [search, setSearch] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"year" | "professor_name">("year")
  const [showViewer, setShowViewer] = useState(false)
  const [selectedContent, setSelectedContent] = useState<EnhancedContent | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [useNativeViewer, setUseNativeViewer] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('useNativeViewer')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [isPinned, setIsPinned] = useState(false)
  const supabase = createClient()

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Persist viewer preference
  useEffect(() => {
    localStorage.setItem('useNativeViewer', JSON.stringify(useNativeViewer))
  }, [useNativeViewer])

  // Helper function to get semester display name
  const getSemesterDisplay = (semesterNumber: number) => {
    const semesters = ['', 'Spring', 'Summer', 'Fall']
    return semesters[semesterNumber] || `Semester ${semesterNumber}`
  }

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        const isAuthenticated = !!user

        // Fetch course data
        const { data: courseData } = await supabase
          .from("coursenew")
          .select("*")
          .eq("id", courseId)
          .single()

        // Fetch content data based on authentication status
        const { data: contentData } = await supabase
          .from(isAuthenticated ? "course_contentnew_user" : "course_contentnew_safe")
          .select("*")
          .eq("course_id", courseId)
          .order("year", { ascending: true })

        // Fetch all professors
        const { data: professorsData } = await supabase
          .from("professorsnew")
          .select("*")

        // Fetch all tags
        const { data: tagsData } = await supabase
          .from("tags")
          .select("*")

        setCourse(courseData)
        setContent(contentData || [])
        setProfessors(professorsData || [])
        setTags(tagsData || [])

        // Create enhanced content with resolved professor names and tags
        if (contentData && professorsData && tagsData) {
          const enhanced = contentData.map(item => {
            const professor = professorsData.find(p => p.id === item.professor_id)
            const itemTags = item.tag_ids ? 
              tagsData.filter((tag: Tag) => item.tag_ids!.includes(tag.id)).map(tag => tag.name) : 
              []
            
            return {
              ...item,
              professor_name: professor?.name,
              tag_names: itemTags,
              semester_display: getSemesterDisplay(item.semester_number)
            }
          })
          setEnhancedContent(enhanced)
          
          // Extract unique tag names for filtering
          const uniqueTags = new Set<string>()
          enhanced.forEach(item => {
            item.tag_names?.forEach((tag: string) => uniqueTags.add(tag))
          })
          setAvailableTags(Array.from(uniqueTags))
        }
      } catch (error) {
        console.error("Error fetching course data:", error)
      }
    }

    fetchCourseData()
  }, [courseId, supabase])

  // Check if course is pinned
  useEffect(() => {
    const checkPinnedStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: pinnedData } = await supabase
          .from("user_pinned_courses")
          .select("*")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .single()

        setIsPinned(!!pinnedData)
      } catch (error) {
        // Not pinned or error, keep as false
        setIsPinned(false)
      }
    }

    checkPinnedStatus()
  }, [courseId, supabase])

  // Toggle pin status
  const togglePin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setShowLoginDialog(true)
        return
      }

      if (isPinned) {
        // Remove pin
        await supabase
          .from("user_pinned_courses")
          .delete()
          .eq("user_id", user.id)
          .eq("course_id", courseId)
        setIsPinned(false)
      } else {
        // Add pin
        await supabase
          .from("user_pinned_courses")
          .insert({
            user_id: user.id,
            course_id: courseId
          })
        setIsPinned(true)
      }
    } catch (error) {
      console.error("Error toggling pin:", error)
    }
  }

  // Sort enhanced content when sortBy changes
  useEffect(() => {
    if (enhancedContent.length > 0) {
      const sorted = [...enhancedContent].sort((a, b) => {
        if (sortBy === "year") {
          const aYear = a.year || 0
          const bYear = b.year || 0
          return aYear - bYear
        } else { // professor_name
          const aName = a.professor_name || 'Unknown'
          const bName = b.professor_name || 'Unknown'
          return aName.localeCompare(bName)
        }
      })
      setEnhancedContent(sorted)
    }
  }, [sortBy])

  if (!course) return null

  const filteredContent = enhancedContent.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.professor_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.semester_display?.toLowerCase().includes(search.toLowerCase()) ||
      item.batch?.toLowerCase().includes(search.toLowerCase())

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => item.tag_names?.includes(tag))

    return matchesSearch && matchesTags
  })

  // Group content by year, semester, batch, and professor
  const groupedContent = filteredContent.reduce((groups, item) => {
    const key = `${item.year}*${item.semester_display}*${item.batch}*${item.professor_name || 'Unknown'}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, EnhancedContent[]>)

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleContentClick = (item: EnhancedContent) => {
    if (!item.resource_url) {
      setShowLoginDialog(true)
      return
    }
    
    if (isMobile || useNativeViewer) {
      window.open(item.resource_url, '_blank')
    } else {
      setSelectedContent(item)
      setSelectedFileId(item.id)
      setShowViewer(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4 sm:p-6">
      <div className="fixed top-4 right-4 z-10 flex items-center gap-2">
        {!isMobile && (
          <Button
            variant="ghost"
            onClick={() => setUseNativeViewer(!useNativeViewer)}
            className="hover:bg-white/50 dark:hover:bg-zinc-800/50 text-sm"
          >
            {useNativeViewer ? "Use In-App Viewer" : "Use Browser Viewer"}
          </Button>
        )}
        <ThemeToggle />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            className="hover:bg-white/50 dark:hover:bg-zinc-800/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            onClick={togglePin}
            variant="ghost"
            className={`hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors ${
              isPinned 
                ? "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
            }`}
          >
            <Heart className={`h-5 w-5 transition-all ${isPinned ? "fill-current" : ""}`} />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {course.code} - {course.title}
            </h1>
            {course.abbreviation && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {course.abbreviation}
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
                onChange={(e) => setSortBy(e.target.value as "year" | "professor_name")}
                className="bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 transition"
              >
                <option value="year">Year</option>
                <option value="professor_name">Instructor</option>
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
                  onClick={() => handleContentClick(item)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {item.title || "Untitled Resource"}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span>{item.year} - {item.semester_display} ({item.batch})</span>
                      {item.professor_name && (
                        <>
                          <User className="h-4 w-4 ml-2" />
                          <span>{item.professor_name}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 mt-2">
                      {item.tag_names?.map((tag: string, index: number) => (
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
            (Object.entries(groupedContent) as [string, EnhancedContent[]][]).map(([key, items]) => {
              const [year, semester, batch, instructor] = key.split('*')
              return (
                <div
                  key={key}
                  className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {year} - {semester} ({batch})
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
                      {items.map((item: EnhancedContent) => (
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
                              {item.tag_names?.map((tag: string, index: number) => (
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
                  .filter(item => item.title && item.resource_url && item.year && item.semester_display && item.id)
                  .map(item => ({
                    id: item.id!.toString(),
                    title: item.title!,
                    resource_url: item.resource_url!,
                    year: item.year!,
                    semester: item.semester_display!,
                    instructor: item.professor_name || undefined
                  }))} 
                onClose={() => setShowViewer(false)}
                initialFileId={selectedFileId?.toString() || null}
              />
            </div>
          </div>
        )}

        {/* Add Content Button */}
        <div className="fixed bottom-6 right-6 flex items-center justify-center gap-4">
          <Button
            onClick={() => router.push(`/add-content/${courseId}`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-md sm:px-4 sm:py-2 flex items-center justify-center"
          >
            <Plus className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Add Content</span>
          </Button>
          <div>
            <Chatbox courseCode={course.code}/>
          </div>
        </div>

        {/* Sassy Login Dialog */}
        <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Hold Up There, Partner! 🤠
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="space-y-2">
                    <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                      Y'all keep uploading copyrighted stuff, so I need to ensure you're a student else I'll get DMCA'd.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
                variant="outline" 
                onClick={() => setShowLoginDialog(false)}
                className="flex-1"
              >
                Maybe Later 
              </Button>
              <Button 
                onClick={() => {
                  setShowLoginDialog(false)
                  router.push('/login')
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
              >
                Fine, I'll Login 
              </Button>
              
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
} 