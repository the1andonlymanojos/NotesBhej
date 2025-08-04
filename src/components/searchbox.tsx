import { Command } from "cmdk";
import { DialogTitle } from "@radix-ui/react-dialog"
import { Search, BookOpen, ArrowRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Database } from "@/types/supabase";

type CourseNew = Database['public']['Tables']['coursenew']['Row']

export default function SearchBox({courses, open, setOpen}: {courses: CourseNew[], open:boolean, setOpen: (open: boolean) => void}) {
    
    const [search, setSearch] = useState("");
    const router = useRouter();
    const filteredCourses = courses.filter((course) => {
        const titleMatch = course.title.toLowerCase().includes(search.toLowerCase());
        const abbreviationMatch = course.abbreviation?.toLowerCase().includes(search.toLowerCase());
        return titleMatch || abbreviationMatch;
    });
    const handleCourseNavigation = (courseId: number) => {
        router.push(`/course/${courseId}`);
    }
    return (
       <>
       
       
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
                            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
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
    
       
       
       </>
    )
}