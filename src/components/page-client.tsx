"use client"

import { useState, useEffect, use, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileText, Calendar, User, ArrowLeft, Plus, Search, Filter, AlertTriangle, Heart, EyeOff, Clock, ChevronDown, ChevronUp, Edit, Download, RefreshCcw, MessageSquare, Bug } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import dynamic from "next/dynamic"
const PDFViewer = dynamic(() => import('@/components/pdf-viewer'), { ssr: false })
import { Database } from "@/types/supabase"
import Chatbox from "@/components/chatbox"
import EditContentDialog from "@/components/edit-content-dialog"
import { motion, AnimatePresence } from "framer-motion"
type CourseNew = Database["public"]["Tables"]["coursenew"]["Row"]
type CourseContent = Database["public"]["Tables"]["course_contentnew"]["Row"]
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
  serverCourse,
  serverContent,
  serverProfessors,
}: {
  params: Promise<{ "slugg": string }>,
  serverCourse?: CourseNew | null,
  serverContent?: (Course_content_anon | Course_content_user)[],
  serverProfessors?: Professor[],
}) {
  const router = useRouter()
  const courseId = use(params)["slugg"]
  const course = serverCourse || null
  const [content, setContent] = useState<(Course_content_anon | Course_content_user)[]>(serverContent || [])
  const professors = serverProfessors || []
  const [enhancedContent, setEnhancedContent] = useState<EnhancedContent[]>([])
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
  const [redirectTo, setRedirectTo] = useState<string >("")
  const [useNativeViewer, setUseNativeViewer] = useState(() => {
    return true
  })
  const [isPinned, setIsPinned] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [recentlyViewed, setRecentlyViewed] = useState<EnhancedContent[]>([])
  const [showRecentlyViewed, setShowRecentlyViewed] = useState(false)
  const [isContentReady, setIsContentReady] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingContent, setEditingContent] = useState<CourseContent | null>(null)
  const [downloadState, setDownloadState] = useState<Record<number, { progress: number, active: boolean }>>({})
  const downloadControllers = useRef<Map<number, AbortController>>(new Map())
  const [showAdminPopup, setShowAdminPopup] = useState(false)
  const [adminPopupContent, setAdminPopupContent] = useState<EnhancedContent | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminApproving, setAdminApproving] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [adminRejecting, setAdminRejecting] = useState(false)
  const [downloadAllState, setDownloadAllState] = useState<Record<string, { progress: number, active: boolean, completed: number, total: number }>>({})
  const downloadAllControllers = useRef<Map<string, AbortController>>(new Map())
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
          .or("deleted.is.null,deleted.eq.false");

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
      
      // Clean up download controllers
      downloadControllers.current.forEach((controller) => {
        controller.abort()
      })
      downloadControllers.current.clear()
      
      // Clean up download all controllers
      downloadAllControllers.current.forEach((controller) => {
        controller.abort()
      })
      downloadAllControllers.current.clear()
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
    return  `Sem ${semesterNumber}`
  }

  // Helper function to format updated timestamp
  const formatUpdatedAt = (updatedAt: string | null) => {
    if (!updatedAt) return null
    
    const updated = new Date(updatedAt)
    const now = new Date()
    const diffMs = now.getTime() - updated.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks}w ago`
    } else {
      const months = Math.floor(diffDays / 30)
      return `${months}mo ago`
    }
  }

  const buildFilename = (item: EnhancedContent, contentType?: string | null) => {
    const safe = (item.title || 'file').replace(/[^a-z0-9\-_. ]/gi, '_')
    const type = (item.filetype || contentType || '').toLowerCase()
    if (!type) return safe + '.pdf'
    if (type.includes('pdf')) return safe + '.pdf'
    if (type.includes('word')) return safe + '.docx'
    if (type.includes('sheet') || type.includes('excel')) return safe + '.xlsx'
    if (type.includes('presentation') || type.includes('powerpoint')) return safe + '.pptx'
    if (type.includes('text/plain')) return safe + '.txt'
    if (type.includes('image/png')) return safe + '.png'
    if (type.includes('image/jpeg')) return safe + '.jpg'
    if (type.includes('image/jpg')) return safe + '.jpg'
    if (type.includes('image/webp')) return safe + '.webp'
    if (type.includes('application/zip')) return safe + '.zip'
    if (type.includes('application/octet-stream')) return safe + item.resource_url?.split('.').pop()
    return safe
  }

  const downloadWithProgress = async (item: EnhancedContent) => {
    if (!item.id || !item.resource_url){
      setRedirectTo(`/course/${courseId}`)
      setShowLoginDialog(true)
      return
    }
    const id = item.id
    try {
      setDownloadState(prev => ({ ...prev, [id]: { progress: 0, active: true } }))
      const controller = new AbortController()
      const existing = downloadControllers?.current?.get(id)
      console.log(existing);
      if (!downloadControllers.current) downloadControllers.current = new Map()
      downloadControllers.current.set(id, controller)

      const res = await fetch(item.resource_url, { signal: controller.signal })
      if (!res.ok || !res.body) {
        throw new Error('Failed to fetch file')
      }

      const contentType = res.headers.get('content-type')
      const contentLength = res.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      const reader = res.body.getReader()
      const chunks: BlobPart[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          received += value.length
          if (total > 0) {
            const pct = Math.min(99, Math.round((received / total) * 100))
            setDownloadState(prev => ({ ...prev, [id]: { progress: pct, active: true } }))
          }
        }
      }

      const blob = new Blob(chunks, { type: contentType || item.filetype || 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = buildFilename(item, contentType)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      setDownloadState(prev => ({ ...prev, [id]: { progress: 100, active: false } }))
      downloadControllers.current.delete(id)
      // Optionally clear after a delay
      setTimeout(() => setDownloadState(prev => { const n = { ...prev }; delete n[id]; return n }), 1500)
    } catch (e: any) {
      downloadControllers.current.delete(id)
      const aborted = e?.name === 'AbortError' || /aborted/i.test(String(e?.message || ''))
      if (aborted) {
        setDownloadState(prev => ({ ...prev, [id]: { progress: 0, active: false } }))
      } else {
        setDownloadState(prev => ({ ...prev, [id]: { progress: 0, active: false } }))
        console.error('Download error', e)
        alert('Failed to download file.')
      }
    }
  }

  const handleDownloadClick = (item: EnhancedContent) => {
    if(item.professor_id==71){
      alert('No content available, uploading content will increase your aura.')
      return;
    }
    if(!item.resource_url || !item.id){
      setRedirectTo(`/course/${courseId}`)
      setShowLoginDialog(true)
      return
    }
    logUserInteraction('download', item.id)
    const id = item.id
    const state = downloadState[id]
    if (state?.active) {
      const controller = downloadControllers.current.get(id)
      controller?.abort()
      downloadControllers.current.delete(id)
      setDownloadState(prev => ({ ...prev, [id]: { progress: 0, active: false } }))
      return
    }
    downloadWithProgress(item)
  }

  const downloadAllInGroup = async (groupKey: string, items: EnhancedContent[]) => {
    // Filter out items without resource URLs and dummy content
    const downloadableItems = items.filter(item => 
      item.resource_url && 
      item.id && 
      item.professor_id !== 71
    )
    
    if (downloadableItems.length === 0) {
      alert('No downloadable content available in this group.')
      return
    }

    try {
      setDownloadAllState(prev => ({ 
        ...prev, 
        [groupKey]: { 
          progress: 0, 
          active: true, 
          completed: 0, 
          total: downloadableItems.length 
        } 
      }))
      
      const controller = new AbortController()
      downloadAllControllers.current.set(groupKey, controller)

      // Download items sequentially to avoid overwhelming the browser
      for (let i = 0; i < downloadableItems.length; i++) {
        if (controller.signal.aborted) break
        
        const item = downloadableItems[i]
        
        try {
          await downloadWithProgress(item)
          
          // Update progress
          setDownloadAllState(prev => ({
            ...prev,
            [groupKey]: {
              ...prev[groupKey],
              completed: i + 1,
              progress: Math.round(((i + 1) / downloadableItems.length) * 100)
            }
          }))
          
          // Small delay between downloads to prevent overwhelming
          if (i < downloadableItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (error) {
          console.error(`Failed to download ${item.title}:`, error)
          // Continue with next file even if one fails
        }
      }

      setDownloadAllState(prev => ({ 
        ...prev, 
        [groupKey]: { 
          ...prev[groupKey], 
          active: false, 
          progress: 100 
        } 
      }))
      
      downloadAllControllers.current.delete(groupKey)
      
      // Clear state after delay
      setTimeout(() => {
        setDownloadAllState(prev => {
          const newState = { ...prev }
          delete newState[groupKey]
          return newState
        })
      }, 3000)
      
    } catch (error) {
      console.error('Download all error:', error)
      setDownloadAllState(prev => ({ 
        ...prev, 
        [groupKey]: { 
          ...prev[groupKey], 
          active: false 
        } 
      }))
      downloadAllControllers.current.delete(groupKey)
      alert('Failed to download all files.')
    }
  }

  const handleDownloadAllClick = async (groupKey: string, items: EnhancedContent[]) => {
    const state = downloadAllState[groupKey]
    
    if (state?.active) {
      // Cancel download
      const controller = downloadAllControllers.current.get(groupKey)
      controller?.abort()
      downloadAllControllers.current.delete(groupKey)
      setDownloadAllState(prev => ({
        ...prev,
        [groupKey]: { ...prev[groupKey], active: false, progress: 0 }
      }))
      return
    }
    
    // Check if user is authenticated before allowing download
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setRedirectTo(`/course/${courseId}`)
      setShowLoginDialog(true)
      return
    }
    
    downloadAllInGroup(groupKey, items)
  }
  

  

  // Helper function to get responsive semester text
  const getSemesterText = (semesterDisplay: string) => {
    if (semesterDisplay.startsWith('Semester ')) {
      const number = semesterDisplay.replace('Semester ', '')
      return {
        mobile: `${number}`,
        desktop: `${number}`
      }
    }
    if(semesterDisplay.startsWith('Sem ')){
      const number = semesterDisplay.replace('Sem ', '')
      return {
        mobile: `${number}`,
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
    if (currentUserId && item.user_id === currentUserId && !isAdmin) {
      return { text: "Pending Approval", icon: "clock" }
    }
    return { text: "Click to approve", icon: "eye-off" }
  }

  // Initialize enhanced content from server props
  useEffect(() => {
    if (content.length > 0 && professors.length > 0) {
      // Create enhanced content with resolved professor names and tags
      const enhanced = content.map((item: Course_content_anon | Course_content_user) => {
        const professor = professors.find(p => p.id === item.professor_id)
        const itemTags = item.tag_ids && tags.length > 0 ? 
          tags.filter((tag: Tag) => item.tag_ids!.includes(tag.id)).map(tag => tag.name) : 
          []
        
        return {
          ...item,
          professor_name: professor?.name,
          tag_names: itemTags,
          semester_display: getSemesterDisplay(item.semester_number || 0)
        }
      })
      setEnhancedContent(enhanced)
      
      // Extract unique tag names for filtering
      const uniqueTags = new Set<string>()
      enhanced.forEach((item: any) => {
        item.tag_names?.forEach((tag: string) => uniqueTags.add(tag))
      })
      setAvailableTags(Array.from(uniqueTags))
    }
  }, [content, professors, tags])

  // Fetch tags and handle user authentication
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        const isAuthenticated = !!user
        setCurrentUserId(user?.id || null)

        // Check if user is admin
        if (user) {
          const { data: userMeta } = await supabase
            .from("user_meta")
            .select("role")
            .eq("user_id", user.id)
            .single()
          
          const userRole = userMeta?.role
          setIsAdmin(userRole === 'admin' || userRole === 'moderator' || userRole === 'super_admin')
        }

        // Log user course interaction if authenticated (debounced)
        if (isAuthenticated && user) {
          logUserInteraction('view')
        }

        // Fetch tags (needed for filtering and enhanced content)
        const { data: tagsData } = await supabase
          .from("tags")
          .select("*")

        setTags(tagsData || [])

        // If user is authenticated and we have server content, we might need to refetch for user-specific data
        if (isAuthenticated && serverContent && serverContent.length > 0) {
          // Check if we need to fetch user-specific content (with resource URLs)
          const { data: userContentData, error: contentError } = await supabase
            .from("course_contentnew_user")
            .select("*")
            .eq("course_id", courseId)
            .or("deleted.is.null,deleted.eq.false")
            .order("year", { ascending: true });

          if (!contentError && userContentData) {
            setContent(userContentData)
          }
        }
      } catch (error) {
        console.error("Error fetching client data:", error)
      }
    }

    fetchClientData()
  }, [courseId, supabase, serverContent])

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


if(pinnedData?.length){
  setIsPinned(pinnedData.length > 0)
}
       
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

  // Set content as ready after a delay to allow animations to complete
  useEffect(() => {
    if ((course || serverCourse) && enhancedContent.length > 0) {
      const timer = setTimeout(() => {
        setIsContentReady(true)
      }, 100) // Wait 100ms for animations to settle
      
      return () => clearTimeout(timer)
    }
  }, [course, serverCourse, enhancedContent])

  // Toggle pin status
  const togglePin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRedirectTo(`/course/${courseId}`)
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
        setRedirectTo(`/add-content/${courseId}`)
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

  if (!course && !serverCourse) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4 sm:p-6"
      >
        

        <div className="max-w-7xl mx-auto">
          {/* Simple Loading State */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-6"
            >
              <FileText className="h-16 w-16 text-indigo-500 dark:text-indigo-400 mx-auto" />
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2"
            >
              Loading Course Content
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base"
            >
              Gathering all the good stuff for you...
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6"
            >
              <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="w-2 h-2 bg-indigo-500 dark:bg-indigo-400 rounded-full"
                  />
                    ))}
                  </div>
            </motion.div>
          </motion.div>
                </div>
      </motion.div>
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
    setSelectedTags(prev => {
      // Single-select: clicking a tag selects only that tag; clicking it again clears selection
      if (prev.length === 1 && prev[0] === tag) {
        return []
      }
      return [tag]
    })
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
    if(item.professor_id==71){
      alert('No content available, uploading content will increase your aura.')
      return;
    }
    if (!item.resource_url) {
      setRedirectTo(`/course/${courseId}`)
      setShowLoginDialog(true)
      return
    }
    
    // Check if content is hidden and user is admin - show admin popup
    if (item.visible === false && isAdmin) {
      setAdminPopupContent(item)
      setShowAdminPopup(true)
      return
    }
    
    // Log content interaction (debounced)
    if (item.id) {
      console.log("Logging content interaction for item:", item.id)
      logUserInteraction('view', item.id)

    }
    
    if (isMobile || useNativeViewer) {
      console.log("Opening resource url:", item.filetype)

      setSelectedContent(item)
      setSelectedFileId(item.id)
      if (item.filetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || item.filetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || item.filetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        window.open(`https://view.officeapps.live.com/op/view.aspx?src=${item.resource_url}`, '_blank')
      } 
      else if(item.filetype === ""){
        handleDownloadClick(item)
      }
      else {
        window.open(item.resource_url, '_blank')
      }
      //window.open(item.resource_url, '_blank')
    } else {
      setSelectedContent(item)
      setSelectedFileId(item.id)
      setShowViewer(true)
    }
  }

  const handleEditClick = (e: React.MouseEvent, item: EnhancedContent) => {
    e.stopPropagation()
    setEditingContent(item as CourseContent)
    setEditDialogOpen(true)
  }

  const handleEditSave = () => {
    // Update the content in the state instead of reloading
    if (editingContent) {
      // Find and update the content in enhancedContent
      setEnhancedContent(prev => 
        prev.map(item => 
          item.id === editingContent.id 
            ? {
                ...item,
                title: editingContent.title,
                year: editingContent.year,
                batch: editingContent.batch,
                semester_number: editingContent.semester_number,
                professor_id: editingContent.professor_id,
                tag_ids: editingContent.tag_ids,
                resource_url: editingContent.resource_url,
                visible: editingContent.visible,
                // Update professor name if professor changed
                professor_name: editingContent.professor_id 
                  ? professors.find(p => p.id === editingContent.professor_id)?.name 
                  : undefined,
                // Update tag names if tags changed
                tag_names: editingContent.tag_ids 
                  ? tags.filter(tag => editingContent.tag_ids!.includes(tag.id)).map(tag => tag.name)
                  : [],
                semester_display: getSemesterDisplay(editingContent.semester_number || 0)
              }
            : item
        )
      )
      
      // Also update in the base content array
      setContent(prev => 
        prev.map(item => 
          item.id === editingContent.id 
            ? {
                ...item,
                title: editingContent.title,
                year: editingContent.year,
                batch: editingContent.batch,
                semester_number: editingContent.semester_number,
                professor_id: editingContent.professor_id,
                tag_ids: editingContent.tag_ids,
                resource_url: editingContent.resource_url,
                visible: editingContent.visible
              }
            : item
        )
      )
    }
  }

 

  const handleAdminReject = async () => {
    if (!adminPopupContent) return

    try {
      setAdminRejecting(true)
      
      const { error } = await supabase
        .from("course_contentnew")
        .update({ deleted: true })
        .eq("id", adminPopupContent.id)

      if (error) {
        console.error("Error approving content:", error)
        alert("Failed to approve content")
        return
      }

      logUserInteraction('deny', adminPopupContent.id!)

      // // Update the content in the state to make it visible
      // setEnhancedContent(prev => 
      //   prev.map(item => 
      //     item.id === adminPopupContent.id 
      //       ? { ...item, visible: true }
      //       : item
      //   )
      // )
      setEnhancedContent(prev => prev.filter(item => item.id !== adminPopupContent.id))
      setContent(prev => prev.filter(item => item.id !== adminPopupContent.id))
      // setContent(prev => 
      //   prev.map(item => 
      //     item.id === adminPopupContent.id 
      //       ? { ...item, deleted: true }
      //       : item
      //   )
      // )

      setShowAdminPopup(false)
      setAdminPopupContent(null)
    } catch (error) {
      console.error("Error Deleting content:", error)
      alert("Failed to delete content")
    } finally {
      setAdminRejecting(false)
    }
  }

  const handleAdminApprove = async () => {
    if (!adminPopupContent) return

    try {
      setAdminApproving(true)
      
      const { error } = await supabase
        .from("course_contentnew")
        .update({ visible: true })
        .eq("id", adminPopupContent.id)

      if (error) {
        console.error("Error approving content:", error)
        alert("Failed to approve content")
        return
      }

      logUserInteraction('approve', adminPopupContent.id!)

      // Update the content in the state to make it visible
      setEnhancedContent(prev => 
        prev.map(item => 
          item.id === adminPopupContent.id 
            ? { ...item, visible: true }
            : item
        )
      )
      
      setContent(prev => 
        prev.map(item => 
          item.id === adminPopupContent.id 
            ? { ...item, visible: true }
            : item
        )
      )

      setShowAdminPopup(false)
      setAdminPopupContent(null)
    } catch (error) {
      console.error("Error approving content:", error)
      alert("Failed to approve content")
    } finally {
      setAdminApproving(false)
    }
  }

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      alert("Please enter your feedback before submitting.")
      return
    }

    try {
      setFeedbackSubmitting(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("You must be logged in to submit feedback.")
        return
      }

      const { error } = await supabase
        .from("feedback")
        .insert({
          user_id: user.id,
          feedback: feedbackText.trim()
        })

      if (error) {
        console.error("Error submitting feedback:", error)
        alert("Failed to submit feedback. Please try again.")
        return
      }

      alert("Thank you for your feedback! We appreciate your input.")
      setFeedbackText("")
      setShowFeedbackDialog(false)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      alert("Failed to submit feedback. Please try again.")
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const handleFeedbackClick = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRedirectTo(`/course/${courseId}`)
        setShowLoginDialog(true)
        return
      }
      setShowFeedbackDialog(true)
    } catch (error) {
      console.error("Error checking auth for feedback:", error)
      setShowLoginDialog(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="fixed top-4 right-4 z-10 flex items-center gap-2"
      >
        {!isMobile && (
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setUseNativeViewer(!useNativeViewer)}
              className="hover:bg-white/50 dark:hover:bg-zinc-800/50 text-sm"
            >
              {useNativeViewer ? "Using Browser viewer" : "Using In-App viewer"}
            </Button>
            {!useNativeViewer && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded border border-amber-200 dark:border-amber-800 max-w-xs text-right"
              >
                Having issues? Try the toggle above
              </motion.div>
            )}
          </div>
        )}
        <ThemeToggle />
      </motion.div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mb-4 sm:mb-6"
        >
          {/* Mobile: Stacked layout */}
          <div className="flex flex-col sm:hidden">
            <div className="flex items-center gap-1">
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
              <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight break-words">
                {(course || serverCourse)?.title}
              </h1>
            </div>
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
                {(course || serverCourse)?.title}
              </h1>
              {(course || serverCourse)?.abbreviation && (
                <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-base">
                  {(course || serverCourse)?.abbreviation}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mb-4 sm:mb-6 space-y-3 sm:space-y-4"
        >
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
              {availableTags.map((tag, index) => (
                <motion.button
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleTag(tag)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs transition-colors ${
                    selectedTags.includes(tag)
                      ? "bg-indigo-500 text-white"
                      : "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                  }`}
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recently Viewed Section */}
        <AnimatePresence>
          { true && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
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
                            <div className="flex items-center gap-1">
                              {(() => {
                                const hiddenLabel = getHiddenLabel(item)
                                if (!hiddenLabel) return null
                                return hiddenLabel.icon === "clock" ? (
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                                )
                              })()}
                              {currentUserId && item.user_id === currentUserId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleEditClick(e, item)}
                                  className="h-6 w-6 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
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
                            {item.updated_at && (
                              <>
                                <span className="hidden sm:block text-zinc-400 dark:text-zinc-600">•</span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                  Updated {formatUpdatedAt(item.updated_at)}
                                </span>
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
                            {item.resource_url && (
                              <button
                                className="p-2 sm:p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-zinc-500 hover:text-indigo-600 transition-colors flex-shrink-0"
                                onClick={(e) => { e.stopPropagation(); handleDownloadClick(item) }}
                                aria-label="Download"
                              >
                                {downloadState[item.id || -1]?.active ? (
                                  <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                                    {downloadState[item.id || -1]?.progress ?? 0}%
                                  </span>
                                ) : (
                                  <Download className="h-5 w-5 sm:h-5 sm:w-5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>

        {/* Content Grid */}
        <AnimatePresence>
          {isContentReady && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
          {search ? (
            // Flat list view when searching
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredContent.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
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
                      <div className="flex items-center gap-1">
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
                        {currentUserId && item.user_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEditClick(e, item)}
                            className="h-6 w-6 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
                      {item.updated_at && (
                        <>
                          <span className="hidden sm:block text-zinc-400 dark:text-zinc-600">•</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            Updated {formatUpdatedAt(item.updated_at)}
                          </span>
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
                      {item.resource_url && (
                        <button
                          className="p-2 sm:p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-zinc-500 hover:text-indigo-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDownloadClick(item) }}
                          aria-label="Download"
                        >
                          {downloadState[item.id || -1]?.active ? (
                            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                              {downloadState[item.id || -1]?.progress ?? 0}%
                            </span>
                          ) : (
                            <Download className="h-5 w-5 sm:h-5 sm:w-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            // Grouped view when not searching
            (Object.entries(groupedContent) as [string, EnhancedContent[]][]).map(([key, items]) => {
              const [year, semester, batch, instructor] = key.split('*')
              console.log(semester)
              const isExpanded = expandedGroups.has(key)
              const displayItems = isExpanded ? items : items
              
              return (
                <div
                  key={key}
                  className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                  <div className="flex sm:flex-row  items-center gap-2">

                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                    <h3 className="text-xs sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {year} {batch} - <span className="sm:hidden">{getSemesterText(semester).mobile}</span><span className="hidden sm:inline">{getSemesterText(semester).desktop}</span> 
                    </h3>
                    {instructor && instructor !== 'Unknown' && (
                      <div className="flex items-center gap-1 sm:gap-2 ml-2">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-500" />
                        <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 truncate">{instructor}</span>
                      </div>
                    )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Download All Button */}
                      {items.filter(item => item.resource_url && item.id && item.professor_id !== 71).length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAllClick(key, items)}
                          className="hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center gap-1"
                        >
                          {downloadAllState[key]?.active ? (
                            <>
                              <span className="text-xs font-medium">
                                {downloadAllState[key]?.completed || 0}/{downloadAllState[key]?.total || 0}
                              </span>
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline text-sm">All</span>
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { data: { user } } = await supabase.auth.getUser()
                            
                            
                            // Get professor ID from the first item in the group
                            const professorId = items[0]?.professor_id
                            const professorName = items[0]?.professor_name
                            
                            // Build query params
                            const params = new URLSearchParams({
                              year: year,
                              semester: String(items[0]?.semester_number),
                              batch: batch
                            })
                            if(professorId==71){
                              params.delete("year")
                              params.delete("semester")
                              params.delete("batch")
                            }
                            
                            if (professorId && professorId!=71) {
                              params.append('professor_id', professorId.toString())
                            }
                            if (professorName && professorId!=71) {
                              params.append('professor_name', professorName)
                            }
                            if (!user) {
                              setRedirectTo(`/add-content/${courseId}?${params.toString()}`)
                              setShowLoginDialog(true)
                              return
                            }
                            router.push(`/add-content/${courseId}?${params.toString()}`)

                          } catch (error) {
                            console.error("Error navigating to add content:", error)
                            alert("Error navigating to add content: " + error)
                            setShowLoginDialog(true)
                          }
                        }}
                        className="hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
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
                              
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
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
                        item.professor_id!=71?
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
                              <h4 className="text-xs sm:text-base font-medium text-zinc-900 dark:text-zinc-100 flex-1 line-clamp-2 leading-tight">
                                {item.title || "Untitled Resource"}
                              </h4>
                              <div className="flex items-center gap-1">
                                {(() => {
                                  const hiddenLabel = getHiddenLabel(item)
                                  if (!hiddenLabel) return null
                                  return hiddenLabel.icon === "clock" ? (
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                                  ) : (
                                    <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                                  )
                                })()}
                                {currentUserId && item.user_id === currentUserId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleEditClick(e, item)}
                                    className="h-6 w-6 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                 {item.resource_url && (
                                  <button
                                    className="p-2 sm:p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-zinc-500 hover:text-indigo-600 transition-colors flex-shrink-0"
                                    onClick={(e) => { e.stopPropagation(); handleDownloadClick(item) }}
                                    aria-label="Download"
                                  >
                                    {downloadState[item.id || -1]?.active ? (
                                      <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                                        {downloadState[item.id || -1]?.progress ?? 0}%
                                      </span>
                                    ) : (
                                      <Download className="h-5 w-5 sm:h-5 sm:w-5" />
                                    )}
                                  </button>
                                )}
                              </div>

                            </div>
                            {item.updated_at && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                                  Updated {formatUpdatedAt(item.updated_at)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div> : <div
                        key={item.id}
                        >
                          <div className="flex flex-col p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <h4 className="text-xs sm:text-base font-medium text-zinc-900 dark:text-zinc-100 flex-1 line-clamp-2 leading-tight">
                                  No content available, please upload some content
                                </h4>
                              </div>
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
                          item.professor_id!=71?
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
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const hiddenLabel = getHiddenLabel(item)
                                    if (!hiddenLabel) return null
                                    return hiddenLabel.icon === "clock" ? (
                                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                                    ) : (
                                      <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                                    )
                                  })()}
                                  {currentUserId && item.user_id === currentUserId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => handleEditClick(e, item)}
                                      className="h-6 w-6 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                   {(
                                  <button
                                    className="p-2 sm:p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-zinc-500 hover:text-indigo-600 transition-colors flex-shrink-0"
                                    onClick={(e) => { e.stopPropagation(); handleDownloadClick(item) }}
                                    aria-label="Download"
                                  >
                                    {downloadState[item.id || -1]?.active ? (
                                      <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                                        {downloadState[item.id || -1]?.progress ?? 0}%
                                      </span>
                                    ) : (
                                      <Download className="h-5 w-5 dark:text-zinc-200" />
                                    )}
                                  </button>
                                )}
                                </div>
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
                                  {item.updated_at && (
                                    <span className="px-1.5 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                                      Updated {formatUpdatedAt(item.updated_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>:<div
                          key={item.id}
                          >
                            <div className="flex flex-col p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                  <h4 className="text-xs sm:text-base font-medium text-zinc-900 dark:text-zinc-100 flex-1 line-clamp-2 leading-tight">
                                    No content available, please upload some content
                                  </h4>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
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
            </motion.div>
        )}
        </AnimatePresence>

              

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
                    filetype: item.filetype!,
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

        {/* Floating Actions */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="fixed bottom-6 right-6 flex items-center justify-center gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 sm:gap-3 px-2.5 py-2 sm:px-3 sm:py-2 rounded-full bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-lg"
          >
            {isAdmin ? (
              <Button
                variant="ghost"
                onClick={async () => {
                  const response = await fetch(`/protected/revalidate?courseID=${courseId}`)
                  if(response.ok){
                    alert('Course page revalidated')
                  }else{
                    alert('Failed to revalidate course page')
                  }
                }}
                className="inline-flex items-center justify-center hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full h-12 w-12 sm:h-auto sm:w-auto sm:px-3"
              >
                <RefreshCcw className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Revalidate</span>
              </Button>
            ) : null}

            <Button
              onClick={handleFeedbackClick}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-full sm:px-4 sm:py-2 flex items-center justify-center ring-1 ring-white/30 dark:ring-white/10"
            >
              <Bug className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Feedback</span>
            </Button>

            <Button
              onClick={handleAddContent}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-full sm:px-4 sm:py-2 flex items-center justify-center ring-1 ring-white/30 dark:ring-white/10"
            >
              <Plus className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Add Content</span>
            </Button>
          </motion.div>
          <Chatbox />
        </motion.div>

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
                  router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`)
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
              >
                Fine, I&apos;ll Login 
              </Button>
              
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Content Dialog */}
        <EditContentDialog
          content={editingContent}
          isOpen={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSave={handleEditSave}
          professors={professors}
          tags={tags}
        />

        {/* Admin Popup for Hidden Content */}
        <Dialog open={showAdminPopup} onOpenChange={setShowAdminPopup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Admin Content Review
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2 text-zinc-700 dark:text-zinc-300">
                This content is currently hidden and requires approval.
              </DialogDescription>
            </DialogHeader>
            
            {adminPopupContent && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {adminPopupContent.title || "Untitled Resource"}
                  </h3>
                  <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{adminPopupContent.year} - {adminPopupContent.semester_display} ({adminPopupContent.batch})</span>
                    </div>
                    {adminPopupContent.professor_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{adminPopupContent.professor_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAdminPopup(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  if (adminPopupContent?.resource_url) {
                    window.open(adminPopupContent.resource_url, '_blank')
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Open PDF
              </Button>
              <Button 
                onClick={handleAdminApprove}
                disabled={adminApproving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {adminApproving ? "Approving..." : "Approve"}
              </Button>
              <Button
                onClick={handleAdminReject}
                disabled={adminRejecting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {adminRejecting ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Bug className="h-5 w-5" />
                Report Bug or Give Feedback 🐛
              </DialogTitle>
              <DialogDescription className="space-y-3 pt-2 text-zinc-700 dark:text-zinc-300">
                Help us improve the platform by sharing your thoughts, reporting bugs, or suggesting new features.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-text" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Your Feedback
                </Label>
                <textarea
                  id="feedback-text"
                  placeholder="Describe the bug you encountered, suggest improvements, or share any other feedback..."
                  value={feedbackText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackText(e.target.value)}
                  className="min-h-[120px] resize-none border-2 border-amber-200 dark:border-amber-700 focus:ring-2 focus:ring-amber-400 transition w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={feedbackSubmitting}
                />
              </div>
              
              <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Anything is welcome, really. Thank you for your feedback:</p>
                    <ul className="space-y-1 text-amber-700 dark:text-amber-300">
                      <li>• If you have a good experience with a feature, let us know.</li>
                      <li>• Something didnt work? let us know.</li>
                      <li>• Mention your browser and device, if reporting a bug.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowFeedbackDialog(false)}
                className="flex-1"
                disabled={feedbackSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleFeedbackSubmit}
                disabled={feedbackSubmitting || !feedbackText.trim()}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
} 