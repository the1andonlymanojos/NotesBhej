"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Provider, User } from '@supabase/supabase-js'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Database } from "@/types/supabase"
import { Github, Link, Unlink, Trophy, Plus, Twitch, Heart, FileText, ArrowRight, BookOpen } from "lucide-react"
import { toast } from "sonner"
import BackgroundSelector from "@/components/background-selector"

// Provider configuration
const PROVIDERS: { id: string; label: string; Icon?: any }[] = [
  { id: 'github', label: 'GitHub', Icon: Github },
  { id: 'google', label: 'Google' /* add icon if you want */ },
  { id: 'spotify', label: 'Spotify' /* add icon if you want */ },
  {id: 'twitch', label: 'Twitch', Icon: Twitch },
  {id: 'discord', label:'Discord'
  },
  {
    id:'azure', label:'Microsoft',
  }
  // add more providers here as needed
]

type UserMeta = Database["public"]["Tables"]["user_meta"]["Row"]
type CourseRow = Database["public"]["Tables"]["coursenew"]["Row"]

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [userMeta, setUserMeta] = useState<UserMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [uploadingPfp, setUploadingPfp] = useState(false)
  const [identities, setIdentities] = useState<any[]>([])
  const [loadingIdentities, setLoadingIdentities] = useState(false)
  const [linkingAccount, setLinkingAccount] = useState(false)
  const [contributionCount, setContributionCount] = useState<number>(0)
  const [pinnedCourses, setPinnedCourses] = useState<CourseRow[]>([])
  const [loadingPinned, setLoadingPinned] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    batch: "",
    role: "",
    admin_request: false
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push(`/login?redirect=${window.location.pathname}`)
        return
      }
      console.log("User found:", user)
      setUser(user)
      await fetchUserMeta(user.id, user)
      await fetchUserIdentities()
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  // Fetch contribution count and pinned courses when user is available
  useEffect(() => {
    if (!user) {
      setContributionCount(0)
      setPinnedCourses([])
      return
    }
    const fetchContributionCount = async () => {
      const { count, error } = await supabase
        .from("course_contentnew")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .or("deleted.is.null,deleted.eq.false")
      if (!error) setContributionCount(count ?? 0)
    }
    const fetchPinned = async () => {
      setLoadingPinned(true)
      try {
        const { data: pinnedData, error: pinnedError } = await supabase
          .from("user_pinned_courses")
          .select("course_id")
          .eq("user_id", user.id)
        if (pinnedError || !pinnedData?.length) {
          setPinnedCourses([])
          return
        }
        const courseIds = pinnedData.map((p) => p.course_id)
        const { data: coursesData, error: coursesError } = await supabase
          .from("coursenew")
          .select("*")
          .in("id", courseIds)
        if (!coursesError && coursesData) setPinnedCourses(coursesData)
        else setPinnedCourses([])
      } finally {
        setLoadingPinned(false)
      }
    }
    fetchContributionCount()
    fetchPinned()
  }, [user, supabase])

  const handleUnpin = async (courseId: number) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from("user_pinned_courses")
        .delete()
        .eq("user_id", user.id)
        .eq("course_id", courseId)
      if (error) {
        toast.error("Could not unpin course")
        return
      }
      setPinnedCourses((prev) => prev.filter((c) => c.id !== courseId))
      toast.success("Course unpinned")
    } catch {
      toast.error("Could not unpin course")
    }
  }

  const fetchUserMeta = async (userId: string, user: User) => {
    try {
      const { data, error } = await supabase
        .from("user_meta")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No entry found, create one
        console.log("No user_meta entry found, creating one...")
        await createUserMetaEntry(userId, user)
        return
      }

      if (error) {
        console.error("Error fetching user meta:", error)
        return
      }

      setUserMeta(data)
      setFormData({
        full_name: data.full_name || "",
        batch: data.batch || "",
        role: data.role || "",
        admin_request: data.admin_request || false
      })
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const createUserMetaEntry = async (userId: string, user: User) => {
    if (!user) {
        console.log("No user found")
        return
    }
    console.log("Creating user meta entry for user:", user)

    try {
      // Get user name from metadata or derive from email
      const fullName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'User'

      const newUserMeta = {
        user_id: userId,
        full_name: fullName,
        role: 'student',
        admin_request: false,
        profile_picture_url: user.user_metadata?.avatar_url || null,
        batch: null,
      }

      const { data, error } = await supabase
        .from("user_meta")
        .insert(newUserMeta)
        .select()
        .single()

      if (error) {
        console.error("Error creating user meta:", error)
        return
      }

      console.log("Created user_meta entry:", data)
      setUserMeta(data)
      setFormData({
        full_name: data.full_name || "",
        batch: data.batch || "",
        role: data.role || "",
        admin_request: data.admin_request || false
      })
    } catch (error) {
      console.error("Error creating user meta entry:", error)
    }
  }


  const fetchUserIdentities = async () => {
    setLoadingIdentities(true)
    try {
      const res = await supabase.auth.getUserIdentities()
      if (res.error) {
        console.error('getUserIdentities error', res.error)
        toast.error('Could not fetch linked accounts')
        setIdentities([])
        return
      }
      // res.data.identities is usually an array — keep it safe
      const ids = res.data?.identities ?? []
      console.log('identities fetched:', ids)
      setIdentities(ids)
    } catch (err) {
      console.error('Error fetching identities:', err)
      setIdentities([])
    } finally {
      setLoadingIdentities(false)
    }
  }

  /** Start linking flow for provider.
   *  In-browser: supabase.auth.linkIdentity triggers redirect; you won't get a response in many cases.
   */
  const handleLinkProvider = async (provider: string) => {
    setLinkingAccount(true)
    try {
      const { data, error } = await supabase.auth.linkIdentity({ provider: provider as Provider })
      // If called server-side you'll get a URL to redirect to in data; in browser the SDK normally redirects immediately.
      if (error) {
        console.error('linkIdentity error', error)
        toast.error(`Could not start linking ${provider}: ${error.message}`)
        return
      }
      // if returned data.url (server-style), redirect client:
      if (data && (data as any).url) {
        window.location.href = (data as any).url
        return
      }
      // otherwise wait for redirect back; refresh identities after a short delay or on next mount
      toast.success(`Started linking ${provider}. Complete the flow in the popup/redirect.`)
    } catch (err) {
      console.error('linkIdentity exception', err)
      toast.error(`Could not start linking ${provider}`)
    } finally {
      setLinkingAccount(false)
    }
  }

  /** Unlink identity generically.
   *  Notes:
   *   - Prevents unlinking the last identity
   *   - If unlinking fails due to the identity being linked to another user, you must resolve via admin (service_role) or tell the user.
   */
  const handleUnlinkAccount = async (provider: string) => {
    if (!confirm(`Unlink ${provider} from this account?`)) return

    try {
      setLinkingAccount(true)

      const res = await supabase.auth.getUserIdentities()
      if (res.error) throw res.error
      const ids = res.data?.identities ?? []
      const identity = ids.find((i: any) => i.provider === provider)
      if (!identity) {
        toast.error(`${provider} is not linked`)
        return
      }

      // Check if this would be the last identity
      if (ids.length === 1) {
        toast.error('Cannot unlink your last authentication method. You must have at least one way to sign in.')
        return
      }

      console.log('unlinking identity object:', identity)

      // Pass the whole identity object to unlinkIdentity
      const unlinkResult = await supabase.auth.unlinkIdentity(identity)

      // unlinkResult shape can vary; check for error
      if (unlinkResult?.error) {
        console.error('unlinkIdentity error', unlinkResult.error)
        toast.error('Could not unlink account: ' + (unlinkResult.error.message || unlinkResult.error))
        return
      }

      // refresh identities
      await fetchUserIdentities()
      toast.success(`${provider} unlinked`)
    } catch (err: any) {
      console.error('Error unlinking account', err)
      // Common real message: identity linked to another user (needs admin)
      if (err?.message?.includes?.('linked to another')) {
        toast.error('This identity is linked to another account. You may need support to resolve.')
      } else {
        toast.error('Failed to unlink account')
      }
    } finally {
      setLinkingAccount(false)
    }
  }


  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("user_meta")
        .update({
          full_name: formData.full_name,
          batch: formData.batch,
          admin_request: formData.admin_request,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)

      if (error) {
        console.error("Error updating profile:", error)
        toast.error("Error updating profile")
        return
      }

      // Refresh user meta data
      await fetchUserMeta(user.id, user)
      setEditing(false)
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error updating profile")
    } finally {
      setSaving(false)
    }
  }

  const handleProfilePictureUpload = async (file: File) => {
    if (!user) return

    setUploadingPfp(true)
    try {
      // Step 1: Get signed URL from our API
      const response = await fetch('/api/pfpupload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { signedUrl, publicUrl } = await response.json()
      
      // Step 2: Upload file directly to signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      // Step 3: Update user_meta with new profile picture URL
      const { error } = await supabase
        .from("user_meta")
        .update({
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)

      if (error) {
        console.error("Error updating profile picture:", error)
        toast.error("Error updating profile picture")
        return
      }

      // Refresh user meta data
      await fetchUserMeta(user.id, user)
      toast.success("Profile picture updated successfully!")
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      toast.error("Error uploading profile picture")
    } finally {
      setUploadingPfp(false)
    }
  }

  const processImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.onload = () => {
          // Create canvas for processing
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          // Set target dimensions (square profile picture)
          const targetSize = 400
          canvas.width = targetSize
          canvas.height = targetSize

          // Calculate center crop dimensions
          const { width: imgWidth, height: imgHeight } = img
          const minDimension = Math.min(imgWidth, imgHeight)
          const cropX = (imgWidth - minDimension) / 2
          const cropY = (imgHeight - minDimension) / 2

          // Draw the center-cropped and resized image
          ctx.drawImage(
            img,
            cropX, cropY, minDimension, minDimension, // source crop
            0, 0, targetSize, targetSize // destination
          )

          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Could not process image'))
              return
            }

            // Create new file from blob
            const processedFile = new File([blob], file.name, {
              type: 'image/jpeg', // Always convert to JPEG for consistency
              lastModified: Date.now()
            })

            resolve(processedFile)
          }, 'image/jpeg', 0.85) // 85% quality JPEG
        }

        img.onerror = () => reject(new Error('Could not load image'))
        img.src = e.target?.result as string
      }

      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Check file size (limit to 10MB before processing)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image is too large. Please select an image smaller than 10MB.')
      return
    }

    try {
      setUploadingPfp(true)
      const processedFile = await processImage(file)
      await handleProfilePictureUpload(processedFile)
    } catch (error) {
      console.error('Error processing image:', error)
      toast.error('Error processing image. Please try a different file.')
    } finally {
      // uploadingPfp will be set to false in handleProfilePictureUpload
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 p-3 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
          <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300">Loading profile...</p>
        </div>
      </div>
    )
  }

  const cardClass = "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 backdrop-blur shadow-sm"
  const cardTight = "py-3 gap-3 [&_[data-slot=card-header]]:px-4 [&_[data-slot=card-header]]:pt-4 [&_[data-slot=card-header]]:pb-2 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-content]]:pb-4"

  return (
    <div className="min-h-screen dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 p-3 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-3 lg:space-y-4">
        {/* Header: one compact row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 sm:p-2 shrink-0"
            >
              NotesBhej
            </Button>
            <BackgroundSelector />
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">Profile</h1>
          </div>
          <Button onClick={() => supabase.auth.signOut()} variant="outline" size="sm" className="shrink-0 border-zinc-300 dark:border-zinc-700">
            Sign Out
          </Button>
        </div>

        {/* Desktop: 2 columns. Mobile: single column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          {/* Left column: Hero + Contributions + Pinned */}
          <div className="space-y-3 lg:space-y-4">
            {/* Hero: compact row on lg */}
            <Card className={`${cardClass} ${cardTight}`}>
              <CardContent className="!pt-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="relative flex-shrink-0 flex items-center gap-3 sm:gap-4">
                    <div className="relative">
                      {userMeta?.profile_picture_url ? (
                        <Image
                          src={userMeta.profile_picture_url}
                          alt="Profile"
                          width={64}
                          height={64}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <span className="text-xl sm:text-2xl font-semibold text-zinc-600 dark:text-zinc-300">
                            {formData.full_name.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      {uploadingPfp && (
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 sm:flex-initial">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{formData.full_name || user?.email?.split('@')[0] || 'User'}</p>
                      {formData.batch && <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{formData.batch}</p>}
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{user?.email}</p>
                      <label className="mt-1.5 inline-block">
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">Change photo</span>
                        <input id="profile-picture" type="file" accept="image/*" onChange={handleFileSelect} disabled={uploadingPfp} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contributions + Pinned: side by side on lg */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
              <Card className={`${cardClass} ${cardTight}`}>
                <CardHeader className="!pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <FileText className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    Contributions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {contributionCount === 0 ? "None yet" : `${contributionCount} item${contributionCount !== 1 ? "s" : ""}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => router.push('/manage-contributions')} variant="default" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
                    <Plus className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                </CardContent>
              </Card>

              <Card className={`${cardClass} ${cardTight}`}>
                <CardHeader className="!pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <Heart className="h-4 w-4 text-red-500 dark:text-red-400" />
                    Pinned
                  </CardTitle>
                  <CardDescription className="text-xs">Saved courses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {loadingPinned ? (
                    <div className="flex items-center gap-2 py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent" />
                      <span className="text-xs text-zinc-500">Loading…</span>
                    </div>
                  ) : pinnedCourses.length === 0 ? (
                    <>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 py-1">None. Pin from homepage.</p>
                      <Button variant="outline" size="sm" className="border-zinc-300 dark:border-zinc-700 text-xs" onClick={() => router.push('/')}>Go home</Button>
                    </>
                  ) : (
                    <>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {pinnedCourses.slice(0, 5).map((course) => (
                          <li key={course.id} className="flex items-center justify-between gap-1.5 py-1.5 px-2 rounded border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-800/30">
                            <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate min-w-0">{course.title}</span>
                            <div className="flex shrink-0 gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/course/${course.id}`)}><ArrowRight className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleUnpin(course.id)}><Heart className="h-3.5 w-3.5 fill-current" /></Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {pinnedCourses.length > 5 && <p className="text-xs text-zinc-500 pt-1">+{pinnedCourses.length - 5} more on homepage</p>}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right column: Profile details + Achievements + Account + Connected */}
          <div className="space-y-3 lg:space-y-4">
            <Card className={`${cardClass} ${cardTight}`}>
              <CardHeader className="!pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Profile details</CardTitle>
                    <CardDescription className="text-xs">Name, batch, role</CardDescription>
                  </div>
                  {!editing ? (
                    <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(false); setFormData({ full_name: userMeta?.full_name || "", batch: userMeta?.batch || "", role: userMeta?.role || "", admin_request: userMeta?.admin_request || false }) }}>Cancel</Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {editing && (
                <CardContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="full_name" className="text-xs">Full name</Label>
                      <Input id="full_name" value={formData.full_name} onChange={(e) => handleInputChange("full_name", e.target.value)} placeholder="Name" className="text-sm h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="batch" className="text-xs">Batch</Label>
                      <Input id="batch" value={formData.batch} onChange={(e) => handleInputChange("batch", e.target.value)} placeholder="e.g. 2024" className="text-sm h-8" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={userMeta?.role === 'admin' ? 'default' : 'secondary'} className="text-xs">{userMeta?.role || 'user'}</Badge>
                    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <input type="checkbox" id="admin_request" checked={formData.admin_request} onChange={(e) => handleInputChange("admin_request", e.target.checked)} className="rounded" />
                      Help with moderation
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500">Created {userMeta?.created_at ? new Date(userMeta.created_at).toLocaleDateString() : '—'} · Updated {userMeta?.updated_at ? new Date(userMeta.updated_at).toLocaleDateString() : '—'}</p>
                </CardContent>
              )}
            </Card>

            {/* Achievements: one line */}
            <Card className={`${cardClass} ${cardTight}`}>
              <CardContent className="py-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {contributionCount > 0 ? `${contributionCount} contribution${contributionCount !== 1 ? "s" : ""} so far` : "No achievements yet — contribute to get started."}
                </p>
              </CardContent>
            </Card>

            {/* Account: one line */}
            <Card className={`${cardClass} ${cardTight}`}>
              <CardContent className="py-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Last sign-in: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'} · Email confirmed: {user?.email_confirmed_at ? 'Yes' : 'No'}
                </p>
              </CardContent>
            </Card>

            {/* Connected accounts: compact grid */}
            <Card className={`${cardClass} ${cardTight}`}>
              <CardHeader className="!pb-2">
                <CardTitle className="text-base">Connected accounts</CardTitle>
                <CardDescription className="text-xs">Link/unlink sign-in methods</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingIdentities ? (
                  <div className="flex items-center gap-2 py-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent" /><span className="text-xs">Loading…</span></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PROVIDERS.map((p) => {
                      const identity = identities.find((i: any) => i.provider === p.id)
                      const connected = !!identity
                      const isLastIdentity = identities.length === 1 && connected
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2 min-w-0">
                            {p.Icon && <p.Icon className="h-4 w-4 text-zinc-500 shrink-0" />}
                            <span className="text-sm font-medium truncate">{p.label}</span>
                            {connected && <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">OK</Badge>}
                          </div>
                          {connected ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => handleUnlinkAccount(p.id)} disabled={isLastIdentity} title={isLastIdentity ? "Keep at least one" : ""}>
                              <Unlink className="h-3 w-3 mr-0.5" /> Unlink
                            </Button>
                          ) : (
                            <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => handleLinkProvider(p.id)} disabled={linkingAccount}>
                              {linkingAccount ? <span className="animate-pulse">…</span> : <><Link className="h-3 w-3 mr-0.5" /> Link</>}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
