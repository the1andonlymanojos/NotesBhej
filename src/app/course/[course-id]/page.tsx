"use client"

import { useState, useEffect, use, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { FileText, Calendar, User, ArrowLeft, Plus, Search, Filter, AlertTriangle, Heart, EyeOff, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import PDFViewer from "@/components/pdf-viewer"
import { Database } from "@/types/supabase"
import Chatbox from "@/components/chatbox"

type CourseNew = Database["public"]["Tables"]["coursenew"]["Row"]
//type Course_Contentnew = Database["public"]["Tables"]["course_contentnew"]["Row"]
type Professor = Database["public"]["Tables"]["professorsnew"]["Row"]
type Tag = Database["public"]["Tables"]["tags"]["Row"]
type Course_content_anon = Database["public"]["Views"]["course_contentnew_safe"]["Row"]
type Course_content_user = Database["public"]["Views"]["course_contentnew_user"]["Row"]
//type pinnedShit = Database['public']['Tables']['user_pinned_courses']['Row']
//type logbook = Database['public']['Tables']['user_course_interaction']['Row']

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
      console.log(content)
      const saved = localStorage.getItem('useNativeViewer')
      return saved ? JSON.parse(saved) : false
    }
    return false
  })
  const [isPinned, setIsPinned] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [recentlyViewed, setRecentlyViewed] = useState<EnhancedContent[]>([])
  const [showRecentlyViewed, setShowRecentlyViewed] = useState(false)
  const supabase = createClient()

  // Debouncing refs for interaction logging
  const logTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const loggedInteractions = useRef<Set<string>>(new Set())

  // Debounced logging function to prevent excessive interaction logs
  const logUserInteraction = useCallback(async (
    interactionType: string, 
    contentId?: number,
    debounceMs: number = 5000 // 5 second debounce by default
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create a unique key for this interaction
      const interactionKey = `${user.id}-${courseId}-${contentId || 'course'}-${interactionType}`
      
      // Clear existing timeout for this interaction
      const existingTimeout = logTimeouts.current.get(interactionKey)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Set new timeout for debounced logging
      const timeoutId = setTimeout(async () => {
        console.log("Logging interaction:", selectedContent)
        // Check if we've already logged this exact interaction recently
        if (loggedInteractions.current.has(interactionKey)) {
          return
        }

        try {
          await supabase
            .from("user_course_interaction")
            .insert({
              user_id: user.id,
              course_id: courseId,
              content_id: contentId || null,
              interaction_type: interactionType
            })

          // Mark this interaction as logged
          loggedInteractions.current.add(interactionKey)
          
          // Clean up the logged interaction after some time to allow future logging
          setTimeout(() => {
            loggedInteractions.current.delete(interactionKey)
          }, 30000) // Clean up after 30 seconds

        } catch (error) {
          console.error("Error logging user interaction:", error)
        } finally {
          // Clean up timeout reference
          logTimeouts.current.delete(interactionKey)
        }
      }, debounceMs)

      // Store the timeout reference
      logTimeouts.current.set(interactionKey, timeoutId)

    } catch (error) {
      console.error("Error in logUserInteraction:", error)
    }
  }, [courseId, supabase])

  // Fetch recently viewed content for authenticated user
  const fetchRecentlyViewed = useCallback(async () => {
    if (!currentUserId) {
      setRecentlyViewed([])
      return
    }

    try {
      // Get recent content interactions for this user in the current course
      const { data: recentInteractions } = await supabase
        .from("user_course_interaction")
        .select("content_id, created_at")
        .eq("user_id", currentUserId)
        .eq("course_id", courseId)
        .eq("interaction_type", "view")
        .not("content_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(5)

      if (recentInteractions) {
        // Get unique content IDs to avoid duplicates
        const seenContentIds = new Set()
        const uniqueContentIds = recentInteractions
          .map(interaction => interaction.content_id)
          .filter(contentId => {
            if (seenContentIds.has(contentId)) {
              return false
            }
            seenContentIds.add(contentId)
            return true
          })
          .slice(0, 10)

        // Get content details for these IDs
        const { data: contentData } = await supabase
          .from("course_contentnew_user")
          .select("*")
          .in("id", uniqueContentIds)

        if (contentData) {
          // Enhance with professor and tag info
          const enhanced = contentData.map(item => {
            const professor = professors.find(p => p.id === item.professor_id)
            const itemTags = item.tag_ids ? 
              tags.filter((tag: Tag) => item.tag_ids!.includes(tag.id)).map(tag => tag.name) : 
              []
            
            return {
              ...item,
              professor_name: professor?.name,
              tag_names: itemTags,
              semester_display: getSemesterDisplay(item.semester_number)
            }
          })
          
          setRecentlyViewed(enhanced as EnhancedContent[])
        }
      }
    } catch (error) {
      console.error("Error fetching recently viewed content:", error)
      setRecentlyViewed([])
    }
  }, [currentUserId, supabase, professors, tags])

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear all pending timeouts
      logTimeouts.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
      logTimeouts.current.clear()
      loggedInteractions.current.clear()
    }
  }, [])

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
    return semesters[semesterNumber] || `Sem ${semesterNumber}`
  }

  // Helper function to get responsive semester text
  const getSemesterText = (semesterDisplay: string) => {
    if (semesterDisplay.startsWith('Semester ')) {
      const number = semesterDisplay.replace('Semester ', '')
      return {
        mobile: `Sem ${number}`,
        desktop: semesterDisplay
      }
    }
    return {
      mobile: semesterDisplay,
      desktop: semesterDisplay
    }
  }

  // Helper function to get hidden content label
  const getHiddenLabel = (item: EnhancedContent) => {
    if (item.visible !== false) return null
    if (currentUserId && item.user_id === currentUserId) {
      return { text: "Pending Approval", icon: "clock" }
    }
    return { text: "Hidden", icon: "eye-off" }
  }

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        const isAuthenticated = !!user
        setCurrentUserId(user?.id || null)

        // Log user course interaction if authenticated (debounced)
        if (isAuthenticated && user) {
          logUserInteraction('view')
        }

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

        setIsPinned(!!pinnedData)
      } catch (error) {
        // Not pinned or error, keep as false
        console.log(error)
        setIsPinned(false)
      }
    }

    checkPinnedStatus()
  }, [courseId, supabase])

  // Fetch recently viewed when user/professors/tags change
  useEffect(() => {
    if (currentUserId && professors.length > 0 && tags.length > 0) {
      fetchRecentlyViewed()
    }
  }, [currentUserId, professors, tags, fetchRecentlyViewed])

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

  // Handle add content navigation with auth check
  const handleAddContent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setShowLoginDialog(true)
        return
      }
      
      router.push(`/add-content/${courseId}`)
    } catch (error) {
      console.error("Error checking auth for add content:", error)
      setShowLoginDialog(true)
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

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4 sm:p-6">
        <div className="fixed top-4 right-4 z-10 flex items-center gap-2">
          <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
          <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            <div>
              <div className="h-8 w-96 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Search and Filters Skeleton */}
          <div className="mb-6 space-y-4">
            <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
                <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
                <div className="h-6 w-18 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Recently Viewed Skeleton */}
          {currentUserId && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-5 bg-blue-300 dark:bg-blue-700 rounded animate-pulse"></div>
                <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Content Grid Skeleton */}
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, groupIndex) => (
              <div
                key={groupIndex}
                className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-indigo-300 dark:bg-indigo-700 rounded animate-pulse"></div>
                    <div className="h-6 w-64 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-4 pb-2 min-w-min">
                    {Array.from({ length: 4 }).map((_, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="w-64 flex-shrink-0 p-3 rounded-lg border bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                      >
                        <div className="space-y-2">
                          <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
                          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse"></div>
                          <div className="flex gap-1">
                            <div className="h-5 w-12 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
                            <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
                          </div>
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

  const filteredContent = enhancedContent.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.professor_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.semester_display?.toLowerCase().includes(search.toLowerCase()) ||
      item.batch?.toLowerCase().includes(search.toLowerCase())

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => item.tag_names?.includes(tag))

    return matchesSearch && matchesTags
  }).sort((a, b) => 
    (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase())
  )

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

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  const handleContentClick = (item: EnhancedContent) => {
    if (!item.resource_url) {
      setShowLoginDialog(true)
      return
    }
    
    // Log content interaction (debounced)
    if (item.id) {
      console.log("Logging content interaction for item:", item.id)
      logUserInteraction('view', item.id)

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
        <div className="mb-4 sm:mb-6">
          {/* Mobile: Stacked layout */}
          <div className="flex flex-col sm:hidden">
            <div className="flex items-center gap-2 mb-3">
              <Button
                onClick={() => router.push("/")}
                variant="ghost"
                className="hover:bg-white/50 dark:hover:bg-zinc-800/50 p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={togglePin}
                variant="ghost"
                className={`hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors p-2 ${
                  isPinned 
                    ? "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
                }`}
              >
                <Heart className={`h-4 w-4 transition-all ${isPinned ? "fill-current" : ""}`} />
              </Button>
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight break-words">
                {course.title}
              </h1>
            </div>
          </div>

          {/* Desktop: Horizontal layout */}
          <div className="hidden sm:flex items-center gap-4">
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="hover:bg-white/50 dark:hover:bg-zinc-800/50 p-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              onClick={togglePin}
              variant="ghost"
              className={`hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors p-3 ${
                isPinned 
                  ? "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" 
                  : "text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
              }`}
            >
              <Heart className={`h-5 w-5 transition-all ${isPinned ? "fill-current" : ""}`} />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                {course.code} - {course.title}
              </h1>
              {course.abbreviation && (
                <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-base">
                  {course.abbreviation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition text-sm sm:text-base"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "year" | "professor_name")}
                className="bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-400 transition"
              >
                <option value="year">Year</option>
                <option value="professor_name">Instructor</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs transition-colors ${
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

        {/* Recently Viewed Section */}
        {currentUserId && recentlyViewed.length > 0 && (
          <div className="mb-8">
            <div 
              className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 cursor-pointer group"
              onClick={() => setShowRecentlyViewed(!showRecentlyViewed)}
            >
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Recently Viewed ({recentlyViewed.length})
              </h2>
              {showRecentlyViewed ? (
                <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
              ) : (
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
              )}
            </div>
            
            {showRecentlyViewed && (
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="overflow-x-auto">
                  <div className="flex gap-4 pb-2 min-w-min">
                    {recentlyViewed.map((item) => (
                      <div
                        key={item.id}
                        className={`group flex flex-col w-52 sm:w-64 flex-shrink-0 p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                          item.visible === false
                            ? "bg-white/30 dark:bg-zinc-800/30 border-zinc-300 dark:border-zinc-600 opacity-60 border-dashed"
                            : "bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700"
                        }`}
                        onClick={() => handleContentClick(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1">
                            <h4 className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 leading-tight">
                              {item.title || "Untitled Resource"}
                            </h4>
                            {(() => {
                              const hiddenLabel = getHiddenLabel(item)
                              if (!hiddenLabel) return null
                              return hiddenLabel.icon === "clock" ? (
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                              ) : (
                                <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                              )
                            })()}
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="truncate">
                              {item.year} - <span className="sm:hidden">{getSemesterText(item.semester_display || '').mobile}</span><span className="hidden sm:inline">{getSemesterText(item.semester_display || '').desktop}</span> ({item.batch})
                            </span>
                            {item.professor_name && (
                              <>
                                <User className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                                <span className="hidden sm:block truncate">{item.professor_name}</span>
                              </>
                            )}
                          </div>
                          <div className="flex flex-wrap justify-between gap-1 sm:gap-2 mt-1 sm:mt-2">
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const hiddenLabel = getHiddenLabel(item)
                                if (!hiddenLabel) return null
                                return (
                                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                    hiddenLabel.icon === "clock" 
                                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                      : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                                  }`}>
                                    {hiddenLabel.text}
                                  </span>
                                )
                              })()}
                              {item.tag_names?.slice(0, 2).map((tag: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              {item.tag_names && item.tag_names.length > 2 && (
                                <span className="px-1.5 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">
                                  +{item.tag_names.length - 2}
                                </span>
                              )}
                            </div>
                            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Grid */}
        <div className="space-y-6">
          {search ? (
            // Flat list view when searching
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredContent.map((item) => (
                <div
                  key={item.id}
                  className={`group flex flex-col p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    item.visible === false
                      ? "bg-white/30 dark:bg-zinc-800/30 border-zinc-300 dark:border-zinc-600 opacity-60 border-dashed"
                      : "bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                  }`}
                  onClick={() => handleContentClick(item)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1">
                      <h4 className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 leading-tight">
                        {item.title || "Untitled Resource"}
                      </h4>
                      {(() => {
                        const hiddenLabel = getHiddenLabel(item)
                        if (!hiddenLabel) return null
                        return (
                          <div className="flex items-center gap-1">
                            {hiddenLabel.icon === "clock" ? (
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                            ) : (
                              <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                            )}
                            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                              hiddenLabel.icon === "clock" 
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                            }`}>
                              {hiddenLabel.text}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">
                        {item.year} - <span className="sm:hidden">{getSemesterText(item.semester_display || '').mobile}</span><span className="hidden sm:inline">{getSemesterText(item.semester_display || '').desktop}</span> ({item.batch})
                      </span>
                      {item.professor_name && (
                        <>
                          <User className="hidden sm:block h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                          <span className="hidden sm:block truncate">{item.professor_name}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-between gap-1 sm:gap-2 mt-1 sm:mt-2">
                      <div className="flex flex-wrap gap-1">
                        {item.tag_names?.slice(0, 2).map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {item.tag_names && item.tag_names.length > 2 && (
                          <span className="px-1.5 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">
                            +{item.tag_names.length - 2}
                          </span>
                        )}
                      </div>
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Grouped view when not searching
            (Object.entries(groupedContent) as [string, EnhancedContent[]][]).map(([key, items]) => {
              const [year, semester, batch, instructor] = key.split('*')
              const isExpanded = expandedGroups.has(key)
              const displayItems = isExpanded ? items : items
              
              return (
                <div
                  key={key}
                  className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                    <h3 className="text-sm sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {year} - <span className="sm:hidden">{getSemesterText(semester).mobile}</span><span className="hidden sm:inline">{getSemesterText(semester).desktop}</span> ({batch})
                    </h3>
                    {instructor && instructor !== 'Unknown' && (
                      <div className="flex items-center gap-1 sm:gap-2 ml-2">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-500" />
                        <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 truncate">{instructor}</span>
                      </div>
                    )}
                    </div>
                    <div className="flex items-center gap-2">
                      {items.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroupExpansion(key)}
                          className=""
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              View All ({items.length})
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Content Display */}
                  {isExpanded ? (
                    // Expanded Grid View
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map((item: EnhancedContent) => (
                        <div
                          key={item.id}
                          className={`group flex flex-col p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                            item.visible === false
                              ? "bg-white/30 dark:bg-zinc-800/30 border-zinc-300 dark:border-zinc-600 opacity-60 border-dashed"
                              : "bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                          }`}
                          onClick={() => handleContentClick(item)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                              <h4 className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 flex-1 line-clamp-2 leading-tight">
                                {item.title || "Untitled Resource"}
                              </h4>
                              {(() => {
                                const hiddenLabel = getHiddenLabel(item)
                                if (!hiddenLabel) return null
                                return hiddenLabel.icon === "clock" ? (
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                                )
                              })()}
                            </div>
                            <div className="flex flex-wrap justify-between gap-1 sm:gap-2 mt-1 sm:mt-2">
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  const hiddenLabel = getHiddenLabel(item)
                                  if (!hiddenLabel) return null
                                  return (
                                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                      hiddenLabel.icon === "clock" 
                                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                        : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                                    }`}>
                                      {hiddenLabel.text}
                                    </span>
                                  )
                                })()}
                                {item.tag_names?.slice(0, 2).map((tag: string, index: number) => (
                                  <span
                                    key={index}
                                    className="px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {item.tag_names && item.tag_names.length > 2 && (
                                  <span className="px-1.5 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">
                                    +{item.tag_names.length - 2}
                                  </span>
                                )}
                              </div>
                              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Collapsed Horizontal Scroll View
                    <div className="overflow-x-auto">
                      <div className="flex gap-4 pb-2 min-w-min">
                        {displayItems.map((item: EnhancedContent) => (
                          <div
                            key={item.id}
                            className={`group flex flex-col w-52 sm:w-64 flex-shrink-0 p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                              item.visible === false
                                ? "bg-white/30 dark:bg-zinc-800/30 border-zinc-300 dark:border-zinc-600 opacity-60 border-dashed"
                                : "bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                            }`}
                            onClick={() => handleContentClick(item)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <h4 className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 leading-tight">
                                  {item.title || "Untitled Resource"}
                                </h4>
                                {(() => {
                                  const hiddenLabel = getHiddenLabel(item)
                                  if (!hiddenLabel) return null
                                  return hiddenLabel.icon === "clock" ? (
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                                  ) : (
                                    <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                                  )
                                })()}
                              </div>
                              <div className="flex flex-wrap justify-between gap-1 sm:gap-2 mt-1 sm:mt-2">
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const hiddenLabel = getHiddenLabel(item)
                                    if (!hiddenLabel) return null
                                    return (
                                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                        hiddenLabel.icon === "clock" 
                                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                          : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                                      }`}>
                                        {hiddenLabel.text}
                                      </span>
                                    )
                                  })()}
                                  {item.tag_names?.slice(0, 2).map((tag: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {item.tag_names && item.tag_names.length > 2 && (
                                    <span className="px-1.5 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">
                                      +{item.tag_names.length - 2}
                                    </span>
                                  )}
                                </div>
                                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                              </div>
                            </div>
                          </div>
                        ))}
                        {items.length > 3 && !isExpanded && (
                          <div className="flex items-center justify-center w-32 flex-shrink-0">
                            <div className="text-center text-zinc-500 dark:text-zinc-400">
                              <div className="text-sm font-medium">+{items.length - 3} more</div>
                              <div className="text-xs">Click &quot;View All&quot;</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
            onClick={handleAddContent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-md sm:px-4 sm:py-2 flex items-center justify-center"
          >
            <Plus className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Add Content</span>
          </Button>
        </div>

        {/* Sassy Login Dialog */}
        <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Hold Up There, Partner! 🤠
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2 text-zinc-700 dark:text-zinc-300">
                This feature requires you to login or authenticate first.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                Y&apos;all keep uploading copyrighted stuff, so I need to ensure you&apos;re a student else I&apos;ll get DMCA&apos;d.
              </p>
            </div>
            
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
                Fine, I&apos;ll Login 
              </Button>
              
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
} 