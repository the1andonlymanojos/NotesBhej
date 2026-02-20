"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { Bell, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Database } from "@/types/supabase"
import { cn } from "@/lib/utils"

type Announcement = Database["public"]["Tables"]["announcements"]["Row"]
type AnnouncementRead = Database["public"]["Tables"]["announcement_reads"]["Row"]
type Notification = Database["public"]["Tables"]["notifications"]["Row"]

const ANNOUNCEMENTS_STALE_MS = 3 * 60 * 1000 // 3 minutes
const NOTIFICATIONS_STALE_MS = 3 * 60 * 1000 // 3 minutes

function fetchAnnouncements() {
  const supabase = createClient()
  return supabase
    .from("announcements")
    .select("id, title, message, link, expires_at, created_at")
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false })
}

function fetchAnnouncementReads(userId: string) {
  const supabase = createClient()
  return supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", userId)
}

async function markAsRead(userId: string, announcementId: number) {
  const supabase = createClient()
  await supabase.from("announcement_reads").insert({
    user_id: userId,
    announcement_id: announcementId,
    read_at: new Date().toISOString(),
  })
}

function fetchUserNotifications(userId: string) {
  const supabase = createClient()
  return supabase
    .from("notifications")
    .select("id, title, type, is_read, read_at, created_at, upload_count, course_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
}

async function markNotificationAsRead(notificationId: number) {
  const supabase = createClient()
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
}

async function markAllNotificationsAsRead(userId: string) {
  const supabase = createClient()
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false)
}

/** Shared hook so menu (or anywhere) can show announcements unread badge. Uses same query cache as drawer. */
export function useAnnouncementsUnreadCount(userId: string | null) {
  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await fetchAnnouncements()
      if (error) throw error
      return (data ?? []) as Announcement[]
    },
    staleTime: ANNOUNCEMENTS_STALE_MS,
  })
  const { data: readRows = [] } = useQuery({
    queryKey: ["announcement-reads", userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await fetchAnnouncementReads(userId)
      if (error) throw error
      return (data ?? []) as Pick<AnnouncementRead, "announcement_id">[]
    },
    enabled: !!userId,
    staleTime: ANNOUNCEMENTS_STALE_MS,
  })
  const readSet = new Set(readRows.map((r) => r.announcement_id))
  return announcements.filter((a) => !readSet.has(a.id)).length
}

/** Shared hook for user notifications unread count. Uses same query cache as drawer. */
export function useNotificationsUnreadCount(userId: string | null) {
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await fetchUserNotifications(userId)
      if (error) throw error
      return (data ?? []) as Notification[]
    },
    enabled: !!userId,
    staleTime: NOTIFICATIONS_STALE_MS,
  })
  return notifications.filter((n) => !n.is_read).length
}

/** Total unread (announcements + user notifications) for the bell badge. */
export function useTotalUnreadCount(userId: string | null) {
  const announcementsUnread = useAnnouncementsUnreadCount(userId)
  const notificationsUnread = useNotificationsUnreadCount(userId)
  return announcementsUnread + notificationsUnread
}

type AnnouncementsDrawerProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  /** Use compact/ghost style for trigger (e.g. in a minimal desktop bar) */
  triggerVariant?: "default" | "ghost"
}

export function AnnouncementsDrawer({ open: controlledOpen, onOpenChange, hideTrigger, triggerVariant = "default" }: AnnouncementsDrawerProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const [userId, setUserId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [expandedNotificationIds, setExpandedNotificationIds] = useState<Set<number>>(new Set())
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await fetchAnnouncements()
      if (error) throw error
      return (data ?? []) as Announcement[]
    },
    staleTime: ANNOUNCEMENTS_STALE_MS,
  })

  const { data: readRows = [], isLoading: readsLoading } = useQuery({
    queryKey: ["announcement-reads", userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await fetchAnnouncementReads(userId)
      if (error) throw error
      return (data ?? []) as Pick<AnnouncementRead, "announcement_id">[]
    },
    enabled: !!userId,
    staleTime: ANNOUNCEMENTS_STALE_MS,
  })

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await fetchUserNotifications(userId)
      if (error) throw error
      return (data ?? []) as Notification[]
    },
    enabled: !!userId,
    staleTime: NOTIFICATIONS_STALE_MS,
  })

  const markAsReadMutation = useMutation({
    mutationFn: ({ aid }: { aid: number }) => markAsRead(userId!, aid),
    onSuccess: (_data, { aid }) => {
      if (!userId) return
      queryClient.setQueryData<Pick<AnnouncementRead, "announcement_id">[]>(
        ["announcement-reads", userId],
        (prev) => {
          if (!prev?.some((r) => r.announcement_id === aid)) {
            return [...(prev ?? []), { announcement_id: aid }]
          }
          return prev
        }
      )
    },
  })

  const markNotificationAsReadMutation = useMutation({
    mutationFn: ({ nid }: { nid: number }) => markNotificationAsRead(nid),
    onSuccess: (_data, { nid }) => {
      if (!userId) return
      queryClient.setQueryData<Notification[]>(["notifications", userId], (prev) =>
        (prev ?? []).map((n) =>
          n.id === nid ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
    },
  })

  const markAllNotificationsAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(userId!),
    onSuccess: () => {
      if (!userId) return
      const now = new Date().toISOString()
      queryClient.setQueryData<Notification[]>(["notifications", userId], (prev) =>
        (prev ?? []).map((n) => (n.is_read ? n : { ...n, is_read: true, read_at: now }))
      )
    },
  })

  const readSet = new Set(readRows.map((r) => r.announcement_id))
  const announcementsUnreadCount = announcements.filter((a) => !readSet.has(a.id)).length
  const notificationsUnreadCount = notifications.filter((n) => !n.is_read).length
  const unreadCount = announcementsUnreadCount + notificationsUnreadCount

  // DB stores newlines as literal \n (backslash + n); convert to real newlines for display. Also handle legacy content with real newlines.
  const getDisplayMessage = (raw: string) => raw.replace(/\\n/g, "\n")

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
  }

  const toggleExpanded = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleNotificationExpanded = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedNotificationIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleItemClick = (announcement: Announcement) => {
    if (userId && !readSet.has(announcement.id)) {
      markAsReadMutation.mutate({ aid: announcement.id })
    }
    if (announcement.link) {
      window.open(announcement.link, "_blank", "noopener,noreferrer")
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (userId && !notification.is_read) {
      markNotificationAsReadMutation.mutate({ nid: notification.id })
    }
  }

  return (
    <>
      {!hideTrigger && (
        <Button
          variant={triggerVariant === "ghost" ? "ghost" : "outline"}
          size="icon"
          className={cn(
            "relative shrink-0",
            triggerVariant === "ghost"
              ? "h-10 w-10 text-zinc-600 dark:text-zinc-400 hover:bg-white/80 hover:text-zinc-900 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100"
              : "h-8 w-8 sm:h-10 sm:w-10 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
          )}
          onClick={() => setOpen(true)}
          aria-label="Open announcements and notifications"
        >
          <Bell className={cn("text-zinc-600 dark:text-zinc-400", triggerVariant === "ghost" ? "h-5 w-5" : "h-4 w-4 sm:h-5 sm:w-5")} />
          {userId && unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold"
              aria-label={`${unreadCount} unread items`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      )}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="flex flex-col p-0 sm:max-w-sm">
          <SheetHeader className="p-4 border-b space-y-1">
            <SheetTitle>Announcements & Notifications</SheetTitle>
            {userId && unreadCount > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click an item to mark as read
              </p>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {announcementsLoading || (userId && readsLoading) || (userId && notificationsLoading) ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            ) : announcements.length === 0 && (!userId || notifications.length === 0) ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No announcements or notifications</p>
            ) : (
              <div className="space-y-6">
                {/* Announcements */}
                <section>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Announcements</h3>
                  {announcements.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No announcements</p>
                  ) : (
                    <ul className="space-y-3">
                      {announcements.map((a) => {
                        const isUnread = !readSet.has(a.id)
                        const isExpanded = expandedIds.has(a.id)
                        const displayMessage = getDisplayMessage(a.message)
                        const hasLongMessage = a.message.includes("\\n") || a.message.length > 120
                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              onClick={() => handleItemClick(a)}
                              className={cn(
                                "w-full text-left rounded-lg border p-3 transition-colors",
                                "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                                "border-zinc-200 dark:border-zinc-700",
                                isUnread && "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                {isUnread && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-hidden />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className={cn("font-medium text-zinc-900 dark:text-zinc-100", isUnread && "font-semibold")}>
                                    {a.title}
                                  </p>
                                  <p
                                    className={cn(
                                      "mt-1 text-sm text-zinc-600 dark:text-zinc-400 break-words",
                                      isExpanded ? "whitespace-pre-wrap" : "line-clamp-3"
                                    )}
                                  >
                                    {isExpanded ? displayMessage : displayMessage.replace(/\n/g, " ")}
                                  </p>
                                  {hasLongMessage && (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => toggleExpanded(e, a.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault()
                                          toggleExpanded(e as unknown as React.MouseEvent, a.id)
                                        }
                                      }}
                                      className="mt-1 inline-flex cursor-pointer items-center gap-0.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      {isExpanded ? (
                                        <>Show less <ChevronUp className="h-3 w-3" /></>
                                      ) : (
                                        <>Show more <ChevronDown className="h-3 w-3" /></>
                                      )}
                                    </span>
                                  )}
                                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                    {new Date(a.created_at).toLocaleDateString()}
                                  </p>
                                  {a.link && (
                                    <span className="mt-1 inline-block text-xs text-indigo-600 dark:text-indigo-400">View link →</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>

                {/* User notifications */}
                {userId && (
                  <section>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Notifications</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          You get notifications for your pinned courses.
                        </p>
                      </div>
                      {notificationsUnreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                          onClick={() => markAllNotificationsAsReadMutation.mutate()}
                          disabled={markAllNotificationsAsReadMutation.isPending}
                        >
                          {markAllNotificationsAsReadMutation.isPending ? "…" : "Mark all as viewed"}
                        </Button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications</p>
                    ) : (
                      <ul className="space-y-3">
                        {notifications.map((n) => {
                          const isUnread = !n.is_read
                          const isExpanded = expandedNotificationIds.has(n.id)
                          return (
                            <li key={n.id}>
                              <button
                                type="button"
                                onClick={() => handleNotificationClick(n)}
                                className={cn(
                                  "w-full text-left rounded-lg border p-3 transition-colors",
                                  "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                                  "border-zinc-200 dark:border-zinc-700",
                                  isUnread && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  {isUnread && (
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className={cn("font-medium text-zinc-900 dark:text-zinc-100", isUnread && "font-semibold")}>
                                      {n.title}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                      {n.type}
                                      {n.upload_count > 0 && ` · ${n.upload_count} upload${n.upload_count === 1 ? "" : "s"}`}
                                    </p>
                                    {isExpanded && n.course_id != null && (
                                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">Course ID: {n.course_id}</p>
                                    )}
                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                      {new Date(n.created_at).toLocaleDateString()}
                                    </p>
                                    {n.course_id != null && (
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => toggleNotificationExpanded(e, n.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            toggleNotificationExpanded(e as unknown as React.MouseEvent, n.id)
                                          }
                                        }}
                                        className="mt-1 inline-flex cursor-pointer items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                                      >
                                        {isExpanded ? (
                                          <>Show less <ChevronUp className="h-3 w-3" /></>
                                        ) : (
                                          <>Show more <ChevronDown className="h-3 w-3" /></>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
