"use client"

import { useState } from "react"
import { FileText, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

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
}

export default function PDFViewer({ files, onClose }: PDFViewerProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  const selectedFile = files.find(f => f.id === selected)

  return (
    <div className="flex h-[calc(100vh-2rem)] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg">
      {/* Sidebar */}
      {showSidebar && (
        <aside className="w-72 bg-white/50 dark:bg-zinc-800/50 p-4 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Course Content</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(false)}
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Hide
            </Button>
          </div>
          {files.length > 0 ? (
            <ul className="space-y-2">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    onClick={() => setSelected(file.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all duration-200
                      ${selected === file.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-700/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                  >
                    <div className="font-medium truncate">{file.title}</div>
                    <div className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">
                      {file.year} - {file.semester}
                      {file.instructor && ` • ${file.instructor}`}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="italic">No content available.</p>
            </div>
          )}
        </aside>
      )}

      {/* Main viewer */}
      <main className={`flex-1 flex flex-col ${!showSidebar ? 'pl-4' : 'p-4'}`}>
        {/* Top bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            {!showSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(true)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Show Sidebar
              </Button>
            )}
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {selectedFile ? selectedFile.title : 'Select content to view'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Viewer */}
        <div className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
          {selectedFile ? (
            <iframe
              src={`${selectedFile.resource_url}#toolbar=0`}
              className="w-full h-full border-none"
              loading="lazy"
            />
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