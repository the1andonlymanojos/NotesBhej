"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { Database } from "@/types/supabase"
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
  Tag
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { toast } from "sonner"

type CourseContent = Database["public"]["Tables"]["course_contentnew"]["Row"]
type Course = Database["public"]["Tables"]["coursenew"]["Row"]
type Professor = Database["public"]["Tables"]["professorsnew"]["Row"]
//type UserMeta = Database["public"]["Tables"]["user_meta"]["Row"]
type Tag = Database["public"]["Tables"]["tags"]["Row"]

// Type for content with joined course and professor data
type ContentWithJoins = CourseContent & {
  coursenew: {
    title: string
    code: string
  } | null
  professorsnew: {
    name: string
  } | null
}

// Enhanced content type with course and professor info
type EnhancedContent = CourseContent & {
  course_name?: string
  course_code?: string
  professor_name?: string
}

export default function ContentModerationPage() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [pendingContent, setPendingContent] = useState<EnhancedContent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [editingContent, setEditingContent] = useState<EnhancedContent | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [allProfessors, setAllProfessors] = useState<Professor[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [editingTag, setEditingTag] = useState<number | null>(null)
  const supabase = createClient()

  // Check if user is admin based on user_meta table
  const isAdmin = (role: string | null) => {
    if (!role) return false
    return role === 'admin' || role === 'moderator' || role === 'super_admin'
  }

  // Fetch user role from user_meta table
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_meta")
        .select("role")
        .eq("user_id", userId)
        .single()

      if (error) {
        console.error("Error fetching user role:", error)
        setUserRole(null)
        return
      }

      setUserRole(data?.role || null)
    } catch (error) {
      console.error("Error fetching user role:", error)
      setUserRole(null)
    } finally {
      setRoleLoading(false)
    }
  }

  // Fetch all courses, professors, and tags for the edit form
  const fetchCoursesAndProfessors = async () => {
    try {
      const [coursesResult, professorsResult, tagsResult] = await Promise.all([
        supabase.from("coursenew").select("*").order("title"),
        supabase.from("professorsnew").select("*").order("name"),
        supabase.from("tags").select("*").order("name")
      ])

      if (coursesResult.data) setAllCourses(coursesResult.data)
      if (professorsResult.data) setAllProfessors(professorsResult.data)
      if (tagsResult.data) setAllTags(tagsResult.data)
    } catch (error) {
      console.error("Error fetching courses, professors, and tags:", error)
    }
  }

  useEffect(() => {
    // Check for user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (!currentUser) {
        router.push('/')
        return
      }
      
      // Fetch user role from user_meta table
      fetchUserRole(currentUser.id)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (!currentUser) {
        router.push('/')
        return
      }
      
      // Fetch user role from user_meta table
      fetchUserRole(currentUser.id)
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  useEffect(() => {
    if (user && isAdmin(userRole) && !roleLoading) {
      fetchPendingContent()
      fetchCoursesAndProfessors()
    }
  }, [user, userRole, roleLoading, supabase])

  const fetchPendingContent = async () => {
    try {
      setLoading(true)
      
      // Fetch pending content with course and professor details
      const { data, error } = await supabase
        .from("course_contentnew")
        .select(`
          *,
          coursenew (
            title,
            code
          ),
          professorsnew (
            name
          )
        `)
        .eq("visible", false)
        .or("deleted.is.null,deleted.eq.false")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching pending content:", error)
        toast.error("Failed to load pending content")
        return
      }

      // Transform the data to include course and professor names
      const enhancedData: EnhancedContent[] = (data || []).map((item: ContentWithJoins) => ({
        ...item,
        course_name: item.coursenew?.title,
        course_code: item.coursenew?.code,
        professor_name: item.professorsnew?.name,
      }))

      setPendingContent(enhancedData)
    } catch (error) {
      console.error("Error fetching pending content:", error)
      toast.error("Failed to load pending content")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (contentId: number) => {
    try {
      setActionLoading(contentId)
      
      const { error } = await supabase
        .from("course_contentnew")
        .update({ visible: true })
        .eq("id", contentId)

      if (error) {
        console.error("Error approving content:", error)
        toast.error("Failed to approve content")
        return
      }

      toast.success("Content approved successfully")
      // Remove from pending list
      setPendingContent(prev => prev.filter(item => item.id !== contentId))
    } catch (error) {
      console.error("Error approving content:", error)
      toast.error("Failed to approve content")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeny = async (contentId: number) => {
    try {
      setActionLoading(contentId)
      
      // For denial, you might want to either delete the content or mark it differently
      // For now, I'll delete it, but you could add a "denied" status instead
      const { error } = await supabase
        .from("course_contentnew")
        .update({ deleted: true })
        .eq("id", contentId)

      if (error) {
        console.error("Error denying content:", error)
        toast.error("Failed to deny content")
        return
      }

      toast.success("Content denied and removed")
      // Remove from pending list
   
      setPendingContent(prev => prev.filter(item => item.id !== contentId))
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
      
              const { error } = await supabase
        .from("course_contentnew")
        .update({
          title: editingContent.title,
          year: editingContent.year,
          semester_number: editingContent.semester_number,
          batch: editingContent.batch,
          course_id: editingContent.course_id,
          professor_id: editingContent.professor_id,
          tag_ids: editingTag ? [editingTag] : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingContent.id)

      if (error) {
        console.error("Error updating content:", error)
        toast.error("Failed to update content")
        return
      }

      toast.success("Content updated successfully")
      
      // Update the content in the list
      setPendingContent(prev => 
        prev.map(item => 
          item.id === editingContent.id 
            ? {
                ...editingContent,
                course_name: allCourses.find(c => c.id === editingContent.course_id)?.title,
                course_code: allCourses.find(c => c.id === editingContent.course_id)?.code,
                professor_name: allProfessors.find(p => p.id === editingContent.professor_id)?.name,
                updated_at: new Date().toISOString()
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
    content.title.toLowerCase().includes(search.toLowerCase()) ||
    content.course_name?.toLowerCase().includes(search.toLowerCase()) ||
    content.course_code?.toLowerCase().includes(search.toLowerCase()) ||
    content.professor_name?.toLowerCase().includes(search.toLowerCase()) ||
    content.updated_at?.toLowerCase().includes(search.toLowerCase())
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
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin(userRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">Access Denied</h1>
          <p className="text-red-600 dark:text-red-400">You need admin privileges to access this page.</p>
          {userRole && (
            <p className="text-red-500 dark:text-red-300 text-sm mt-2">
              Your current role: {userRole}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-3 sm:p-4">
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
                          {content.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <Badge variant="outline" className="text-xs">
                            {content.year} - Semester {content.semester_number}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {content.batch}
                          </Badge>
                        </div>
                        {content.tag_ids && content.tag_ids.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.tag_ids.slice(0, 3).map((tagId) => {
                              const tag = allTags.find(t => t.id === tagId)
                              return tag ? (
                                <Badge key={tagId} variant="secondary" className="text-xs px-2 py-0.5">
                                  {tag.name}
                                </Badge>
                              ) : null
                            })}
                            {content.tag_ids.length > 3 && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                +{content.tag_ids.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {content.course_name || 'N/A'}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          {content.course_code || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {content.professor_name || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(content.updated_at || content.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(content.resource_url, '_blank')}
                          className="h-8 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingContent(content)
                            setEditingTag(content.tag_ids && content.tag_ids.length > 0 ? content.tag_ids[0] : null)
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
                                onClick={() => handleApprove(content.id)}
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
                                onClick={() => handleDeny(content.id)}
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
                    value={editingContent.title}
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
                      value={editingContent.year}
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
                      value={editingContent.semester_number}
                      onChange={(e) => setEditingContent(prev => prev ? { ...prev, semester_number: parseInt(e.target.value) } : null)}
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
                    value={editingContent.batch}
                    onChange={(e) => setEditingContent(prev => prev ? { ...prev, batch: e.target.value } : null)}
                    placeholder="2024-2028"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
                    Course
                  </label>
                  <Select
                    value={editingContent.course_id?.toString() || ''}
                    onValueChange={(value) => setEditingContent(prev => prev ? { ...prev, course_id: value ? parseInt(value) : null } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
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
                    value={editingContent.professor_id?.toString() || ''}
                    onValueChange={(value) => setEditingContent(prev => prev ? { ...prev, professor_id: value ? parseInt(value) : null } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a professor" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProfessors.map((professor) => (
                        <SelectItem key={professor.id} value={professor.id.toString()}>
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
                    {allTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setEditingTag(tag.id)}
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