import { Database } from "@/types/supabase";
import { BookOpen, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Command } from "cmdk";
type CourseNew = Database['public']['Tables']['coursenew']['Row']

export default function CourseSelectUpload({courses, open, setOpen}: {courses: CourseNew[], open:boolean, setOpen: (open: boolean) => void}) {
    const [search, setSearch] = useState("");
    const router = useRouter();
    console.log(open)
    return (
        <>
        
        
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
                        setOpen(false);
                        setSearch("");
                      }}
                      className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <X className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    </button>
                  </div>
                  <Command.Input
                    placeholder="Search courses..."
                    className="h-10 px-3 py-2 text-sm bg-transparent border-none outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
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
                            setOpen(false);
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
                    {courses.map((course) => (
                      <Command.Item
                        key={course.id}
                        value={`${course.title} ${course.code} ${course.abbreviation || ""}`}
                        onSelect={() => {
                          router.push(`/add-content/${course.id}`);
                          setOpen(false);
                          setSearch("");
                        }}
                        className="flex items-center px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-3 flex-shrink-0">
                          <BookOpen className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{course.title}</div>
                          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
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
           
        
        
        
        </>
    )
}