"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Command } from "cmdk"
import { Search, BookOpen, ArrowRight, Plus, User, LogOut, Settings, ChevronDown, ChevronLeft, ChevronRight, Heart, Shield, X, FileText } from "lucide-react"
import BackgroundSelector from "@/components/background-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { DialogTitle } from "@radix-ui/react-dialog"
import { Database } from "@/types/supabase"
import { motion, AnimatePresence } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { User as SupabaseUser } from "@supabase/supabase-js"
import { SSGData } from "@/types/ssg"

type UserMeta = Database['public']['Tables']['user_meta']['Row']
type CourseNew = Database['public']['Tables']['coursenew']['Row']
//type pinnedShit = Database['public']['Tables']['user_pinned_courses']['Row']
//type logbook = Database['public']['Tables']['user_course_interaction']['Row']

// Add type for professor course data
type ProfessorCourse = {
  professor_id: number
  professor_name: string
  professor_email: string
  course_id: number
  course_title: string
  course_code: string
}

type GroupedProfessorCourses = {
  professor_id: number
  professor_name: string
  professor_email: string
  courses: Array<{
    course_id: number
    course_title: string
    course_code: string
  }>
}

const ITEMS_PER_PAGE = 16

// LocalStorage utility functions
const getLocalStorageItem = (key: string, defaultValue: any) => {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return defaultValue
  }
}

const setLocalStorageItem = (key: string, value: any) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error)
  }
}

interface HomePageProps {
  initialData: SSGData
}

export default function HomePage({ initialData }: HomePageProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [courseComboboxOpen, setCourseComboboxOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileActionOpen, setMobileActionOpen] = useState(false)
  const [courses, setCourses] = useState<CourseNew[]>(initialData.courses)
//  const [allCourses, setAllCourses] = useState<SafeCourseIndex[]>(initialData.allCourses) // For search dialog
const allCourses = initialData.allCourses
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  //const [totalCourses, setTotalCourses] = useState(initialData.totalCount)
  const totalCourses = initialData.totalCount
  const [loading, setLoading] = useState(false)
  const [pinnedCourses, setPinnedCourses] = useState<CourseNew[]>([])
  const [pinnedCourseIds, setPinnedCourseIds] = useState<Set<number>>(new Set())
  const [showPinnedSection, setShowPinnedSection] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [pendingContentCount, setPendingContentCount] = useState<number>(0)
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null);
  // Add new state for professor courses
  const [professorCourses, setProfessorCourses] = useState<GroupedProfessorCourses[]>(() => {
    // Group initial professor data
    const grouped = initialData.professorData?.reduce((acc: GroupedProfessorCourses[], item: any) => {
      const existingProf = acc.find(p => p.professor_id === item.professor_id)
      
      if (existingProf) {
        existingProf.courses.push({
          course_id: item.course_id,
          course_title: item.course_title,
          course_code: item.course_code
        })
      } else {
        acc.push({
          professor_id: item.professor_id,
          professor_name: item.professor_name,
          professor_email: item.professor_email,
          courses: [{
            course_id: item.course_id,
            course_title: item.course_title,
            course_code: item.course_code
          }]
        })
      }
      
      return acc
    }, []) || []
    return grouped
  })
  const [professorCoursesLoading, setProfessorCoursesLoading] = useState(false)
  const [expandedProfessors, setExpandedProfessors] = useState<Set<number>>(new Set())
  const [professorCurrentPage, setProfessorCurrentPage] = useState(1)
  //const [totalProfessorEntries, setTotalProfessorEntries] = useState(initialData.professorData?.length || 0)
  const totalProfessorEntries = initialData.professorData?.length || 0
  const [isNavigating, setIsNavigating] = useState(false)
  const [userMeta, setUserMeta] = useState<UserMeta | null>(null)
  const [formData, setFormData] = useState({
    full_name: "",
    batch: "",
    role: "",
    admin_request: false
  })

 console.log(userMeta, formData)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push("/")
        return
      }
      console.log("User found:", user)
      setUser(user)
      await fetchUserMeta(user.id, user)
    }

    getUser()
  }, [router, supabase])

  const fetchUserMeta = async (userId: string, user: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from("user_meta")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No entry found, create one
        console.log("No user_meta entry found, creating one...")
        await createUserMetaEntry(userId, user)
        return
      }

      if (error) {
        console.error("Error fetching user meta:", error)
        return
      }

      setUserMeta(data)
      setFormData({
        full_name: data.full_name || "",
        batch: data.batch || "",
        role: data.role || "",
        admin_request: data.admin_request || false
      })
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const createUserMetaEntry = async (userId: string, user: SupabaseUser) => {
    if (!user) {
        console.log("No user found")
        return
    }
    console.log("Creating user meta entry for user:", user)

    try {
      // Get user name from metadata or derive from email
      const fullName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'User'

      const newUserMeta = {
        user_id: userId,
        full_name: fullName,
        role: 'student',
        admin_request: false,
        profile_picture_url: user.user_metadata?.avatar_url || null,
        batch: null,
      }

      const { data, error } = await supabase
        .from("user_meta")
        .insert(newUserMeta)
        .select()
        .single()

      if (error) {
        console.error("Error creating user meta:", error)
        return
      }

      console.log("Created user_meta entry:", data)
      setUserMeta(data)
      setFormData({
        full_name: data.full_name || "",
        batch: data.batch || "",
        role: data.role || "",
        admin_request: data.admin_request || false
      })
    } catch (error) {
      console.error("Error creating user meta entry:", error)
    }
  }

  // Add view mode state (will be hydrated from localStorage after mount)
  const [viewMode, setViewMode] = useState<'list' | 'professor'>('list')

  const totalPages = Math.ceil(totalCourses / ITEMS_PER_PAGE)
  const totalProfessorPages = Math.ceil(totalProfessorEntries / ITEMS_PER_PAGE)

  const isAdmin = (role: string | null) => {
    if (!role) return false
    return role === 'admin' || role === 'moderator' || role === 'super_admin'
  }

  // Fetch user role from user_meta table
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_meta")
        .select("role")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Error fetching user role:", error)
        setUserRole(null)
        return
      }

      setUserRole(data?.role || null)
    } catch (error) {
      console.error("Error fetching user role:", error)
      setUserRole(null)
    } finally {
      setRoleLoading(false)
    }
  }

  // Fetch pending content count for admins
  const fetchPendingContentCount = async () => {
    if (!isAdmin(userRole)) {
      setPendingContentCount(0)
      return
    }

    try {
      const { count, error } = await supabase
        .from("course_contentnew")
        .select("*", { count: "exact", head: true })
        .eq("visible", false)
        .or("deleted.is.null,deleted.eq.false")

      if (error) {
        console.error("Error fetching pending content count:", error)
        setPendingContentCount(0)
        return
      }

      setPendingContentCount(count || 0)
    } catch (error) {
      console.error("Error fetching pending content count:", error)
      setPendingContentCount(0)
    } 
  }

  useEffect(() => {
    // Check for user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Fetch user role when user changes
  useEffect(() => {
    if (user) {
      setRoleLoading(true)
      fetchUserRole(user.id)
    } else {
      setUserRole(null)
      setRoleLoading(false)
    }
  }, [user, supabase])

  // Fetch pending content count when user role changes
  useEffect(() => {
    if (user && !roleLoading) {
      fetchPendingContentCount()
    } else if (!user) {
      setPendingContentCount(0)
    }
  }, [user, userRole, roleLoading, supabase])

  // Fetch pinned courses for authenticated user
  const fetchPinnedCourses = async () => {
    if (!user) {
      console.log("No user found, clearing pinned courses")
      setPinnedCourses([])
      setPinnedCourseIds(new Set())
      return
    }

    console.log("Fetching pinned courses for user:", user.id)

    try {
      // Use a simpler approach: get pinned course IDs first, then fetch the courses
      const { data: pinnedData, error: pinnedError } = await supabase
        .from("user_pinned_courses")
        .select("course_id")
        .eq("user_id", user.id)

      console.log("Pinned data response:", { pinnedData, pinnedError })

      if (pinnedError) {
        console.error("Supabase error fetching pinned courses:", pinnedError)
        return
      }

      if (pinnedData && pinnedData.length > 0) {
        const courseIds = pinnedData.map(item => item.course_id)
        
        // Fetch the actual course data
        const { data: coursesData, error: coursesError } = await supabase
          .from("coursenew")
          .select("*")
          .in("id", courseIds)

        if (coursesError) {
          console.error("Error fetching course details:", coursesError)
          return
        }

        console.log("Fetched pinned courses:", coursesData)
        
        setPinnedCourses(coursesData || [])
        setPinnedCourseIds(new Set(courseIds))
      } else {
        console.log("No pinned data returned")
        setPinnedCourses([])
        setPinnedCourseIds(new Set())
      }
    } catch (error) {
      console.error("Error fetching pinned courses:", error)
    }
  }

  // Toggle pin status for a course
  const togglePin = async (courseId: number, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent course navigation
    
    if (!user) return

    const isPinned = pinnedCourseIds.has(courseId)

    try {
      if (isPinned) {
        // Unpin the course
        const { error } = await supabase
          .from("user_pinned_courses")
          .delete()
          .eq("user_id", user.id)
          .eq("course_id", courseId)

        if (!error) {
          // Remove from pinned courses and add back to main courses
          const courseToUnpin = pinnedCourses.find(course => course.id === courseId)
          if (courseToUnpin) {
            setPinnedCourses(prev => prev.filter(course => course.id !== courseId))
            setPinnedCourseIds(prev => {
              const newSet = new Set(prev)
              newSet.delete(courseId)
              return newSet
            })
            // Add back to main courses list if it's not already there
            setCourses(prev => {
              const exists = prev.some(course => course.id === courseId)
              if (!exists) {
                return [...prev, courseToUnpin].sort((a, b) => a.title.localeCompare(b.title))
              }
              return prev
            })
          }
        }
      } else {
        // Pin the course
        const { error } = await supabase
          .from("user_pinned_courses")
          .insert({ user_id: user.id, course_id: courseId })

        if (!error) {
          // Find course in main courses and move to pinned
          const courseToPin = courses.find(course => course.id === courseId)
          if (courseToPin) {
            setPinnedCourses(prev => [...prev, courseToPin])
            setPinnedCourseIds(prev => new Set([...prev, courseId]))
            // Remove from main courses list
            setCourses(prev => prev.filter(course => course.id !== courseId))
          }
        }
      }
    } catch (error) {
      console.error("Error toggling pin:", error)
    }
  }

  useEffect(() => {
    fetchPinnedCourses()
  }, [user, supabase])
  useEffect(() => {
    if (courseComboboxOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [courseComboboxOpen]);

  // Add function to fetch professor courses
  const fetchProfessorCourses = async () => {
    setProfessorCoursesLoading(true)
    try {
      // Get paginated data
      const { data, error } = await supabase.rpc('professor_course_list', {
        limit_count: ITEMS_PER_PAGE,
        offset_count: (professorCurrentPage - 1) * ITEMS_PER_PAGE
      })

      if (error) {
        console.error("Error fetching professor courses:", error)
        return
      }

      // Group courses by professor
      const grouped = data?.reduce((acc: GroupedProfessorCourses[], item: ProfessorCourse) => {
        const existingProf = acc.find(p => p.professor_id === item.professor_id)
        
        if (existingProf) {
          existingProf.courses.push({
            course_id: item.course_id,
            course_title: item.course_title,
            course_code: item.course_code
          })
        } else {
          acc.push({
            professor_id: item.professor_id,
            professor_name: item.professor_name,
            professor_email: item.professor_email,
            courses: [{
              course_id: item.course_id,
              course_title: item.course_title,
              course_code: item.course_code
            }]
          })
        }
        
        return acc
      }, []) || []

      setProfessorCourses(grouped)
    } catch (error) {
      console.error("Error fetching professor courses:", error)
    } finally {
      setProfessorCoursesLoading(false)
    }
  }

  // Fetch professor courses on component mount
  useEffect(() => {
    fetchProfessorCourses()
  }, [supabase, professorCurrentPage])

  // Toggle professor section collapse
  const toggleProfessorCollapse = (professorId: number) => {
    setExpandedProfessors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(professorId)) {
        newSet.delete(professorId)
      } else {
        newSet.add(professorId)
      }
      return newSet
    })
  }

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true)
      
      // Get paginated data
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      
      const { data } = await supabase
        .from("coursenew")
        .select("*")
        .order('created_at', { ascending: false })
        .range(from, to)
      
      setCourses(data || [])
      setLoading(false)
    }
    fetchCourses()
  }, [supabase, currentPage])

  // All courses are already loaded from initial data, no need to fetch again

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      console.log("KEY PRESSED "+e.key )
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      if (e.key === "Escape" && mobileSearchOpen) {
        setMobileSearchOpen(false)
        setSearch("")
      }
      if (e.key === "Escape" && courseComboboxOpen) {
        setCourseComboboxOpen(false)
        setSearch("")
      }
      if (e.key === "Enter" ){
        inputRef.current?.blur();
        console.log("Enter pressed");
      }
      console.log(e.key);
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [mobileSearchOpen, courseComboboxOpen])

  const filteredCourses = allCourses.filter((course) => {
    return course.title.toLowerCase().includes(search.toLowerCase()) ||
           course.code.toLowerCase().includes(search.toLowerCase()) ||
           (course.abbreviation && course.abbreviation.toLowerCase().includes(search.toLowerCase()))
  })

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToProfessorPage = (page: number) => {
    setProfessorCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Save view mode to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      setLocalStorageItem('viewMode', viewMode)
    }
  }, [viewMode, mounted])

  // Save pinned section state to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      setLocalStorageItem('showPinnedSection', showPinnedSection)
    }
  }, [showPinnedSection, mounted])

  // Helper function to change view mode and reset pagination
  const changeViewMode = (newMode: 'list' | 'professor') => {
    setViewMode(newMode)
    if (newMode === 'list') {
      setProfessorCurrentPage(1) // Reset professor page when switching to list
    } else {
      setCurrentPage(1) // Reset course page when switching to professor
    }
  }

  // Handle course navigation with loading animation
  // Ctrl/Cmd+Click opens in new tab (background)
  const handleCourseNavigation = (courseId: string | number, e?: React.MouseEvent) => {
    const openInNewTab = e && (e.metaKey || e.ctrlKey)
    if (openInNewTab) {
      window.open(`/course/${courseId}`, '_blank', 'noopener,noreferrer')
      return
    }
    setIsNavigating(true)
    setTimeout(() => {
      router.push(`/course/${courseId}`)
    }, 10)
  }

  // Hydrate localStorage values after component mounts (client-side only)
  useEffect(() => {
    setMounted(true)
    
    // Load saved preferences from localStorage
    const savedViewMode = getLocalStorageItem('viewMode', 'list')
    const savedPinnedSection = getLocalStorageItem('showPinnedSection', true)
    
    setViewMode(savedViewMode)
    setShowPinnedSection(savedPinnedSection)
  }, [])

  return (
    <div className="min-h-screen dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 p-3 sm:p-4">
      {/* Navigation Loading Overlay */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen p-4 sm:p-6"
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
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto pt-10 sm:pt-6">
        <div className="flex  justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <BookOpen className="text-indigo-500 dark:text-indigo-300 h-6 w-6 sm:h-8 sm:w-8" />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
              NotesBhej
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Admin button and its placeholder */}
{/* {user && roleLoading && (
  // This placeholder reserves space while the role is loading, preventing layout shift.
  // It's styled to have the same dimensions as the final button.
  <div className="h-8 w-[60px] sm:h-10 sm:w-[110px] rounded-md" />
)} */}


            <div className="hidden sm:flex items-center gap-2">
              <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="relative w-full sm:w-auto bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-md hover:shadow-lg transition-all duration-200 text-zinc-800 dark:text-zinc-200 px-3 sm:px-4 py-2 h-10"
              >
                <div className="flex items-center justify-center">
                  <Search className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span>Quick Search</span>
                  <div className="hidden sm:flex ml-2 h-5 items-center justify-center rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    ⌘K
                  </div>
                </div>
              </Button>
              
              {/* Discrete Admin Reminder */}
              {user && isAdmin(userRole) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Button
                    onClick={() => router.push('/admin/content-moderation')}
                    variant="outline"
                    size="sm"
                    className="relative w-full sm:w-auto bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-md hover:shadow-lg transition-all duration-200 text-zinc-800 dark:text-zinc-200 px-3 sm:px-4 py-2 h-10"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium">Admin</span>
                      {pendingContentCount > 0 && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          {pendingContentCount}
                        </div>
                      )}
                    </div>
                  </Button>
                </motion.div>
              )}
            </div>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="relative h-8 sm:h-10 w-fit bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-2 sm:px-3"
                  >
                    <span className="flex items-center gap-1 sm:gap-2">
                      {user.user_metadata?.avatar_url ? (
                        <div className="relative w-4 h-4 sm:w-6 sm:h-6 rounded-full overflow-hidden">
                          <Image
                            src={user.user_metadata.avatar_url}
                            alt="User avatar"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 dark:text-zinc-400" />
                      )}
                    
                      
                      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/manage-contributions')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Manage contributions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  {/* Admin-only content moderation link */}
                  {!roleLoading && isAdmin(userRole) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/admin/content-moderation')}>
                        <Shield className="w-4 h-4 mr-2" />
                        Content Moderation
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await supabase.auth.signOut()
                      router.refresh()
                    }}
                    className="text-red-600 dark:text-red-400"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => router.push('/login')}
                className="relative h-8 sm:h-10 w-fit bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm px-2 sm:px-3"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  Sign in 
                </span>
              </Button>
            )}
            
            
            
            <BackgroundSelector />
            <ThemeToggle />
          </div>
        </div>

        {/* Notice Box */}
        <div className="mb-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 backdrop-blur px-4 py-3 sm:px-5 sm:py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300">
                <span className="font-medium"></span> If this page has helped you, please consider uploading content
              </p>
            </div>
          </div>
        </div>

        {/* Course Count and Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            
            <Button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              variant="outline"
              size="sm"
              className="sm:hidden bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 h-8 px-3 text-xs"
            >
              <Search className="mr-1 h-3 w-3" />
              Search
            </Button>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mr-1 sm:mr-2">View:</span>
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 sm:p-1">

                <button
                  onClick={() => changeViewMode('list')}
                  className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 inline" />
                  <span className="hidden xs:inline">List All</span>
                  <span className="inline xs:hidden">List</span>
                </button>
                <button
                  onClick={() => changeViewMode('professor')}
                  className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                    viewMode === 'professor'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 inline" />
                  <span className="hidden xs:inline">Sort by Prof</span>
                  <span className="inline xs:hidden">Prof</span>
                </button>
              </div>
              <span className="hidden sm:inline ml-3 text-[15px] sm:text-m text-zinc-700 dark:text-zinc-200">
                Ctrl/Cmd+click opens in new tab
              </span>
            </div>
            
            {/* Mobile Admin Reminder */}
            {user && isAdmin(userRole) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="sm:hidden"
              >
                <Button
                  onClick={() => router.push('/admin/content-moderation')}
                  variant="outline"
                  size="sm"
                  className="relative bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-200 text-zinc-700 dark:text-zinc-300 px-2 py-1 h-7"
                >
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    {pendingContentCount > 0 && (
                      <div className="flex items-center gap-1 px-1 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        {pendingContentCount}
                      </div>
                    )}
                  </div>
                </Button>
              </motion.div>
            )}
          </div>
          
          {/* Mobile Search Input */}
          {mobileSearchOpen && (
            <div className="sm:hidden mb-4 animate-in slide-in-from-top-2 duration-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-4 text-zinc-400" />
                
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  ref={inputRef}
                  className="w-full pl-10 pr-10 py-2 text-base border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
                
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-3 w-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                  </button>
                )}
              </div>
              {search && (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {filteredCourses.length} course{filteredCourses.length === 1 ? '' : 's'} found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Courses Section */}
        {user && (
          <div className="mb-2">
            <div 
              className="flex items-center gap-3 mb-4 cursor-pointer group"
              onClick={() => setShowPinnedSection(!showPinnedSection)}
            >
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              <h2 className="text-md font-semibold text-zinc-900 dark:text-zinc-100">
                Pinned Courses ({pinnedCourses.length})
              </h2>
              <motion.div
                animate={{ rotate: showPinnedSection ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
              </motion.div>
            </div>
            
            <AnimatePresence>
              {showPinnedSection && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-2 p-4 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    {pinnedCourses.length > 0 ? (
                      pinnedCourses.map((course, index) => (
                        <motion.div
                          key={course.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            duration: 0.2, 
                            delay: index * 0.03,
                            ease: "easeOut"
                          }}
                          whileHover={{ 
                            scale: 1.02, 
                            y: -2,
                            transition: { duration: 0.15 }
                          }}
                          className="bg-white/90 dark:bg-zinc-900/90 rounded-lg p-4 border border-red-200 dark:border-red-700 shadow-sm hover:shadow-lg cursor-pointer group hover:border-red-300 dark:hover:border-red-600 relative"
                          onClick={(e) => {
                            if (mobileSearchOpen) {
                              setMobileSearchOpen(false)
                              setSearch("")
                            }
                            handleCourseNavigation(course.id, e)
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-3">
                                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors leading-tight mb-1 truncate">
                            {course.title}
                          </h3>
                          {course.abbreviation && (
                            <p className="hidden sm:block text-sm text-zinc-600 dark:text-zinc-400 mb-1 truncate">
                              {course.abbreviation}
                            </p>
                          )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                onClick={(e) => togglePin(course.id, e)}
                                className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors z-10"
                              >
                                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                              </motion.button>
                              <motion.div
                                whileHover={{ x: 3 }}
                                transition={{ duration: 0.15 }}
                              >
                                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-red-500 transition-colors" />
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-8">
                        <Heart className="h-8 w-8 text-red-300 dark:text-red-600 mx-auto mb-2" />
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                          No pinned courses yet. Pin your favorite courses to see them here!
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}



        {/* Course Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">

        {/* Professor View */}
        {viewMode === 'professor' && (
          <div className="col-span-full">
            <AnimatePresence mode="wait">
              {professorCoursesLoading ? (
                <motion.div
                  key="professor-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center py-12"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ 
                        duration: 0.8, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                      className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full"
                    />
                    <span className="text-zinc-600 dark:text-zinc-400 text-sm">
                      Loading professors...
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="professor-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                                     {professorCourses.map((professor, index) => (
                     <motion.div
                       key={professor.professor_id}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ 
                         duration: 0.2, 
                         delay: index * 0.05,
                         ease: "easeOut"
                       }}
                       whileHover={{ 
                         scale: 1.01,
                         transition: { duration: 0.15 }
                       }}
                       className="bg-white/90 dark:bg-zinc-900/90 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm"
                     >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer group hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                        onClick={() => toggleProfessorCollapse(professor.professor_id)}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div 
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                            className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
                          >
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {professor.professor_name}
                            </h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {professor.professor_email}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500">
                              {professor.courses.length} course{professor.courses.length === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                        <motion.div 
                                                     animate={{ 
                             rotate: expandedProfessors.has(professor.professor_id) ? 180 : 0 
                           }}
                           transition={{ duration: 0.15 }}
                          className="flex items-center gap-2"
                        >
                          <ChevronDown className="h-4 w-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
                        </motion.div>
                      </div>
                      
                      <AnimatePresence>
                        {expandedProfessors.has(professor.professor_id) && (
                                                     <motion.div
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: "auto" }}
                             exit={{ opacity: 0, height: 0 }}
                             transition={{ duration: 0.2, ease: "easeInOut" }}
                             className="overflow-hidden"
                           >
                            <div className="px-4 pb-4">
                              <motion.div 
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                              >
                                                                 {professor.courses.map((course, courseIndex) => (
                                   <motion.div
                                     key={course.course_id}
                                     initial={{ opacity: 0, y: 8 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     transition={{ 
                                       duration: 0.2, 
                                       delay: courseIndex * 0.03,
                                       ease: "easeOut"
                                     }}
                                     whileHover={{ 
                                       scale: 1.01, 
                                       y: -1,
                                       transition: { duration: 0.15 }
                                     }}
                                    className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md cursor-pointer group hover:border-blue-300 dark:hover:border-blue-600"
                                    onClick={(e) => handleCourseNavigation(course.course_id, e)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0 pr-2">
                                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight mb-1 truncate text-sm">
                                          {course.course_title}
                                        </h4>
                                      </div>
                                                                             <motion.div
                                         whileHover={{ x: 2 }}
                                         transition={{ duration: 0.15 }}
                                       >
                                        <ArrowRight className="h-3 w-3 text-zinc-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                                      </motion.div>
                                    </div>
                                  </motion.div>
                                ))}
                              </motion.div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Regular Course Grid */}
        {viewMode === 'list' && (
          <>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="col-span-full"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: i * 0.02,
                        ease: "easeOut"
                      }}
                      className="bg-white/80 dark:bg-zinc-900/80 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 animate-pulse" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="col-span-full"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {(search && mobileSearchOpen ? filteredCourses : courses)
                    .filter(course => !pinnedCourseIds.has(course.id))
                    .map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: index * 0.02,
                        ease: "easeOut"
                      }}
                      whileHover={{ 
                        scale: 1.01, 
                        y: -2,
                        transition: { duration: 0.15 }
                      }}
                      className="bg-white/80 dark:bg-zinc-900/80 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg cursor-pointer group hover:border-indigo-300 dark:hover:border-indigo-600 relative"
                      onClick={(e) => {
                        if (mobileSearchOpen) {
                          setMobileSearchOpen(false)
                          setSearch("")
                        }
                        handleCourseNavigation(course.id, e)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight mb-1 truncate">
                            {course.title}
                          </h3>
                          {course.abbreviation && (
                            <p className="hidden sm:block text-sm text-zinc-600 dark:text-zinc-400 mb-1 truncate">
                              {course.abbreviation}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {user && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              transition={{ duration: 0.1 }}
                              onClick={(e) => togglePin(course.id, e)}
                              className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors z-10"
                            >
                              <Heart 
                                className={`h-4 w-4 transition-colors ${
                                  pinnedCourseIds.has(course.id) 
                                    ? "text-red-500 fill-red-500" 
                                    : "text-zinc-400 hover:text-red-400"
                                }`} 
                              />
                            </motion.button>
                          )}
                          <motion.div
                            whileHover={{ x: 3 }}
                            transition={{ duration: 0.15 }}
                          >
                            <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </>
        )}
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {viewMode === 'list' 
                ? `Showing ${((currentPage - 1) * ITEMS_PER_PAGE) + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, totalCourses)} of ${totalCourses} courses`
                : `Showing ${((professorCurrentPage - 1) * ITEMS_PER_PAGE) + 1}-${Math.min(professorCurrentPage * ITEMS_PER_PAGE, totalProfessorEntries)} of ${totalProfessorEntries} professor entries`
              }
            </div>

        {/* Pagination */}
        {((viewMode === 'list' && totalPages > 1 && !(search && mobileSearchOpen)) || 
          (viewMode === 'professor' && totalProfessorPages > 1)) && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <Button
              onClick={() => viewMode === 'list' ? goToPage(currentPage - 1) : goToProfessorPage(professorCurrentPage - 1)}
              disabled={viewMode === 'list' ? currentPage === 1 : professorCurrentPage === 1}
              variant="outline"
              size="sm"
              className="h-9 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            
            <div className="flex items-center gap-1">
              {/* First page */}
              {(viewMode === 'list' ? currentPage : professorCurrentPage) > 3 && (
                <>
                  <Button
                    onClick={() => viewMode === 'list' ? goToPage(1) : goToProfessorPage(1)}
                    variant={1 === (viewMode === 'list' ? currentPage : professorCurrentPage) ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9"
                  >
                    1
                  </Button>
                  {(viewMode === 'list' ? currentPage : professorCurrentPage) > 4 && <span className="px-2 text-zinc-500">...</span>}
                </>
              )}
              
              {/* Current page and surrounding pages */}
              {Array.from({ length: Math.min(5, viewMode === 'list' ? totalPages : totalProfessorPages) }, (_, i) => {
                const activePage = viewMode === 'list' ? currentPage : professorCurrentPage
                const maxPages = viewMode === 'list' ? totalPages : totalProfessorPages
                const page = Math.max(1, Math.min(maxPages - 4, activePage - 2)) + i
                if (page > maxPages) return null
                return (
                  <Button
                    key={page}
                    onClick={() => viewMode === 'list' ? goToPage(page) : goToProfessorPage(page)}
                    variant={page === activePage ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9"
                  >
                    {page}
                  </Button>
                )
              })}
              
              {/* Last page */}
              {(viewMode === 'list' ? currentPage : professorCurrentPage) < (viewMode === 'list' ? totalPages : totalProfessorPages) - 2 && (
                <>
                  {(viewMode === 'list' ? currentPage : professorCurrentPage) < (viewMode === 'list' ? totalPages : totalProfessorPages) - 3 && <span className="px-2 text-zinc-500">...</span>}
                  <Button
                    onClick={() => {
                      const lastPage = viewMode === 'list' ? totalPages : totalProfessorPages
                      return viewMode === 'list' ? goToPage(lastPage) : goToProfessorPage(lastPage)
                    }}
                    variant={(viewMode === 'list' ? totalPages : totalProfessorPages) === (viewMode === 'list' ? currentPage : professorCurrentPage) ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9"
                  >
                    {viewMode === 'list' ? totalPages : totalProfessorPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              onClick={() => viewMode === 'list' ? goToPage(currentPage + 1) : goToProfessorPage(professorCurrentPage + 1)}
              disabled={viewMode === 'list' ? currentPage === totalPages : professorCurrentPage === totalProfessorPages}
              variant="outline"
              size="sm"
              className="h-9 px-3"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Empty State */}
        {viewMode === 'list' && !loading && (
          (search && mobileSearchOpen ? filteredCourses : courses)
            .filter(course => !pinnedCourseIds.has(course.id)).length === 0
        ) && (
          <div className="text-center py-12 col-span-full bg-white/30 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <BookOpen className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-4">
              {search && mobileSearchOpen ? 'No courses found matching your search.' : 'No courses found.'}
            </p>
            {!(search && mobileSearchOpen) && (
              <Button 
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
                onClick={() => router.push('/create-course')}
              >
                Create your first course
              </Button>
            )}
          </div>
        )}

        {/* Create Course Button */}
        <div className="fixed bottom-6 right-6">
          <DropdownMenu open={mobileActionOpen} onOpenChange={setMobileActionOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-md sm:px-4 sm:py-2 flex items-center justify-center"
              >
                <Plus className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              side="top" 
              className="w-56 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl"
            >
              <DropdownMenuItem 
                onClick={() => {
                  setMobileActionOpen(false)
                  router.push('/create-course')
                }}
                className="cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-3 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="font-medium">Create Course</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Start a new course from scratch</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setMobileActionOpen(false)
                  setCourseComboboxOpen(true)
                }}
                className="cursor-pointer"
              >
                <BookOpen className="w-4 h-4 mr-3 text-green-600 dark:text-green-400" />
                <div>
                  <div className="font-medium">Upload Content</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Add content to existing course</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Course Selection for Quick Search */}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        className="fixed inset-0 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      >
        <DialogTitle className="sr-only">Search Courses</DialogTitle>
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
          <Command className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-white/10 transition-all duration-200">
            <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <Search className="h-5 w-5 text-zinc-500 dark:text-zinc-400 mr-2 flex-shrink-0" />
              <Command.Input
                placeholder="Search courses..."
                value={search}
                onValueChange={setSearch}
                className="flex-1 bg-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
              />
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                ESC
              </kbd>
            </div>
            
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              {filteredCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <Search className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mb-3 opacity-60" />
                  <p className="text-zinc-500 dark:text-zinc-400 mb-1">No courses found{search && ` for "${search}"`}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">Try a different search term</p>
                  {search && (
                    <Button
                      onClick={() => {
                        router.push(`/create-course?name=${encodeURIComponent(search)}`);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create &quot;{search}&quot; course
                    </Button>
                  )}
                </div>
              ) : (
                filteredCourses.map((course) => (
                  <Command.Item
                    key={course.id}
                    onSelect={() => {
                      setOpen(false);
                      handleCourseNavigation(course.id)
                    }}
                    className="flex items-center px-3 py-3 text-sm rounded-lg cursor-pointer aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 transition-colors relative group"
                  >
                    <div className="flex items-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{course.title}</div>
                        <div className="hidden sm:flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                          {course.abbreviation && (
                            <span className="truncate">{course.abbreviation}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Command.Item>
                ))
              )}
            </Command.List>
            
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center justify-between">
                <div>
                  {filteredCourses.length} course{filteredCourses.length === 1 ? '' : 's'} found
                </div>
                <div className="flex items-center gap-1">
                  <span>Navigate</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">↑↓</kbd>
                  <span>Select</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">↵</kbd>
                </div>
              </div>
            </div>
          </Command>
        </div>
      </Command.Dialog>

      {/* Course Selection Combobox for Upload Content */}
      {courseComboboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-lg overflow-hidden">
            <Command className="rounded-lg">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3 py-3 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 text-zinc-500 dark:text-zinc-400 mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Select Course to Upload Content</span>
                </div>
                <button
                  onClick={() => {
                    setCourseComboboxOpen(false);
                    setSearch("");
                  }}
                  className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <X className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                </button>
              </div>
              <Command.Input
                placeholder="Search courses..."
                className="h-10 px-3 py-2 text-base bg-transparent border-none outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                value={search}
                onValueChange={setSearch}
              />
              <Command.List className="max-h-64 overflow-y-auto p-1">
                <Command.Empty className="py-6 text-center">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                    No courses found{search && ` for "${search}"`}.
                  </div>
                  {search && (
                    <Button
                      onClick={() => {
                        router.push(`/create-course?name=${encodeURIComponent(search)}`);
                        setCourseComboboxOpen(false);
                        setSearch("");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create 
                      &quot;{search}&quot; course
                    </Button>
                  )}
                </Command.Empty>
                {allCourses.map((course) => (
                  <Command.Item
                    key={course.id}
                    value={`${course.title} ${course.code} ${course.abbreviation || ""}`}
                    onSelect={() => {
                      router.push(`/add-content/${course.id}`);
                      setCourseComboboxOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0">
                      <BookOpen className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{course.title}</div>
                      <div className="hidden sm:flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
                        {course.abbreviation && (
                          <span className="truncate">{course.abbreviation}</span>
                        )}
                      </div>
                    </div>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
                 </div>
       )}
    </div>
  );
}

