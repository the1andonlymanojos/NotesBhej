"use client"

import { useState, useEffect, use, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileText, Calendar, User, ArrowLeft, Plus, Search, Filter, AlertTriangle, Heart, EyeOff, Clock, ChevronDown, ChevronUp, Edit, Download, RefreshCcw, MessageSquare, Bug, Star, MoreHorizontal, ExternalLink, Trash2, Layers, Share2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { AnnouncementsDrawer } from "@/components/announcements-drawer"
import dynamic from "next/dynamic"
const PDFViewer = dynamic(() => import('@/components/pdf-viewer'), { ssr: false })
import { Database } from "@/types/supabase"
import EditContentDialog from "@/components/edit-content-dialog"
import { motion, AnimatePresence } from "framer-motion"
import {
  apiGetMyCourseInteractions,
  apiGetCourseContentForCourse,
  apiCreateInteraction,
  apiGetMe,
  apiGetPinnedCoursesMe,
  apiPinCourse,
  apiUnpinCourse,
  apiGetTags,
  apiPatchCourseContentVisibility,
  apiCreateFeedback,
  apiReorderCourseContent,
} from "@/lib/api/client"
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
  order?: number | null
}

const prefer_r2_url = true; // VERY IMP!!!!!



const getContentUrl = (item: { r2_url?: string | null; resource_url?: string | null }): string | null => {
  const r2 = (item as any).r2_url as string | null | undefined
  const res = (item as any).resource_url as string | null | undefined
  if (prefer_r2_url && r2) return r2
  return res || null
}

const TAG_CARD_STYLES = [
  "bg-indigo-50/20 dark:bg-indigo-950/10 border-zinc-200 dark:border-zinc-700 border-l-4 border-l-indigo-300 dark:border-l-indigo-700 hover:border-indigo-300 dark:hover:border-indigo-700",
  "bg-slate-50/25 dark:bg-slate-900/10 border-zinc-200 dark:border-zinc-700 border-l-4 border-l-slate-300 dark:border-l-slate-600 hover:border-slate-300 dark:hover:border-slate-600",
  "bg-teal-50/20 dark:bg-teal-950/10 border-zinc-200 dark:border-zinc-700 border-l-4 border-l-teal-300 dark:border-l-teal-700 hover:border-teal-300 dark:hover:border-teal-700",
  "bg-blue-50/20 dark:bg-blue-950/10 border-zinc-200 dark:border-zinc-700 border-l-4 border-l-blue-300 dark:border-l-blue-700 hover:border-blue-300 dark:hover:border-blue-700",
  "bg-zinc-50/35 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-700 border-l-4 border-l-zinc-300 dark:border-l-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-600",
  "bg-cyan-50/20 dark:bg-cyan-950/10 border-zinc-200 dark:border-zinc-700 border-l-4 border-l-cyan-300 dark:border-l-cyan-700 hover:border-cyan-300 dark:hover:border-cyan-700",
]

const getTagCardStyleClass = (tagNames?: string[]): string => {
  if (!tagNames?.length) return ""

  const normalizedTags = tagNames
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .sort()

  if (!normalizedTags.length) return ""

  const key = normalizedTags.join("|")
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return TAG_CARD_STYLES[hash % TAG_CARD_STYLES.length]
}

export default function CourseViewPage({
  params,
  serverCourse,
  serverContent,
  serverProfessors,
  serverTags,
}: {
  params: Promise<{ "slugg": string }>,
  serverCourse?: CourseNew | null,
  serverContent?: (Course_content_anon | Course_content_user)[],
  serverProfessors?: Professor[],
  serverTags?: Tag[],
}) {
  const router = useRouter()
  const courseId = use(params)["slugg"]
  const course = serverCourse || null
  const [content, setContent] = useState<(Course_content_anon | Course_content_user)[]>(serverContent || [])
  const professors = serverProfessors || []
  const [enhancedContent, setEnhancedContent] = useState<EnhancedContent[]>([])
  const [tags, setTags] = useState<Tag[]>(serverTags || [])
  const [search, setSearch] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"year" | "professor_name">("year")
  const [groupSortBy, setGroupSortBy] = useState<"title" | "date">("date")
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: EnhancedContent } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminApproving, setAdminApproving] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)
  const [adminRejecting, setAdminRejecting] = useState(false)
  const [downloadAllState, setDownloadAllState] = useState<Record<string, { progress: number, active: boolean, completed: number, total: number }>>({})
  const downloadAllControllers = useRef<Map<string, AbortController>>(new Map())
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const [sharing, setSharing] = useState(false)

  // Debounced interaction logging (Spring Boot API)
  const interactionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const recentInteractionKeys = useRef<Set<string>>(new Set())

  const logInteraction = useCallback(
    (message: string, contentId?: number, debounceMs: number = 5000) => {
      const courseNumericId = Number(courseId)
      if (!courseNumericId || Number.isNaN(courseNumericId)) return

      const key = `${courseNumericId}-${contentId ?? "course"}-${message}`

      const existing = interactionTimeouts.current.get(key)
      if (existing) {
        clearTimeout(existing)
      }

      const timeoutId = setTimeout(async () => {
        if (recentInteractionKeys.current.has(key)) {
          return
        }

        try {
          // We treat message as the primary semantic field.
          // Type is a coarse bucket so analytics can group by it if needed.
          let type: "VIEW" | "DOWNLOAD" | "PIN" | "UNPIN" = "VIEW"
          if (message.toLowerCase().includes("download")) {
            type = "DOWNLOAD"
          } else if (message.toLowerCase().includes("pin")) {
            type = "PIN"
          } else if (message.toLowerCase().includes("unpin")) {
            type = "UNPIN"
          }

          await apiCreateInteraction({
            courseId: courseNumericId,
            contentId,
            type,
            message,
          })

          recentInteractionKeys.current.add(key)

          setTimeout(() => {
            recentInteractionKeys.current.delete(key)
          }, 30000)
        } catch (error) {
          console.error("Error logging interaction via API:", error)
        } finally {
          interactionTimeouts.current.delete(key)
        }
      }, debounceMs)

      interactionTimeouts.current.set(key, timeoutId)
    },
    [courseId]
  )

  // Fetch recently viewed content for authenticated user from Spring Boot API
  const fetchRecentlyViewed = useCallback(async () => {
    try {
      const courseNumericId = Number(courseId)
      if (!courseNumericId || Number.isNaN(courseNumericId)) {
        setRecentlyViewed([])
        return
      }

      const interactions = await apiGetMyCourseInteractions(courseNumericId, 10)
      if (!interactions || interactions.length === 0) {
        setRecentlyViewed([])
        return
      }

      const seenContentIds = new Set<number>()
      const uniqueContentIds = interactions
        .map((interaction) => interaction.contentId)
        .filter((contentId): contentId is number => {
          if (contentId == null) return false
          if (seenContentIds.has(contentId)) return false
          seenContentIds.add(contentId)
          return true
        })

      if (!uniqueContentIds.length) {
        setRecentlyViewed([])
        return
      }

      const enhanced = uniqueContentIds
        .map((id) => enhancedContent.find((item) => item.id === id))
        .filter((item): item is EnhancedContent => !!item)

      setRecentlyViewed(enhanced)
    } catch (error) {
      console.error("Error fetching recently viewed content:", error)
      setRecentlyViewed([])
    }
  }, [courseId, enhancedContent])

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      interactionTimeouts.current.forEach((timeout) => {
        clearTimeout(timeout)
      })
      interactionTimeouts.current.clear()
      recentInteractionKeys.current.clear()

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

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return
    const handleClose = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      setContextMenu(null)
    }
    document.addEventListener('click', handleClose)
    document.addEventListener('contextmenu', handleClose)
    document.addEventListener('keydown', handleClose)
    return () => {
      document.removeEventListener('click', handleClose)
      document.removeEventListener('contextmenu', handleClose)
      document.removeEventListener('keydown', handleClose)
    }
  }, [contextMenu])

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
      const unit = diffMinutes === 1 ? 'minute' : 'minutes'
      return `${diffMinutes} ${unit} ago`
    } else if (diffHours < 24) {
      const hoursOnly = Math.floor(diffMinutes / 60)
      const unit = hoursOnly === 1 ? 'hour' : 'hours'
      return `${hoursOnly} ${unit} ago`
    } else if (diffDays < 7) {
      const unit = diffDays === 1 ? 'day' : 'days'
      return `${diffDays} ${unit} ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      const unit = weeks === 1 ? 'week' : 'weeks'
      return `${weeks} ${unit} ago`
    } else {
      const months = Math.floor(diffDays / 30)
      const unit = months === 1 ? 'month' : 'months'
      return `${months} ${unit} ago`
    }
  }

  const buildFilename = (item: EnhancedContent, contentType?: string | null) => {
    const safe = (item.title || 'file').replace(/[^a-z0-9\-_. ]/gi, '_')
    if(item.resource_url){
    const extension = item.resource_url.split('.').pop()?.toLowerCase()
    if (extension) {

      console.log("extension", safe + '.' + extension)
      return safe + '.' + extension
    }}
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
    if (type.includes('application/octet-stream')) return safe +'.'+ getContentUrl(item)?.split('.').pop()
    return safe
  }

  const downloadWithProgress = async (item: EnhancedContent) => {
    const url = getContentUrl(item)
    if (!item.id || !url){
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

      const res = await fetch(url, { signal: controller.signal })
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
        alert(`Failed to download file. ${e.message}`)
      }
    }
  }

  const handleDownloadClick = (item: EnhancedContent) => {
    if(item.professor_id==71){
      alert('No content available, uploading content will increase your aura.')
      return;
    }
    if(!getContentUrl(item) || !item.id){
      setRedirectTo(`/course/${courseId}`)
      setShowLoginDialog(true)
      return
    }
    if (item.id) {
      logInteraction("download", item.id)
    }
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
      getContentUrl(item) && 
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
    try {
      await apiGetMe()
    } catch {
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

  const getGroupKey = (item: EnhancedContent) => {
    const year = item.year ?? ''
    const semester = item.semester_display ?? ''
    const batch = item.batch ?? ''
    const professor = item.professor_name || 'Unknown'
    return `${year}*${semester}*${batch}*${professor}`
  }

  const sortGroupItems = (items: EnhancedContent[]): EnhancedContent[] => {
    if (items.length === 0) return items

    const hasCustomOrder = items.some((i) => i.order != null)
    const sorted = [...items]

    const sortByDate = (a: EnhancedContent, b: EnhancedContent) => {
      const aDate = a.updated_at || a.created_at || ''
      const bDate = b.updated_at || b.created_at || ''
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    }

    const sortByTitle = (a: EnhancedContent, b: EnhancedContent) => {
      return (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase())
    }

    if (hasCustomOrder) {
      sorted.sort((a, b) => {
        const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
        const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
        if (aOrder !== bOrder) return aOrder - bOrder
        return groupSortBy === "date" ? sortByDate(a, b) : sortByTitle(a, b)
      })
    } else {
      sorted.sort((a, b) => (groupSortBy === "date" ? sortByDate(a, b) : sortByTitle(a, b)))
    }

    return sorted
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
          semester_display: getSemesterDisplay(item.semester_number || 0),
          order: (item as any).order ?? null
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
        // Check if user is authenticated through backend session cookies
        let me: Awaited<ReturnType<typeof apiGetMe>> | null = null
        try {
          me = await apiGetMe()
        } catch {
          me = null
        }

        const isAuthenticated = !!me
        setCurrentUserId(me?.userId || (me?.id != null ? String(me.id) : null))

        // Log course view once per user/course (debounced via API)
        if (isAuthenticated) {
          logInteraction("COURSE_VIEW")
        }

        // Resolve role from backend /api/v1/me
        const role = (me?.role || "").toString().toUpperCase()
        setIsAdmin(role === "ADMIN" || role === "MODERATOR")

        // Fetch tags from backend API (fallback to server tags)
        try {
          const tagsData = await apiGetTags()
          const normalizedTags = (tagsData || [])
            .filter((tag) => tag.id != null && tag.name)
            .map((tag) => ({ id: tag.id!, name: tag.name! })) as Tag[]
          setTags(normalizedTags.length > 0 ? normalizedTags : (serverTags || []))
        } catch {
          setTags(serverTags || [])
        }

        // Fetch course content from Spring Boot API instead of Supabase view
        const courseNumericId = Number(courseId)
        if (!Number.isNaN(courseNumericId)) {
          try {
            const response = await apiGetCourseContentForCourse(courseNumericId)
            const dtoList = response.content ?? []
            const profMap = response.professors ?? {}

            if (dtoList.length > 0) {
              const mapped = dtoList.map((item) => {
                const prof =
                  item.professorId != null
                    ? profMap[String(item.professorId)] ?? null
                    : null

                return {
                  id: item.id ?? null,
                  course_id: courseNumericId,
                  professor_id: item.professorId ?? null,
                  uploaded_by_id: null,
                  year: item.year ?? null,
                  batch: item.batch ?? null,
                  semester_number: item.semesterNumber ?? null,
                  title: item.title ?? "",
                  resource_url: null,
                  r2_url: item.r2Url ?? null,
                  filetype: item.fileType ?? "",
                  created_at: null,
                  updated_at: null,
                  visible: item.visibility === "VISIBLE",
                  deleted: item.visibility === "DELETED",
                  prev_ptr: null,
                  tag_ids: (item.tags || [])
                    .map((tag) => tag.id ?? null)
                    .filter((id): id is number => id != null),
                  professor_name: prof?.name,
                  tag_names: (item.tags || [])
                    .map((tag) => tag.name?.trim() || "")
                    .filter((name): name is string => Boolean(name)),
                  semester_display:
                    item.semesterNumber != null
                      ? getSemesterDisplay(item.semesterNumber)
                      : undefined,
                  order: item.orderIndex ?? null,
                } as any
              })

              setContent(mapped as (Course_content_anon | Course_content_user)[])
            }
          } catch (e) {
            console.error("Error fetching course content from API:", e)
          }
        }
      } catch (error) {
        console.error("Error fetching client data:", error)
      }
    }

    fetchClientData()
  }, [courseId, serverContent, serverTags, logInteraction])

  // Check if course is pinned
  useEffect(() => {
    const checkPinnedStatus = async () => {
      try {
        const me = await apiGetMe()
        if (!me) {
          setIsPinned(false)
          return
        }

        const pinnedData = await apiGetPinnedCoursesMe()
        const courseNumericId = Number(courseId)
        if (Number.isNaN(courseNumericId)) {
          setIsPinned(false)
          return
        }

        setIsPinned((pinnedData || []).some((p) => p.courseId === courseNumericId))
      } catch (error) {
        // Not pinned or error, keep as false
        console.log(error)
        setIsPinned(false)
      }
    }

    checkPinnedStatus()
  }, [courseId])

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
      const me = await apiGetMe()
      if (!me) {
        setRedirectTo(`/course/${courseId}`)
        setShowLoginDialog(true)
        return
      }

      const courseNumericId = Number(courseId)
      if (!courseNumericId || Number.isNaN(courseNumericId)) return

      if (isPinned) {
        // Remove pin by pinned row id
        const pinnedRows = await apiGetPinnedCoursesMe()
        const pinnedRow = (pinnedRows || []).find((row) => row.courseId === courseNumericId)
        if (pinnedRow?.id != null) {
          await apiUnpinCourse(pinnedRow.id)
        }
        setIsPinned(false)
      } else {
        // Add pin
        await apiPinCourse(courseNumericId)
        setIsPinned(true)
      }
    } catch (error) {
      console.error("Error toggling pin:", error)
    }
  }

  // Handle add content navigation with auth check
  const handleAddContent = async () => {
    try {
      await apiGetMe()
    } catch (error) {
      console.error("Error checking auth for add content:", error)
      setRedirectTo(`/add-content/${courseId}`)
      setShowLoginDialog(true)
      return
    }

    try {
      setNavigatingTo(`Add Content`)
      setIsNavigating(true)
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

  // Compute filtered content before potential early return to keep hooks order consistent
  const filteredContent = sortGroupItems(enhancedContent.filter(item => {
    // Never show deleted content (API sets `deleted: true` when visibility === "DELETED")
    if ((item as any).deleted === true) return false

    const matchesSearch = 
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.professor_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.semester_display?.toLowerCase().includes(search.toLowerCase()) ||
      item.batch?.toLowerCase().includes(search.toLowerCase())

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => item.tag_names?.includes(tag))

    return matchesSearch && matchesTags
  }))

  // Group content by year, semester, batch, and professor
  const groupedContent = filteredContent.reduce((groups, item) => {
    const key = `${item.year}*${item.semester_display}*${item.batch}*${item.professor_name || 'Unknown'}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, EnhancedContent[]>)

  // Sort items within each group based on groupSortBy and optional order
  Object.keys(groupedContent).forEach(key => {
    groupedContent[key] = sortGroupItems(groupedContent[key])
  })

  // Expand all groups by default on first load (keeps user toggles afterward)
  useEffect(() => {
    if (!search && expandedGroups.size === 0 && filteredContent.length > 0) {
      const allKeys = new Set<string>()
      filteredContent.forEach((item) => {
        const key = `${item.year}*${item.semester_display}*${item.batch}*${item.professor_name || 'Unknown'}`
        allKeys.add(key)
      })
      setExpandedGroups(allKeys)
    }
  }, [filteredContent, search, expandedGroups.size])

  //bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a]
  if (!course && !serverCourse) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen transition-colors duration-500 p-4 sm:p-6"
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
    const url = getContentUrl(item)
    if (!url) {
      setRedirectTo(`/course/${courseId}`)
      setShowLoginDialog(true)
      return
    }
    // Log content view (debounced via API)
    if (item.id) {
      logInteraction("view_content", item.id)
    }
    
    // Check if content is hidden and user is admin - show admin popup
    if (item.visible === false && isAdmin) {
      setAdminPopupContent(item)
      setShowAdminPopup(true)
      return
    }
    
    if (isMobile || useNativeViewer) {
      console.log("Opening resource url:", item.filetype)

      setSelectedContent(item)
      setSelectedFileId(item.id)
      if (item.filetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || item.filetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || item.filetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || item.filetype === "application/wps-office.pptx") {
        setNavigatingTo("Office Viewer")
        setIsNavigating(true)
        window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}` , '_blank')
        setTimeout(() => setIsNavigating(false), 1500)
      } 
      else if (url && (url.toLowerCase().endsWith('.pptx') || url.toLowerCase().endsWith('.docx') || url.toLowerCase().endsWith('.xlsx'))) {
        setNavigatingTo("Office Viewer")
        setIsNavigating(true)
        window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}` , '_blank')
        setTimeout(() => setIsNavigating(false), 1500)
      }
      else if(item.filetype === ""){
        handleDownloadClick(item)
      }
      else {
        setNavigatingTo("Resource")
        setIsNavigating(true)
        window.open(url, '_blank')
        setTimeout(() => setIsNavigating(false), 1500)
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
    setContextMenu(null)
    setEditingContent(item as CourseContent)
    setEditDialogOpen(true)
  }

  const handleOpenInNewTab = (e: React.MouseEvent, item: EnhancedContent) => {
    e.stopPropagation()
    setContextMenu(null)
    const url = getContentUrl(item)
    if (url) {
      if (item.filetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || item.filetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || item.filetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`, '_blank')
      } else if (item.filetype === "") {
        handleDownloadClick(item)
      } else {
        window.open(url, '_blank')
      }
    }
  }

  const handleAdminDelete = async (e: React.MouseEvent, item: EnhancedContent) => {
    e.stopPropagation()
    setContextMenu(null)
    if (!isAdmin || !item.id) return

    try {
      await apiPatchCourseContentVisibility(item.id, "HIDDEN")

      setEnhancedContent(prev => prev.map(c => c.id === item.id ? { ...c, visible: false } : c))
      setContent(prev => prev.map(c => c.id === item.id ? { ...c, visible: false } : c))
    } catch (error) {
      console.error("Error hiding content:", error)
      alert("Failed to hide content")
    }
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
      if (!adminPopupContent.id) return
      await apiPatchCourseContentVisibility(adminPopupContent.id, "DELETED")

      if (adminPopupContent.id) {
        logInteraction("admin_deny", adminPopupContent.id)
      }

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

      // If this is a revision (has prev_ptr), mark the previous version invisible when we approve
      const prevPtr = (adminPopupContent as { prev_ptr?: number | null }).prev_ptr
      if (prevPtr != null) {
        await apiPatchCourseContentVisibility(prevPtr, "DELETED")
      }

      if (!adminPopupContent.id) return
      await apiPatchCourseContentVisibility(adminPopupContent.id, "VISIBLE")

      if (adminPopupContent.id) {
        logInteraction("admin_approve", adminPopupContent.id)
      }

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
      await apiGetMe()
      await apiCreateFeedback({
        feedback: feedbackText.trim(),
        rating: feedbackRating,
      })

      alert("Thank you for your feedback! We appreciate your input.")
      setFeedbackText("")
      setFeedbackRating(null)
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
      await apiGetMe()
      setShowFeedbackDialog(true)
    } catch (error) {
      console.error("Error checking auth for feedback:", error)
      setRedirectTo(`/course/${courseId}`)
      setShowLoginDialog(true)
    }
  }

  const handleShare = async () => {
    if (typeof window === "undefined") return
    if (sharing) return

    logInteraction("share")

    const shareUrl = window.location.href
    const shareTitle = (course || serverCourse)?.title || "Course page"
    const shareCount = enhancedContent.filter((item) => item.professor_id !== 71).length
    const shareText = [
      `📚 ${shareTitle}`,
      shareCount > 0
        ? `Found ${shareCount} resources here.`
        : "Found notes and resources here.",
      "",
      shareUrl,
    ].join("\n")

    try {
      setSharing(true)
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        return
      }

      await navigator.clipboard.writeText(shareText)
      alert("Share message copied. Paste it anywhere.")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      console.error("Share failed:", error)
      alert("Could not share right now. Please try again.")
    } finally {
      setSharing(false)
    }
  }

  const getEffectiveOrder = (item: EnhancedContent, fallbackIndex: number): number => {
    if (typeof item.order === "number" && Number.isFinite(item.order)) {
      return item.order
    }
    // Keep sparse spacing for easier midpoint inserts.
    return (fallbackIndex + 1) * 1000
  }

  const moveItemInGroup = async (item: EnhancedContent, direction: "up" | "down") => {
    if (!item.id) return
    const key = getGroupKey(item)

    const groupItems = enhancedContent.filter(
      (c) => getGroupKey(c) === key && c.professor_id !== 71
    )
    if (groupItems.length <= 1) return

    const working = sortGroupItems(groupItems)

    const currentIndex = working.findIndex((c) => c.id === item.id)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= working.length) return

    const reordered = [...working]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const prevNeighbor = newIndex > 0 ? reordered[newIndex - 1] : undefined
    const nextNeighbor = newIndex < reordered.length - 1 ? reordered[newIndex + 1] : undefined
    const prevId = prevNeighbor?.id ?? null
    const nextId = nextNeighbor?.id ?? null

    const prevOrder = prevNeighbor
      ? getEffectiveOrder(prevNeighbor, newIndex - 1)
      : undefined
    const nextOrder = nextNeighbor
      ? getEffectiveOrder(nextNeighbor, newIndex + 1)
      : undefined

    let optimisticOrder = getEffectiveOrder(item, currentIndex)
    if (prevOrder == null && nextOrder == null) {
      optimisticOrder = 1000
    } else if (prevOrder == null && nextOrder != null) {
      optimisticOrder = nextOrder - 1000
    } else if (prevOrder != null && nextOrder == null) {
      optimisticOrder = prevOrder + 1000
    } else if (prevOrder != null && nextOrder != null) {
      optimisticOrder = (prevOrder + nextOrder) / 2
    }

    setEnhancedContent((prev) =>
      prev.map((c) =>
        c.id === item.id
          ? { ...c, order: optimisticOrder }
          : c
      )
    )

    setContent((prev) =>
      prev.map((c) =>
        (c as any).id === item.id
          ? { ...(c as any), order: optimisticOrder }
          : c
      )
    )

    try {
      const updated = await apiReorderCourseContent(item.id, { prevId, nextId })
      if (typeof updated?.orderIndex === "number" && Number.isFinite(updated.orderIndex)) {
        setEnhancedContent((prev) =>
          prev.map((c) =>
            c.id === item.id
              ? { ...c, order: updated.orderIndex! }
              : c
          )
        )
        setContent((prev) =>
          prev.map((c) =>
            (c as any).id === item.id
              ? { ...(c as any), order: updated.orderIndex! }
              : c
          )
        )
      }
    } catch (error) {
      console.error("Error reordering content:", error)
    }
  }
  //bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] 

  return (
    <div className="min-h-screen dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 transition-colors duration-500 p-4 sm:p-6">
      {isNavigating && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="px-4 py-3 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-white/40 dark:border-white/10 shadow-2xl text-center"
          >
            <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Navigating to</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{navigatingTo || 'Destination'}</div>
            <div className="mt-2 flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-300">
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:120ms]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:240ms]"></div>
            </div>
          </motion.div>
        </div>
      )}

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
                onClick={() => { setNavigatingTo("Home"); setIsNavigating(true); router.push("/") }}
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
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight break-words">
                  {(course || serverCourse)?.title}
                </h1>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <AnnouncementsDrawer />
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Desktop: Horizontal layout */}
          <div className="hidden sm:flex items-center gap-4">
            <Button
              onClick={() => { setNavigatingTo("Home"); setIsNavigating(true); router.push("/") }}
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
            <div className="flex items-center gap-2 shrink-0">
              {!isMobile && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setUseNativeViewer(!useNativeViewer)}
                    className="hover:bg-white/50 dark:hover:bg-zinc-800/50 text-sm"
                  >
                    {useNativeViewer ? "Browser viewer" : "In-App viewer"}
                  </Button>
                  {!useNativeViewer && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-amber-600 dark:text-amber-400"
                      title="Having issues? Try the toggle"
                    >
                      •
                    </motion.span>
                  )}
                </>
              )}
              <AnnouncementsDrawer />
              <ThemeToggle />
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
              <span className="text-xs sm:text-sm text-white dark:text-white">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "year" | "professor_name")}
                className="bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-400 transition"
              >
                <option value="year">Year</option>
                <option value="professor_name">Instructor</option>
              </select>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs sm:text-sm text-white dark:text-white">Within group:</span>
              <select
                value={groupSortBy}
                onChange={(e) => setGroupSortBy(e.target.value as "title" | "date")}
                className="bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-400 transition"
              >
                <option value="title">Title</option>
                <option value="date">Date</option>
              </select>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xs sm:text-sm text-white dark:text-white">Reorder:</span>
                <Button
                  variant={reorderMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!currentUserId) {
                      setRedirectTo(`/course/${courseId}`)
                      setShowLoginDialog(true)
                      return
                    }
                    setReorderMode(!reorderMode)
                  }}
                  className="text-xs sm:text-sm px-2 py-1"
                >
                  {reorderMode ? "Done" : "Reorder"}
                </Button>
              </div>
            )}

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
                <p className="hidden sm:block text-sm text-zinc-600 dark:text-zinc-300 mb-3">
                  Right-click any resource for more options
                </p>
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
                        onContextMenu={(e) => {
                          e.preventDefault()
                          if (item.professor_id !== 71) setContextMenu({ x: e.clientX, y: e.clientY, item })
                        }}
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
                              {downloadState[item.id || -1]?.active && (
                                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                                  {downloadState[item.id || -1]?.progress ?? 0}%
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect()
                                  if (rect && item.professor_id !== 71) setContextMenu({ x: rect.left, y: rect.bottom + 4, item })
                                }}
                                className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-6 sm:w-6 sm:min-h-0 sm:min-w-0 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
                                title="Actions (or right-click)"
                              >
                                <MoreHorizontal className="h-4 w-4 sm:h-3 sm:w-3" />
                              </Button>
                              {reorderMode && item.professor_id !== 71 && (
                                <div className="flex flex-col ml-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      moveItemInGroup(item, "up")
                                    }}
                                    className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                  >
                                    <ChevronUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      moveItemInGroup(item, "down")
                                    }}
                                    className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                  >
                                    <ChevronDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                  </button>
                                </div>
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
            <>
              <p className="hidden sm:block text-sm text-zinc-600 dark:text-zinc-300 mb-3">
                Right-click any resource for more options
              </p>
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
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (item.professor_id !== 71) setContextMenu({ x: e.clientX, y: e.clientY, item })
                  }}
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
                        {downloadState[item.id || -1]?.active && (
                          <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                            {downloadState[item.id || -1]?.progress ?? 0}%
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect()
                            if (rect && item.professor_id !== 71) setContextMenu({ x: rect.left, y: rect.bottom + 4, item })
                          }}
                          className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-6 sm:w-6 sm:min-h-0 sm:min-w-0 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
                          title="Actions (or right-click)"
                        >
                          <MoreHorizontal className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                        {reorderMode && item.professor_id !== 71 && (
                          <div className="flex flex-col ml-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                moveItemInGroup(item, "up")
                              }}
                              className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                            >
                              <ChevronUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                moveItemInGroup(item, "down")
                              }}
                              className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                            >
                              <ChevronDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            </button>
                          </div>
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
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            </>
          ) : (
            // Grouped view when not searching
            <>
              {(Object.entries(groupedContent) as [string, EnhancedContent[]][]).map(([key, items]) => {
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
                  <div className="flex items-center gap-1 sm:gap-2 ml-2">
                    <p className="hidden sm:block text-sm text-zinc-600 dark:text-zinc-300">
                      🫵 you can add content too... just two clicks 👉
                    </p>
                  </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Download All Button */}
                      {items.filter(item => getContentUrl(item) && item.id && item.professor_id !== 71).length > 0 && (
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
                            try {
                              await apiGetMe()
                            } catch {
                              setRedirectTo(`/add-content/${courseId}?${params.toString()}`)
                              setShowLoginDialog(true)
                              return
                            }
                            setNavigatingTo("Add Content")
                            setIsNavigating(true)
                            router.push(`/add-content/${courseId}?${params.toString()}`)

                          } catch (error) {
                            console.error("Error navigating to add content:", error)
                            alert("Error navigating to add content: " + error)
                            setShowLoginDialog(true)
                          }
                        }}
                        className="hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 animate-pulse"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline text-xs font-medium uppercase tracking-wide">
                          Add content
                        </span>
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

                  {/* Desktop hint - within card cluster */}
                  

                  {/* Content Display */}
                  {isExpanded ? (
                    // Expanded Grid View
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map((item: EnhancedContent) => {
                        const itemTagNames = item.tag_names ?? []
                        const hasTags = itemTagNames.length > 0
                        const tagStyleClass = getTagCardStyleClass(itemTagNames)
                        if (typeof window !== "undefined") {
                          console.log("[card tags]", { id: item.id, title: item.title, tag_names: itemTagNames, tag_ids: (item as any).tag_ids })
                        }
                        return item.professor_id != 71 ? (
                        <div
                          key={item.id}
                          className={`group flex flex-col p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                            item.visible === false
                              ? "bg-white/30 dark:bg-zinc-800/30 border-zinc-300 dark:border-zinc-600 opacity-60 border-dashed"
                              : hasTags
                                ? tagStyleClass
                                : "bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                          }`}
                          onClick={() => handleContentClick(item)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setContextMenu({ x: e.clientX, y: e.clientY, item })
                          }}
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
                                {downloadState[item.id || -1]?.active && (
                                  <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                                    {downloadState[item.id || -1]?.progress ?? 0}%
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect()
                                    if (rect) setContextMenu({ x: rect.left, y: rect.bottom + 4, item })
                                  }}
                                  className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-6 sm:w-6 sm:min-h-0 sm:min-w-0 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
                                  title="Actions (or right-click)"
                                >
                                  <MoreHorizontal className="h-4 w-4 sm:h-3 sm:w-3" />
                                </Button>
                                {reorderMode && item.professor_id !== 71 && (
                                  <div className="flex flex-col ml-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        moveItemInGroup(item, "up")
                                      }}
                                      className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                    >
                                      <ChevronUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        moveItemInGroup(item, "down")
                                      }}
                                      className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                    >
                                      <ChevronDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                    </button>
                                  </div>
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
                        </div> ) : ( <div
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
                      ) })
                    }
                    </div>
                  ) : (
                    // Collapsed Horizontal Scroll View
                    <div className="overflow-x-auto">
                      <div className="flex gap-4 pb-2 min-w-min">
                        {displayItems.map((item: EnhancedContent) => {
                          const itemTagNames = item.tag_names ?? []
                          const hasTags = itemTagNames.length > 0
                          const tagStyleClass = getTagCardStyleClass(itemTagNames)
                          return item.professor_id!=71?
                          <div
                            key={item.id}
                            className={`group flex flex-col w-52 sm:w-64 flex-shrink-0 p-2 sm:p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                              item.visible === false
                                ? "bg-white/30 dark:bg-zinc-800/30 border-zinc-300 dark:border-zinc-600 opacity-60 border-dashed"
                                : hasTags
                                  ? tagStyleClass
                                  : "bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                            }`}
                            onClick={() => handleContentClick(item)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setContextMenu({ x: e.clientX, y: e.clientY, item })
                            }}
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
                                  {downloadState[item.id || -1]?.active && (
                                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                                      {downloadState[item.id || -1]?.progress ?? 0}%
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const rect = (e.target as HTMLElement).closest('button')?.getBoundingClientRect()
                                      if (rect) setContextMenu({ x: rect.left, y: rect.bottom + 4, item })
                                    }}
                                    className="h-10 w-10 min-h-[44px] min-w-[44px] sm:h-6 sm:w-6 sm:min-h-0 sm:min-w-0 p-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"
                                    title="Actions (or right-click)"
                                  >
                                    <MoreHorizontal className="h-4 w-4 sm:h-3 sm:w-3" />
                                  </Button>
                                  {reorderMode && item.professor_id !== 71 && (
                                    <div className="flex flex-col ml-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          moveItemInGroup(item, "up")
                                        }}
                                        className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                      >
                                        <ChevronUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          moveItemInGroup(item, "down")
                                        }}
                                        className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                                      >
                                        <ChevronDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                      </button>
                                    </div>
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
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
              {/* Encourage-upload empty group (after existing groups) */}
              <div className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Add new class!
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddContent}
                    className="hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 animate-pulse"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Upload content</span>
                  </Button>
                </div>
                <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    You can add content to this page in just two clicks. If you like using this site, please upload content 🙏 
                  </p>
                  <p>
                    Prefer privacy? Toggle <span className="font-medium text-zinc-800 dark:text-zinc-200">Anonymous</span> on the upload form.
                  </p>
                </div>
              </div>
            </>
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
                  .filter(item => item.title && getContentUrl(item) && item.year && item.semester_display && item.id)
                  .map(item => ({
                    id: item.id!.toString(),
                    title: item.title!,
                    filetype: item.filetype!,
                    resource_url: getContentUrl(item)!,
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
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-4"
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
              onClick={handleShare}
              disabled={sharing}
              className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-full sm:px-4 sm:py-2 flex items-center justify-center ring-1 ring-white/30 dark:ring-white/10"
            >
              <Share2 className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">{sharing ? "Sharing..." : "Share"}</span>
            </Button>

          </motion.div>
          <Button
            onClick={handleAddContent}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-full sm:px-4 sm:py-2 flex items-center justify-center ring-1 ring-white/30 dark:ring-white/10 animate-pulse"
          >
            <Plus className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Add Content</span>
          </Button>
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
                  router.push(`/nextlogin?redirect=${encodeURIComponent(redirectTo)}`)
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
              >
                Fine, I&apos;ll Login 
              </Button>
              
            </div>
          </DialogContent>
        </Dialog>

        {/* Content Context Menu (right-click or ⋮) */}
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={() => setContextMenu(null)}
            />
            <div
              className="fixed z-50 min-w-[10rem] rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Date info */}
              <div className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800">
                {contextMenu.item.tag_names && contextMenu.item.tag_names.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {contextMenu.item.tag_names.map((tag: string, index: number) => (
                      <span
                        key={`${tag}-${index}`}
                        className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div>Uploaded: {formatUpdatedAt(contextMenu.item.created_at as string | null) ?? '—'}</div>
                <div>Updated: {contextMenu.item.updated_at ? formatUpdatedAt(contextMenu.item.updated_at) : '—'}</div>
              </div>
              {currentUserId && (
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={(e) => handleEditClick(e, contextMenu.item)}
                >
                  <Edit className="h-4 w-4" />
                  Suggest edit
                </button>
              )}
              {(contextMenu.item as { r2_url?: string | null }).r2_url && (
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={(e) => {
                    e.stopPropagation()
                    setContextMenu(null)
                    const r2Url = (contextMenu.item as { r2_url?: string | null }).r2_url
                    if (r2Url) window.open(r2Url, '_blank')
                  }}
                >
                  <Layers className="h-4 w-4" />
                  Mirror (R2)
                </button>
              )}
              {getContentUrl(contextMenu.item) && (
                <>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={(e) => handleOpenInNewTab(e, contextMenu.item)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in new tab
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={(e) => {
                      e.stopPropagation()
                      setContextMenu(null)
                      handleDownloadClick(contextMenu.item)
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </>
              )}
              {isAdmin && (
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={(e) => handleAdminDelete(e, contextMenu.item)}
                >
                  <Trash2 className="h-4 w-4" />
                  Hide content
                </button>
              )}
            </div>
          </>
        )}

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
                  const url = adminPopupContent ? getContentUrl(adminPopupContent) : null
                  if (url) {
                    setNavigatingTo("Resource")
                    setIsNavigating(true)
                    window.open(url, '_blank')
                    setTimeout(() => setIsNavigating(false), 1500)
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
            
                Report a bug or Give Feedback
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
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Optional Rating</Label>
                <div className="flex items-center gap-1">
                  {[0,1,2,3,4].map((i) => {
                    const active = (feedbackRating ?? -1) >= i + 1
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFeedbackRating((feedbackRating ?? 0) === i + 1 ? null : i + 1)}
                        className="p-1 rounded hover:bg-amber-100/60 dark:hover:bg-amber-900/30"
                        aria-label={`Set rating to ${i+1}`}
                        disabled={feedbackSubmitting}
                      >
                        <Star className={`${active ? 'fill-amber-400 text-amber-500' : 'text-zinc-400 dark:text-zinc-600'} h-5 w-5`} />
                      </button>
                    )
                  })}
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{feedbackRating ?? 'No rating'}</span>
                </div>
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