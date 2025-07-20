"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command } from "cmdk"
import { Search, BookOpen, ArrowRight, Plus, User, LogOut, Settings, ChevronDown, ChevronLeft, ChevronRight, Heart, ChevronUp } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { DialogTitle } from "@radix-ui/react-dialog"
import { Database } from "@/types/supabase"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User as SupabaseUser } from "@supabase/supabase-js"

type CourseNew = Database['public']['Tables']['coursenew']['Row']
type pinnedShit = Database['public']['Tables']['user_pinned_courses']['Row']
type logbook = Database['public']['Tables']['user_course_interaction']['Row']
const ITEMS_PER_PAGE = 12

export default function HomePage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [courses, setCourses] = useState<CourseNew[]>([])
  const [allCourses, setAllCourses] = useState<CourseNew[]>([]) // For search dialog
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCourses, setTotalCourses] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pinnedCourses, setPinnedCourses] = useState<CourseNew[]>([])
  const [pinnedCourseIds, setPinnedCourseIds] = useState<Set<number>>(new Set())
  const [showPinnedSection, setShowPinnedSection] = useState(true)
  const supabase = createClient()

  const totalPages = Math.ceil(totalCourses / ITEMS_PER_PAGE)

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

  // Fetch pinned courses for authenticated user
  const fetchPinnedCourses = async () => {
    if (!user) {
      setPinnedCourses([])
      setPinnedCourseIds(new Set())
      return
    }

    try {
      const { data: pinnedData } = await supabase
        .from("user_pinned_courses")
        .select(`
          course_id,
          coursenew (*)
        `)
        .eq("user_id", user.id)

      if (pinnedData) {
        const courses = pinnedData
          .map((item: any) => item.coursenew)
          .filter((course: any) => course !== null) as CourseNew[]
        
        setPinnedCourses(courses)
        setPinnedCourseIds(new Set(pinnedData.map((item: any) => item.course_id)))
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
          const courseToPin = courses.find(course => course.id === courseId) || 
                             allCourses.find(course => course.id === courseId)
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
    const fetchCourses = async () => {
      setLoading(true)
      
      // Get total count
      const { count } = await supabase
        .from("coursenew")
        .select("*", { count: 'exact', head: true })
      
      setTotalCourses(count || 0)

      // Get paginated data
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      
      const { data } = await supabase
        .from("coursenew")
        .select("*")
        .order('title')
        .range(from, to)
      
      setCourses(data || [])
      setLoading(false)
    }
    fetchCourses()
  }, [supabase, currentPage])

  // Fetch all courses for search functionality
  useEffect(() => {
    const fetchAllCourses = async () => {
      const { data } = await supabase
        .from("coursenew")
        .select("*")
        .order('title')
      setAllCourses(data || [])
    }
    fetchAllCourses()
  }, [supabase])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const filteredCourses = allCourses.filter((course) => {
    return course.title.toLowerCase().includes(search.toLowerCase()) ||
           course.code.toLowerCase().includes(search.toLowerCase()) ||
           (course.abbreviation && course.abbreviation.toLowerCase().includes(search.toLowerCase()))
  })

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto pt-10 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <BookOpen className="text-indigo-500 dark:text-indigo-300 h-6 w-6 sm:h-8 sm:w-8" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
              Course Hub
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
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
            </div>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="relative h-10 w-fit bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      {user.user_metadata?.avatar_url ? (
                        <div className="relative w-6 h-6 rounded-full overflow-hidden">
                          <Image
                            src={user.user_metadata.avatar_url}
                            alt="User avatar"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <User className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                      )}
                      <span className="text-sm">
                        Hi, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Sign in
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Course Count and Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCourses)} of {totalCourses} courses
            </div>
            <Button
              onClick={() => setOpen(true)}
              variant="outline"
              size="sm"
              className="sm:hidden bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <Search className="mr-2 h-4 w-4" />
              Search courses
            </Button>
          </div>
        </div>

        {/* Pinned Courses Section */}
        {user && pinnedCourses.length > 0 && (
          <div className="mb-8">
            <div 
              className="flex items-center gap-3 mb-4 cursor-pointer group"
              onClick={() => setShowPinnedSection(!showPinnedSection)}
            >
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Pinned Courses ({pinnedCourses.length})
              </h2>
              {showPinnedSection ? (
                <ChevronUp className="h-4 w-4 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
              )}
            </div>
            
            {showPinnedSection && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 p-4 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                {pinnedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white/90 dark:bg-zinc-900/90 rounded-lg p-4 border border-red-200 dark:border-red-700 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-red-300 dark:hover:border-red-600 transform hover:scale-[1.02] hover:-translate-y-1 relative"
                    onClick={() => router.push(`/course/${course.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-3">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors leading-tight mb-1 truncate">
                          {course.title}
                        </h3>
                        {course.abbreviation && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1 truncate">
                            {course.abbreviation}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 font-mono">
                          {course.code}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => togglePin(course.id, e)}
                          className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors z-10"
                        >
                          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                        </button>
                        <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-red-500 transition-all duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Course Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {loading ? (
            Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-zinc-900/80 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div>
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : (
            courses.filter(course => !pinnedCourseIds.has(course.id)).map((course) => (
              <div
                key={course.id}
                className="bg-white/80 dark:bg-zinc-900/80 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-indigo-300 dark:hover:border-indigo-600 transform hover:scale-[1.02] hover:-translate-y-1 relative"
                onClick={() => router.push(`/course/${course.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight mb-1 truncate">
                      {course.title}
                    </h3>
                    {course.abbreviation && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1 truncate">
                        {course.abbreviation}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 font-mono">
                      {course.code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {user && (
                      <button
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
                      </button>
                    )}
                    <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-indigo-500 transition-all duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <Button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="h-9 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            
            <div className="flex items-center gap-1">
              {/* First page */}
              {currentPage > 3 && (
                <>
                  <Button
                    onClick={() => goToPage(1)}
                    variant={1 === currentPage ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9"
                  >
                    1
                  </Button>
                  {currentPage > 4 && <span className="px-2 text-zinc-500">...</span>}
                </>
              )}
              
              {/* Current page and surrounding pages */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                if (page > totalPages) return null
                return (
                  <Button
                    key={page}
                    onClick={() => goToPage(page)}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9"
                  >
                    {page}
                  </Button>
                )
              })}
              
              {/* Last page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 text-zinc-500">...</span>}
                  <Button
                    onClick={() => goToPage(totalPages)}
                    variant={totalPages === currentPage ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
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
        {!loading && courses.length === 0 && (
          <div className="text-center py-12 col-span-full bg-white/30 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <BookOpen className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-4">
              No courses found.
            </p>
            <Button 
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={() => router.push('/create-course')}
            >
              Create your first course
            </Button>
          </div>
        )}

        {/* Create Course Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => router.push('/create-course')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-12 h-12 sm:w-auto sm:h-auto sm:rounded-md sm:px-4 sm:py-2 flex items-center justify-center"
          >
            <Plus className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Create Course</span>
          </Button>
        </div>
      </div>

      {/* Search Dialog */}
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
                  <Search className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mb-2 opacity-60" />
                  <p className="text-zinc-500 dark:text-zinc-400 mb-1">No courses found</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Try a different search term</p>
                </div>
              ) : (
                filteredCourses.map((course) => (
                  <Command.Item
                    key={course.id}
                    onSelect={() => {
                      router.push(`/course/${course.id}`);
                      setOpen(false);
                    }}
                    className="flex items-center px-3 py-3 text-sm rounded-lg cursor-pointer aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 transition-colors relative group"
                  >
                    <div className="flex items-center flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{course.title}</div>
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
                          {course.abbreviation && (
                            <span className="truncate">{course.abbreviation}</span>
                          )}
                          <span className="text-zinc-400 dark:text-zinc-500">•</span>
                          <span className="font-mono">{course.code}</span>
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
    </div>
  );
}

