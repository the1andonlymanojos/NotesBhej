import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Calendar, ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Skeleton } from "@/components/ui/skeleton"


export default function CourseSkeleton() {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4 sm:p-6">
        <div className="fixed top-4 right-4 z-10">
          <ThemeToggle />
        </div>
  
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              className="hover:bg-white/50 dark:hover:bg-zinc-800/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Loading Course...
              </h1>
            </div>
          </div>
  
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <Input
                placeholder="Search content..."
                className="pl-10 border-2 border-indigo-200 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-400 transition"
                disabled
              />
            </div>
  
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Sort by:</span>
                <select
                  className="bg-white dark:bg-zinc-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 transition"
                  disabled
                >
                  <option>Year</option>
                </select>
              </div>
            </div>
          </div>
  
          {/* Content Grid Skeleton */}
          <div className="space-y-6">
            {[1, 2].map((group) => (
              <div
                key={group}
                className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <Skeleton className="h-6 w-32" />
                </div>
  
                <div className="overflow-x-auto">
                  <div className="flex gap-4 pb-2 min-w-min">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="flex flex-col w-64 flex-shrink-0 p-3 bg-white/50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
                      >
                        <Skeleton className="h-5 w-48 mb-2" />
                        <div className="flex flex-wrap gap-2">
                          <Skeleton className="h-4 w-16 rounded-full" />
                          <Skeleton className="h-4 w-16 rounded-full" />
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
  