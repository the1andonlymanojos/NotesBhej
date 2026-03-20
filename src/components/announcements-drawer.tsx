"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Bell, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  apiGetAnnouncementReads,
  apiGetAnnouncements,
  apiGetMe,
  apiMarkAnnouncementAsRead,
} from "@/lib/api/client"

type Announcement = {
  id: number
  title: string
  message: string
  link: string | null
  expires_at: string | null
  created_at: string
}

type AnnouncementRead = {
  announcement_id: number
}

const ANNOUNCEMENTS_STALE_MS = 3 * 60 * 1000 // 3 minutes

async function fetchAnnouncements() {
  const data = await apiGetAnnouncements()
  const now = Date.now()
  return (data ?? [])
    .map((a) => ({
      id: a.id ?? 0,
      title: a.title ?? "",
      message: a.message ?? "",
      link: a.link ?? null,
      expires_at: a.expiresAt ?? null,
      created_at: a.createdAt ?? new Date().toISOString(),
    }))
    .filter((a) => a.id > 0)
    .filter((a) => !a.expires_at || new Date(a.expires_at).getTime() > now)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

async function fetchAnnouncementReads(userId: number) {
  const data = await apiGetAnnouncementReads(userId)
  return (data ?? [])
    .map((r) => ({ announcement_id: r.announcementId ?? 0 }))
    .filter((r) => r.announcement_id > 0)
}

async function markAsRead(userId: number, announcementId: number) {
  await apiMarkAnnouncementAsRead(userId, announcementId)
}

/** Shared hook so menu (or anywhere) can show announcements unread badge. Uses same query cache as drawer. */
export function useAnnouncementsUnreadCount(userId: number | null) {
  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      return await fetchAnnouncements()
    },
    staleTime: ANNOUNCEMENTS_STALE_MS,
  })
  const { data: readRows = [] } = useQuery({
    queryKey: ["announcement-reads", userId],
    queryFn: async () => {
      if (!userId) return []
      return await fetchAnnouncementReads(userId)
    },
    enabled: !!userId,
    staleTime: ANNOUNCEMENTS_STALE_MS,
  })
  const readSet = new Set(readRows.map((r) => r.announcement_id))
  return announcements.filter((a) => !readSet.has(a.id)).length
}

/** Shared hook for user notifications unread count. Uses same query cache as drawer. */
export function useNotificationsUnreadCount(_userId: number | null) {
  // Notifications are not supported by backend yet.
  return 0
}

/** Total unread (announcements + user notifications) for the bell badge. */
export function useTotalUnreadCount(userId: number | null) {
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

  const [userId, setUserId] = useState<number | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false
    const loadMe = async () => {
      try {
        const me = await apiGetMe()
        if (!cancelled) setUserId(typeof me.id === "number" ? me.id : null)
      } catch {
        if (!cancelled) setUserId(null)
      }
    }
    loadMe()
    return () => {
      cancelled = true
    }
  }, [])

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      return await fetchAnnouncements()
    },
    staleTime: ANNOUNCEMENTS_STALE_MS,
  })

  const { data: readRows = [], isLoading: readsLoading } = useQuery({
    queryKey: ["announcement-reads", userId],
    queryFn: async () => {
      if (!userId) return []
      return await fetchAnnouncementReads(userId)
    },
    enabled: !!userId,
    staleTime: ANNOUNCEMENTS_STALE_MS,
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

  const readSet = new Set(readRows.map((r) => r.announcement_id))
  const announcementsUnreadCount = announcements.filter((a) => !readSet.has(a.id)).length
  const unreadCount = announcementsUnreadCount

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

  const handleItemClick = (announcement: Announcement) => {
    if (userId && !readSet.has(announcement.id)) {
      markAsReadMutation.mutate({ aid: announcement.id })
    }
    if (announcement.link) {
      window.open(announcement.link, "_blank", "noopener,noreferrer")
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
          aria-label="Open announcements"
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
            <SheetTitle>Announcements</SheetTitle>
            {userId && unreadCount > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click an item to mark as read
              </p>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {announcementsLoading || (userId && readsLoading) ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No announcements</p>
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

                {/* User notifications are intentionally disabled until backend support is ready.
                {userId && (
                  <section />
                )}
                */}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
