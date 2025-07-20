"use client"

import { useState, useEffect } from "react"
import { FileText, X, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import PDFViewerComponent from "./pdf-viewer-component"
import { useHover } from "@uidotdev/usehooks"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface PDFViewerProps {
  files: Array<{
    id: string
    title: string
    resource_url: string
    year: number
    semester: string
    instructor?: string
  }>
  onClose: () => void
  initialFileId?: string | null
}

export default function PDFViewer({ files, onClose, initialFileId }: PDFViewerProps) {
  const [selected, setSelected] = useState<string | null>(initialFileId || null)
  const selectedFile = files.find(f => f.id === selected)
  const [ref, isHovered] = useHover()
  const [showBar, setShowBar] = useState(false)

  // Sort files alphabetically by title
  const sortedFiles = [...files].sort((a, b) => 
    a.title.toLowerCase().localeCompare(b.title.toLowerCase())
  )

  // Update selected file when initialFileId changes
  useEffect(() => {
    if (initialFileId) {
      setSelected(initialFileId)
    }
  }, [initialFileId])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    if (isHovered) {
      setShowBar(true)
    } else {
      if(showBar){
        timeoutId = setTimeout(() => {
          setShowBar(false)
        }, 1000)
      } // Hide after 1 second of not hovering
    }
    console.log("isHovered", isHovered)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isHovered, showBar])

  return (
    <div className="flex h-[calc(100vh-2rem)] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg">
      
      {/* Main viewer */}
      <main className={`flex-1 flex flex-col p-4 relative overflow-auto`}>
        {/* Top bar */}
        <div ref={ref} className={`absolute top-4 left-4 right-4 z-60 flex justify-between items-center p-2 sm:p-3 rounded-xl bg-white/30 dark:bg-zinc-950/30 backdrop-blur-xl border border-white/20 dark:border-zinc-800/20 transition-all duration-900 ${showBar ? 'opacity-100' : 'opacity-0'} sm:opacity-100`}>
          <div className="flex items-center gap-2 sm:gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 h-8 w-8 sm:h-9 sm:w-9 p-0"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] flex flex-col">
                <SheetHeader className="flex-shrink-0">
                  <SheetTitle>Browse Files</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto mt-6 space-y-2 pr-2">
                  {sortedFiles.map((file) => (
                    <Button
                      key={file.id}
                      variant={selected === file.id ? "secondary" : "ghost"}
                      className="w-full justify-start h-auto py-3 px-3"
                      onClick={() => {
                        setSelected(file.id)
                      }}
                    >
                      <div className="flex items-start gap-3 w-full min-w-0">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-col items-start w-full min-w-0 text-left">
                          <span className="text-sm font-medium leading-tight break-words w-full">
                            {file.title}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 break-words w-full">
                            {file.year} • {file.semester}
                            {file.instructor && (
                              <>
                                <br />
                                <span className="font-medium">{file.instructor}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            <h3 className="text-sm sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-none">
              {selectedFile ? selectedFile.title : 'Select content to view'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Viewer */}
        <div className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-auto bg-white dark:bg-zinc-800 mt-2 relative">
          {selectedFile ? (
            <div className="h-full w-full overflow-auto">
              <PDFViewerComponent file={selectedFile.resource_url} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 dark:text-zinc-400">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="italic">Select a file to preview</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 