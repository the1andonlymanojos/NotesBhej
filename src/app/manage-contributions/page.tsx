"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Database } from "@/types/supabase"
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  BookOpen,
  MoreHorizontal,
  Edit,
  Download,
  Layers,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import EditContentDialog from "@/components/edit-content-dialog"

type CourseContentRow = Database["public"]["Tables"]["course_contentnew"]["Row"]
type CourseRow = Database["public"]["Tables"]["coursenew"]["Row"]
type Professor = Database["public"]["Tables"]["professorsnew"]["Row"]
type Tag = Database["public"]["Tables"]["tags"]["Row"]

function getContentUrl(item: { r2_url?: string | null; resource_url?: string | null }): string | null {
  const res = (item as { resource_url?: string | null }).resource_url
  const r2 = (item as { r2_url?: string | null }).r2_url
  return res || r2 || null
}

function buildFilename(
  item: CourseContentRow,
  contentType?: string | null
): string {
  const safe = (item.title || "file").replace(/[^a-z0-9\-_. ]/gi, "_")
  const type = (item.filetype || contentType || "").toLowerCase()
  if (!type) return safe + ".pdf"
  if (type.includes("application/x-ipynb+json")) return safe + ".ipynb"
  if (type.includes("pdf")) return safe + ".pdf"
  if (type.includes("word")) return safe + ".docx"
  if (type.includes("sheet") || type.includes("excel")) return safe + ".xlsx"
  if (type.includes("presentation") || type.includes("powerpoint")) return safe + ".pptx"
  if (type.includes("text/plain")) return safe + ".txt"
  if (type.includes("image/png")) return safe + ".png"
  if (type.includes("image/jpeg") || type.includes("image/jpg")) return safe + ".jpg"
  if (type.includes("image/webp")) return safe + ".webp"
  if (type.includes("application/zip")) return safe + ".zip"
  if (type.includes("application/octet-stream")) return safe + "." + (getContentUrl(item)?.split(".").pop() ?? "bin")
  return safe
}

function formatDate(updatedAt: string | null): string {
  if (!updatedAt) return "—"
  const updated = new Date(updatedAt)
  const now = new Date()
  const diffMs = now.getTime() - updated.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${Math.floor(diffMinutes / 60)}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return updated.toLocaleDateString()
}

export default function ManageContributionsPage() {
  const [contributions, setContributions] = useState<CourseContentRow[]>([])
  const [courseMap, setCourseMap] = useState<Record<number, CourseRow>>({})
  const [professors, setProfessors] = useState<Professor[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [editingContent, setEditingContent] = useState<CourseContentRow | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [downloadState, setDownloadState] = useState<Record<number, { progress: number; active: boolean }>>({})
  const router = useRouter()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      router.push(`/login?redirect=${encodeURIComponent("/manage-contributions")}`)
      return
    }

    setLoading(true)
    try {
      const [contentRes, coursesRes, professorsRes, tagsRes] = await Promise.all([
        supabase
          .from("course_contentnew")
          .select("*")
          .eq("user_id", user.id)
          .or("deleted.is.null,deleted.eq.false")
          .order("created_at", { ascending: false }),
        supabase.from("coursenew").select("*"),
        supabase.from("professorsnew").select("*").order("name"),
        supabase.from("tags").select("*").order("name"),
      ])

      if (contentRes.error) {
        toast.error("Could not load your contributions")
        setContributions([])
        setLoading(false)
        return
      }

      const list = contentRes.data ?? []
      setContributions(list)
      setProfessors(professorsRes.data ?? [])
      setTags(tagsRes.data ?? [])

      const courseIds = [...new Set(list.map((c) => c.course_id).filter((id): id is number => id != null))]
      if (courseIds.length === 0) {
        setCourseMap({})
      } else {
        const coursesData = coursesRes.data ?? []
        const map: Record<number, CourseRow> = {}
        coursesData.forEach((c) => {
          map[c.id] = c
        })
        setCourseMap(map)
      }
    } catch (err) {
      console.error(err)
      toast.error("Could not load your contributions")
      setContributions([])
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Group contributions by course_id
  const byCourse = contributions.reduce<Record<number, CourseContentRow[]>>((acc, item) => {
    const id = item.course_id ?? 0
    if (!acc[id]) acc[id] = []
    acc[id].push(item)
    return acc
  }, {})

  const handleEditClick = (item: CourseContentRow) => {
    setEditingContent(item)
    setEditDialogOpen(true)
  }

  const handleEditSave = () => {
    setEditDialogOpen(false)
    setEditingContent(null)
    toast.success("Edit submitted. It will appear after approval.")
    loadData()
  }

  const handleOpenInNewTab = (item: CourseContentRow) => {
    const url = getContentUrl(item)
    if (!url) {
      toast.error("No URL for this resource")
      return
    }
    const ft = (item.filetype || "").toLowerCase()
    if (
      ft.includes("word") ||
      ft.includes("sheet") ||
      ft.includes("excel") ||
      ft.includes("presentation") ||
      ft.includes("powerpoint")
    ) {
      window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`, "_blank")
    } else if (ft.includes("application/x-ipynb+json") || !ft) {
      handleDownload(item)
    } else {
      window.open(url, "_blank")
    }
  }

  const handleDownload = async (item: CourseContentRow) => {
    const url = getContentUrl(item)
    if (!item.id || !url) {
      toast.error("Cannot download this resource")
      return
    }
    const id = item.id
    setDownloadState((prev) => ({ ...prev, [id]: { progress: 0, active: true } }))
    try {
      const res = await fetch(url)
      if (!res.ok || !res.body) throw new Error("Failed to fetch file")
      const contentType = res.headers.get("content-type")
      const reader = res.body.getReader()
      const chunks: BlobPart[] = []
      let received = 0
      const total = parseInt(res.headers.get("content-length") || "0", 10)
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          received += value.length
          if (total > 0) {
            const pct = Math.min(99, Math.round((received / total) * 100))
            setDownloadState((prev) => ({ ...prev, [id]: { progress: pct, active: true } }))
          }
        }
      }
      const blob = new Blob(chunks, { type: contentType || item.filetype || "application/pdf" })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = buildFilename(item, contentType)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      setDownloadState((prev) => ({ ...prev, [id]: { progress: 100, active: false } }))
      setTimeout(() => setDownloadState((prev) => { const next = { ...prev }; delete next[id]; return next; }), 1500)
    } catch (e) {
      console.error(e)
      setDownloadState((prev) => ({ ...prev, [id]: { progress: 0, active: false } }))
      toast.error("Failed to download file")
      setTimeout(() => setDownloadState((prev) => { const next = { ...prev }; delete next[id]; return next; }), 2000)
    }
  }

  const cardClass =
    "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 backdrop-blur shadow-sm"

  return (
    <div className="min-h-screen dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-700 dark:text-zinc-300 w-fit"
            onClick={() => router.push("/profile")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to profile
          </Button>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-500 dark:text-indigo-400" />
            My contributions
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Edit, view, and download what you’ve uploaded. Same actions as on the course page.
          </p>
        </div>

        {loading ? (
          <Card className={cardClass}>
            <CardContent className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
              <span className="ml-3 text-sm text-zinc-600 dark:text-zinc-400">Loading contributions...</span>
            </CardContent>
          </Card>
        ) : contributions.length === 0 ? (
          <Card className={cardClass}>
            <CardContent className="text-center py-16 text-zinc-500 dark:text-zinc-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-base font-medium">You haven't contributed yet</p>
              <p className="text-sm mt-1">Add notes or resources to a course to see them here.</p>
              <Button
                variant="default"
                className="bg-indigo-600 hover:bg-indigo-700 mt-4"
                onClick={() => router.push("/")}
              >
                Browse courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(byCourse).map(([courseIdStr, items]) => {
              const courseId = parseInt(courseIdStr, 10)
              const course = courseId ? courseMap[courseId] : null
              const courseTitle = course?.title ?? "Unknown course"
              const courseCode = course?.code ?? course?.abbreviation ?? ""

              return (
                <Card key={courseIdStr} className={cardClass}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{courseTitle}</CardTitle>
                        <CardDescription className="text-sm flex items-center gap-1 mt-0.5">
                          {courseCode && <span>{courseCode}</span>}
                          <span>·</span>
                          <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 border-zinc-300 dark:border-zinc-700"
                        onClick={() => courseId && router.push(`/course/${courseId}`)}
                      >
                        Open course
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {items.map((item) => {
                        const url = getContentUrl(item)
                        const hasR2 = !!(item as { r2_url?: string | null }).r2_url
                        const dState = downloadState[item.id]

                        return (
                          <li
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.title}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <span>{item.year}</span>
                                {item.batch && <span>· {item.batch}</span>}
                                {item.semester_number != null && <span>· Sem {item.semester_number}</span>}
                                <span>· {formatDate(item.updated_at ?? item.created_at)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={item.visible ? "default" : "secondary"} className="text-xs">
                                {item.visible ? "Visible" : "Hidden"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 border-zinc-300 dark:border-zinc-700"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[11rem]">
                                  <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Suggest edit
                                  </DropdownMenuItem>
                                  {item.course_id != null && (
                                    <DropdownMenuItem onClick={() => router.push(`/course/${item.course_id}`)}>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View on course
                                    </DropdownMenuItem>
                                  )}
                                  {url && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleOpenInNewTab(item)}>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open in new tab
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDownload(item)}
                                        disabled={dState?.active}
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        {dState?.active ? "Downloading…" : "Download"}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {hasR2 && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const r2 = (item as { r2_url?: string | null }).r2_url
                                        if (r2) window.open(r2, "_blank")
                                      }}
                                    >
                                      <Layers className="h-4 w-4 mr-2" />
                                      Mirror (R2)
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <EditContentDialog
        content={editingContent}
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setEditingContent(null)
        }}
        onSave={handleEditSave}
        professors={professors}
        tags={tags}
      />
    </div>
  )
}
