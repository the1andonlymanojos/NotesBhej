"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command } from "cmdk"
import { Search, BookOpen, Tag, ArrowRight, FileText, Plus, User, LogOut, Settings, ChevronDown } from "lucide-react"
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
type Course = Database['public']['Tables']['course']['Row'] & {
  course_content?: CourseContent[]
}
type CourseContent = Database['public']['Tables']['course_content']['Row']

export default function HomePage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const supabase = createClient()

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

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("course")
        .select("*, course_content(*)")
      setCourses(data || [])
      
      // Extract unique tags from all course content
      const tags = new Set<string>()
      data?.forEach(course => {
        course.course_content?.forEach((content: CourseContent) => {
          content.tags?.forEach((tag: string) => tags.add(tag))
        })
      })
      setAvailableTags(Array.from(tags))
    }
    fetchCourses()
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

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = 
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.code.toLowerCase().includes(search.toLowerCase())
    
    const matchesTags = selectedTags.length === 0 || 
      course.course_content?.some((content: CourseContent) => 
        selectedTags.every(tag => content.tags?.includes(tag))
      )

    return matchesSearch && matchesTags
  })

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-3 sm:p-4">
     
  
      <div className="max-w-7xl mx-auto pt-10 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <BookOpen className="text-indigo-500 dark:text-indigo-300 h-6 w-6 sm:h-8 sm:w-8" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
              Course Content Hub
            </h1>
          </div><div className="flex items-center gap-2">
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
              <span className="absolute inset-0 rounded-md ring-0 focus-within:ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" />
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
  
        <div className="mb-6 sm:mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            />
          </div>
  
          <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400 self-center mr-1">Filter:</span>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm transition-colors ${
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
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-3 sm:p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => router.push(`/course/${course.id}`)}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {course.code} - {course.title}
                  </h2>
                  <div className="flex items-center mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    <span>{course.course_content?.length || 0} resources</span>
                    {course.description && (
                      <span className="ml-2 truncate text-xs opacity-75" title={course.description}>
                        • {course.description.substring(0, 30)}{course.description.length > 30 ? '...' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {/* Show unique tags */}
                {(() => {
                  const uniqueTags = new Set<string>();
                  course.course_content?.forEach((content: CourseContent) => {
                    content.tags?.forEach((tag: string) => uniqueTags.add(tag));
                  });
                  return uniqueTags.size > 0 ? (
                    <div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center">
                        <Tag className="h-3.5 w-3.5 mr-1" />
                        Tags
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(uniqueTags).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Show unique professors */}
                {(() => {
                  const uniqueProfessors = new Set<string>();
                  course.course_content?.forEach((content: CourseContent) => {
                    if (content.instructor) uniqueProfessors.add(content.instructor);
                  });
                  return uniqueProfessors.size > 0 ? (
                    <div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center">
                        <BookOpen className="h-3.5 w-3.5 mr-1" />
                        Professors
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(uniqueProfessors).map((professor) => (
                          <span
                            key={professor}
                            className="px-2 py-1 text-xs bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 rounded-full"
                          >
                            {professor}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {(!course.course_content || course.course_content.length === 0) && (
                <div className="py-6 text-center text-zinc-500 dark:text-zinc-400 text-sm italic bg-zinc-50 dark:bg-zinc-800/30 rounded-lg">
                  No content available yet
                </div>
              )}
            </div>
          ))}
  
          {filteredCourses.length === 0 && (
            <div className="text-center py-12 col-span-full bg-white/30 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg">
                No courses found matching your criteria.
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
  
        {/* Add a Create New Course button for administrators */}
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
          className="flex-1 bg-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-white-900"
        />
        <div className="flex items-center gap-1">
          <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            ESC
          </kbd>
        </div>
      </div>
      
      <Command.List className="max-h-[min(70vh,400px)] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
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
                router.push(`/add-content/${course.id}`);
                setOpen(false);
              }}
              className="flex items-center px-3 py-2.5 text-sm rounded-lg cursor-pointer aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 transition-colors relative group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{course.code}</span>
                  <p className="text-zinc-500 dark:text-zinc-400 line-clamp-1 text-xs mt-0.5">
                    {course.title}
                  </p>
                </div>
              </div>
              <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              </div>
            </Command.Item>
          ))
        )}
      </Command.List>
      
      <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center justify-between">
          <div>
            {filteredCourses.length} course{filteredCourses.length === 1 ? '' : 's'} found
          </div>
          <div className="flex items-center">
            <span className="mr-1">Navigate</span>
            <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mx-1">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mx-1">↓</kbd>
            <span className="mx-1">Select</span>
            <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 ml-1">↵</kbd>
          </div>
        </div>
      </div>
    </Command>
  </div>
</Command.Dialog>
    </div>
  );
}

