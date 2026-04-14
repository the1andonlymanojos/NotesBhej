"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  apiCreateInteraction,
  apiGetCourseContentPendingReview,
  apiGetCourses,
  apiGetMe,
  apiGetProfessors,
  apiGetTags,
  apiPatchCourseContent,
  apiPatchCourseContentVisibility,
} from "@/lib/api/client"
import type { ApiCourse, ApiCourseContentDTO, ApiProfessor, ApiTag, ApiUser } from "@/lib/api/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ArrowLeft, 
  Check, 
  X, 
  Eye, 
  Calendar, 
  User, 
  Search,
  Shield,
  Clock,
  AlertTriangle,
  Edit,
  Megaphone
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type PendingContentItem = ApiCourseContentDTO & {
  courseId?: number
  courseTitle?: string
  courseCode?: string
  professorName?: string
}

export default function ContentModerationPage() {
  const router = useRouter()
  const [user, setUser] = useState<ApiUser | null>(null)
  const [pendingContent, setPendingContent] = useState<PendingContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [editingContent, setEditingContent] = useState<PendingContentItem | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [allCourses, setAllCourses] = useState<ApiCourse[]>([])
  const [allProfessors, setAllProfessors] = useState<ApiProfessor[]>([])
  const [allTags, setAllTags] = useState<ApiTag[]>([])
  const [editingTag, setEditingTag] = useState<number | null>(null)

  const isAdmin = (role?: string | null) => role === "ADMIN" || role === "MODERATOR"

  const loadReferenceData = async () => {
    try {
      const [courses, professors, tags] = await Promise.all([
        apiGetCourses(),
        apiGetProfessors(),
        apiGetTags(),
      ])
      setAllCourses(courses ?? [])
      setAllProfessors(professors ?? [])
      setAllTags(tags ?? [])
    } catch (error) {
      console.error("Error fetching reference data:", error)
    }
  }

  const resolveCourseMeta = (item: any, coursesById: Map<number, ApiCourse>) => {
    const courseId: number | undefined =
      typeof item?.courseId === "number"
        ? item.courseId
        : typeof item?.course_id === "number"
          ? item.course_id
          : typeof item?.course?.id === "number"
            ? item.course.id
            : undefined

    const course = courseId != null ? coursesById.get(courseId) : undefined
    return {
      courseId,
      courseTitle: item?.courseTitle ?? item?.course_title ?? item?.course?.title ?? course?.title ?? undefined,
      courseCode: item?.courseCode ?? item?.course_code ?? item?.course?.code ?? course?.code ?? undefined,
    }
  }

  const fetchPendingContent = async () => {
    try {
      setLoading(true)
      const [pending, courses] = await Promise.all([
        apiGetCourseContentPendingReview(),
        apiGetCourses(),
      ])

      const coursesById = new Map<number, ApiCourse>()
      ;(courses ?? []).forEach((c) => {
        if (c.id != null) coursesById.set(c.id, c)
      })

      const profById = pending?.professors ?? {}
      const enhanced: PendingContentItem[] = (pending?.content ?? []).map((raw: any) => {
        const base: ApiCourseContentDTO = raw
        const professorId = (raw?.professorId ?? raw?.professor_id) as number | undefined
        const professorName =
          professorId != null ? profById[String(professorId)]?.name : undefined
        const courseMeta = resolveCourseMeta(raw, coursesById)
        return {
          ...base,
          professorId,
          professorName,
          ...courseMeta,
        }
      })

      setPendingContent(enhanced)
    } catch (error) {
      console.error("Error fetching pending content:", error)
      toast.error("Failed to load pending content")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setRoleLoading(true)
        const me = await apiGetMe()
        if (cancelled) return
        setUser(me ?? null)
      } catch (error) {
        if (cancelled) return
        setUser(null)
      } finally {
        if (!cancelled) setRoleLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (user && isAdmin(user.role) && !roleLoading) {
      loadReferenceData()
      fetchPendingContent()
    }
  }, [user, roleLoading])

  const handleApprove = async (content: PendingContentItem) => {
    const contentId = content.id ?? 0
    const courseId = content.courseId
    try {
      setActionLoading(contentId)
      await apiPatchCourseContentVisibility(contentId, "VISIBLE")
      if (courseId != null) {
        await apiCreateInteraction({
          courseId,
          contentId,
          type: "approve",
        })
      }
      toast.success("Content approved successfully")
      // Remove from pending list
      setPendingContent((prev) => prev.filter((item) => item.id !== contentId))
    } catch (error) {
      console.error("Error approving content:", error)
      toast.error("Failed to approve content")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeny = async (contentId: number, courseId?: number) => {
    try {
      setActionLoading(contentId)
      await apiPatchCourseContentVisibility(contentId, "DELETED")
      if (courseId != null) {
        await apiCreateInteraction({
          courseId,
          contentId,
          type: "deny",
        })
      }
      toast.success("Content denied and removed")
      // Remove from pending list
      setPendingContent((prev) => prev.filter((item) => item.id !== contentId))
    } catch (error) {
      console.error("Error denying content:", error)
      toast.error("Failed to deny content")
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditSave = async () => {
    if (!editingContent) return

    try {
      setEditLoading(true)
      const contentId = editingContent.id ?? 0
      await apiPatchCourseContent(contentId, {
        title: editingContent.title,
        year: editingContent.year,
        semesterNumber: editingContent.semesterNumber,
        batch: editingContent.batch,
        professorId: editingContent.professorId ?? null,
        tagIds: editingTag != null ? [editingTag] : [],
      })

      toast.success("Content updated successfully")
      
      // Update the content in the list
      setPendingContent((prev) =>
        prev.map((item) =>
          item.id === contentId
            ? {
                ...item,
                ...editingContent,
                courseTitle:
                  editingContent.courseTitle ??
                  (editingContent.courseId != null
                    ? allCourses.find((c) => c.id === editingContent.courseId)?.title
                    : undefined),
                courseCode:
                  editingContent.courseCode ??
                  (editingContent.courseId != null
                    ? allCourses.find((c) => c.id === editingContent.courseId)?.code
                    : undefined),
                professorName:
                  editingContent.professorName ??
                  (editingContent.professorId != null
                    ? allProfessors.find((p) => p.id === editingContent.professorId)?.name
                    : undefined),
                tags:
                  editingTag != null
                    ? allTags.filter((t) => t.id === editingTag)
                    : [],
              }
            : item
        )
      )
      
      setEditingContent(null)
    } catch (error) {
      console.error("Error updating content:", error)
      toast.error("Failed to update content")
    } finally {
      setEditLoading(false)
    }
  }

  const filteredContent = pendingContent.filter(content => 
    (content.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (content.courseTitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (content.courseCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (content.professorName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (content.updatedAt ?? content.createdAt ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-white/50 dark:bg-zinc-900/60 flex items-center justify-center p-3 sm:p-4">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin(user.role)) {
    return (
      <div className="min-h-screen bg-white/50 dark:bg-zinc-900/60 flex items-center justify-center p-3 sm:p-4">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">Access Denied</h1>
          <p className="text-red-600 dark:text-red-400">You need admin privileges to access this page.</p>
          {user?.role && (
            <p className="text-red-500 dark:text-red-300 text-sm mt-2">
              Your current role: {user.role}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 transition-colors duration-500 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              size="sm"
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => router.push('/admin/announcements')}
              variant="outline"
              size="sm"
            >
              <Megaphone className="h-4 w-4 mr-1" />
              Announcements
            </Button>
            <Shield className="text-blue-600 dark:text-blue-400 h-8 w-8" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-purple-500 to-green-400 dark:from-blue-300 dark:via-purple-400 dark:to-green-300 bg-clip-text text-transparent">
                Content Moderation
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Review and approve user-submitted content
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search content, courses, or professors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{filteredContent.length} pending items</span>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
              <p className="text-zinc-600 dark:text-zinc-400">Loading pending content...</p>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                All caught up!
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                No pending content to review.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContent.map((content) => (
                  <TableRow key={content.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {content.title ?? ""}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <Badge variant="outline" className="text-xs">
                            {content.year} - Semester {content.semesterNumber}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {content.batch}
                          </Badge>
                        </div>
                        {content.tags && content.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag.id} variant="secondary" className="text-xs px-2 py-0.5">
                                {tag.name}
                              </Badge>
                            ))}
                            {content.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                +{content.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {content.courseTitle || 'N/A'}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          {content.courseCode || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {content.professorName || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate((content.updatedAt || content.createdAt) ?? new Date().toISOString())}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => content.resourceUrl && window.open(content.resourceUrl, '_blank')}
                          className="h-8 px-2"
                          disabled={!content.resourceUrl}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingContent(content)
                            setEditingTag(content.tags && content.tags.length > 0 ? (content.tags[0].id ?? null) : null)
                          }}
                          className="h-8 px-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                              disabled={actionLoading === content.id}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Content</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to approve &quote;{content.title}&quote;? This will make it visible to all users.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleApprove(content)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                              disabled={actionLoading === content.id}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deny Content</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deny &quote;{content.title}&quote;? This will permanently remove the content.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeny(content.id ?? 0, content.courseId)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Deny
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Edit Content Modal */}
        <Dialog open={!!editingContent} onOpenChange={(open) => {
          if (!open) {
            setEditingContent(null)
            setEditingTag(null)
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Content</DialogTitle>
              <DialogDescription>
                Make changes to the content before approval.
              </DialogDescription>
            </DialogHeader>
            
            {editingContent && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Title
                  </label>
                  <Input
                    value={editingContent.title ?? ""}
                    onChange={(e) => setEditingContent(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Content title"
                  />
                </div>



                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                      Year
                    </label>
                    <Input
                      type="number"
                      value={editingContent.year ?? ""}
                      onChange={(e) => setEditingContent(prev => prev ? { ...prev, year: parseInt(e.target.value) } : null)}
                      placeholder="2024"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                      Semester
                    </label>
                    <Input
                      type="number"
                      value={editingContent.semesterNumber ?? ""}
                      onChange={(e) => setEditingContent(prev => prev ? { ...prev, semesterNumber: parseInt(e.target.value) } : null)}
                      placeholder="1"
                      min="1"
                      max="8"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Batch
                  </label>
                  <Input
                    value={editingContent.batch ?? ""}
                    onChange={(e) => setEditingContent(prev => prev ? { ...prev, batch: e.target.value } : null)}
                    placeholder="2024-2028"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Course
                  </label>
                  <Select
                    value={editingContent.courseId?.toString() || ''}
                    onValueChange={(value) => setEditingContent(prev => prev ? { ...prev, courseId: value ? parseInt(value) : undefined } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCourses
                        .filter((c) => c.id != null)
                        .map((course) => (
                        <SelectItem key={course.id} value={course.id!.toString()}>
                          {course.code} - {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Professor
                  </label>
                  <Select
                    value={editingContent.professorId?.toString() || ''}
                    onValueChange={(value) => setEditingContent(prev => prev ? { ...prev, professorId: value ? parseInt(value) : undefined } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a professor" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProfessors
                        .filter((p) => p.id != null)
                        .map((professor) => (
                        <SelectItem key={professor.id} value={professor.id!.toString()}>
                          {professor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 border border-zinc-300 dark:border-zinc-600 rounded-md bg-zinc-50 dark:bg-zinc-800/50">
                    <button
                      type="button"
                      onClick={() => setEditingTag(null)}
                      className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                        editingTag === null
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                          : "bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                      }`}
                    >
                      None
                    </button>
                    {allTags.filter((t) => t.id != null).map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setEditingTag(tag.id!)}
                        className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                          editingTag === tag.id
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                            : "bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                    {allTags.length === 0 && (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">No tags available</span>
                    )}
                  </div>
                  {editingTag && (
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      Selected: {allTags.find(t => t.id === editingTag)?.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditingContent(null)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditSave} 
                disabled={editLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 