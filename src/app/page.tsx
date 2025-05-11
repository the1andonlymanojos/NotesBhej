"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command } from "cmdk"
import { Search, BookOpen, Tag, Download, ArrowRight, FileText, Plus } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { DialogTitle } from "@radix-ui/react-dialog"

export default function HomePage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [courses, setCourses] = useState<any[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("course")
        .select("*, course_content(*)")
      setCourses(data || [])
      
      // Extract unique tags from all course content
      const tags = new Set<string>()
      data?.forEach(course => {
        course.course_content?.forEach((content: any) => {
          content.tags?.forEach((tag: string) => tags.add(tag))
        })
      })
      setAvailableTags(Array.from(tags))
    }
    fetchCourses()
  }, [])

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
      course.course_content?.some((content: any) => 
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
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>
  
      <div className="max-w-7xl mx-auto pt-10 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <BookOpen className="text-indigo-500 dark:text-indigo-300 h-6 w-6 sm:h-8 sm:w-8" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
              Course Content Hub
            </h1>
          </div>
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
                <Button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click when clicking the button
                    router.push(`/add-content/${course.id}`);
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 flex-shrink-0"
                  aria-label="Add Content"
                >
                  <Plus className="h-3.5 w-3.5 sm:hidden" />
                  <span className="hidden sm:inline">Add Content</span>
                </Button>
              </div>
  
              {course.course_content?.length > 0 ? (
                <div className="space-y-2 max-h-[250px] sm:max-h-[300px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-700 scrollbar-track-transparent">
                  {course.course_content.map((content: any) => (
                    <div
                      key={content.id}
                      className="flex items-center justify-between p-2 bg-white/50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-zinc-900 dark:text-zinc-100 font-medium truncate mr-1">
                            {content.year} - {content.semester}
                          </p>
                          {content.instructor && (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate hidden sm:inline">
                              • {content.instructor}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {content.tags?.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <a
                        href={content.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors ml-2 flex-shrink-0"
                        aria-label="Download resource"
                      >
                        <Download size={16} />
                        <span className="text-xs hidden sm:inline">Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
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

