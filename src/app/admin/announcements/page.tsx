"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Megaphone, Shield, AlertTriangle, Plus } from "lucide-react"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { toast } from "sonner"

type Announcement = Database["public"]["Tables"]["announcements"]["Row"]

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createMessage, setCreateMessage] = useState("")
  const [createLink, setCreateLink] = useState("")
  const [createExpiresAt, setCreateExpiresAt] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const isAdmin = (role: string | null) => {
    if (!role) return false
    return role === "admin" || role === "moderator" || role === "super_admin"
  }

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
      setUserRole(data?.role ?? null)
    } catch (e) {
      console.error("Error fetching user role:", e)
      setUserRole(null)
    } finally {
      setRoleLoading(false)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      setAnnouncements((data ?? []) as Announcement[])
    } catch (e) {
      console.error("Error fetching announcements:", e)
      toast.error("Failed to load announcements")
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (!currentUser) {
        router.push("/")
        return
      }
      fetchUserRole(currentUser.id)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (!currentUser) {
        router.push("/")
        return
      }
      fetchUserRole(currentUser.id)
    })
    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  useEffect(() => {
    if (user && isAdmin(userRole) && !roleLoading) {
      fetchAnnouncements()
    }
  }, [user, userRole, roleLoading])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    if (!createTitle.trim() || !createMessage.trim()) {
      toast.error("Title and message are required")
      return
    }
    try {
      setSubmitting(true)
      const expiresAt = createExpiresAt.trim()
        ? new Date(createExpiresAt.trim()).toISOString()
        : null
      // Store newlines as literal \n in DB so they persist
      const messageForDb = createMessage
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n/g, "\\n")
      const { error } = await supabase.from("announcements").insert({
        title: createTitle.trim(),
        message: messageForDb,
        link: createLink.trim() || null,
        expires_at: expiresAt,
        created_by: user.id,
      })
      if (error) throw error
      toast.success("Announcement created")
      setCreateOpen(false)
      setCreateTitle("")
      setCreateMessage("")
      setCreateLink("")
      setCreateExpiresAt("")
      fetchAnnouncements()
    } catch (e) {
      console.error("Error creating announcement:", e)
      toast.error("Failed to create announcement")
    } finally {
      setSubmitting(false)
    }
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4" />
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
            <p className="text-red-500 dark:text-red-300 text-sm mt-2">Your current role: {userRole}</p>
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
              onClick={() => router.push("/")}
              variant="outline"
              size="sm"
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => router.push("/admin/content-moderation")}
              variant="outline"
              size="sm"
            >
              <Shield className="h-4 w-4 mr-1" />
              Content Moderation
            </Button>
            <Megaphone className="text-blue-600 dark:text-blue-400 h-8 w-8" />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-purple-500 to-green-400 dark:from-blue-300 dark:via-purple-400 dark:to-green-300 bg-clip-text text-transparent">
                Announcements
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Create and manage site-wide announcements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create announcement
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* List */}
        <div className="bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center">
              <Megaphone className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No announcements yet</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">Create one to show in the notification drawer.</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create announcement
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">{a.title}</TableCell>
                    <TableCell className="max-w-xs truncate text-zinc-600 dark:text-zinc-400">{a.message}</TableCell>
                    <TableCell className="text-sm">
                      {a.link ? (
                        <a href={a.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                          Link
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                      {a.expires_at ? new Date(a.expires_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(a.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create announcement</DialogTitle>
            <DialogDescription>
              This will appear in the notification drawer on the homepage and course pages.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title (required)</label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Announcement title"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Message (required)</label>
              <Textarea
                value={createMessage}
                onChange={(e) => setCreateMessage(e.target.value)}
                placeholder="Announcement message (line breaks are preserved)"
                className="mt-1 min-h-[120px] resize-y"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Link (optional)</label>
              <Input
                value={createLink}
                onChange={(e) => setCreateLink(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Expires at (optional)</label>
              <Input
                type="datetime-local"
                value={createExpiresAt}
                onChange={(e) => setCreateExpiresAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
