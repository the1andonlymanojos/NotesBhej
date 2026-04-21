"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Heart, FileText, ArrowRight, Trophy } from "lucide-react"
import { toast } from "sonner"
import BackgroundSelector from "@/components/background-selector"
import {
  apiGetMe,
  apiUpdateMe,
  apiLogout,
  apiGetPinnedCoursesMe,
  apiUnpinCourse,
  apiGetUploadUrl,
} from "@/lib/api/client"
import type { ApiUser, ApiPinnedCourseDTO } from "@/lib/api/types"

export default function ProfilePage() {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [uploadingPfp, setUploadingPfp] = useState(false)
  const [pinnedCourses, setPinnedCourses] = useState<ApiPinnedCourseDTO[]>([])
  const [loadingPinned, setLoadingPinned] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    full_name: "",
    batch: "",
    admin_request: false,
  })

  const applyUser = (me: ApiUser) => {
    setUser(me)
    setFormData({
      full_name: me.fullName || "",
      batch: me.batch || "",
      admin_request: !!(me.userReq ?? me.adminRequest),
    })
  }

  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await apiGetMe()
        applyUser(me)
      } catch (err) {
        console.error("Failed to load profile:", err)
        router.push(`/login?redirect=${window.location.pathname}`)
        return
      } finally {
        setLoading(false)
      }
    }
    loadMe()
  }, [router])

  useEffect(() => {
    if (!user) {
      setPinnedCourses([])
      return
    }
    const loadPinned = async () => {
      setLoadingPinned(true)
      try {
        const data = await apiGetPinnedCoursesMe()
        setPinnedCourses(data ?? [])
      } catch (err) {
        console.error("Failed to load pinned courses:", err)
        setPinnedCourses([])
      } finally {
        setLoadingPinned(false)
      }
    }
    loadPinned()
  }, [user])

  const handleUnpin = async (pinnedId: number | undefined) => {
    if (pinnedId == null) return
    try {
      await apiUnpinCourse(pinnedId)
      setPinnedCourses((prev) => prev.filter((p) => p.id !== pinnedId))
      toast.success("Course unpinned")
    } catch (err) {
      console.error("Could not unpin course:", err)
      toast.error("Could not unpin course")
    }
  }

  const handleSignOut = async () => {
    try {
      await apiLogout()
      router.push("/login")
    } catch (err) {
      console.error("Sign-out failed:", err)
      toast.error("Could not sign out")
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const updated = await apiUpdateMe({
        fullName: formData.full_name,
        batch: formData.batch,
        adminRequest: formData.admin_request,
      })
      applyUser(updated)
      setEditing(false)
      toast.success("Profile updated successfully!")
    } catch (err) {
      console.error("Error updating profile:", err)
      toast.error("Error updating profile")
    } finally {
      setSaving(false)
    }
  }

  const handleProfilePictureUpload = async (file: File) => {
    setUploadingPfp(true)
    try {
      const { signedURL, publicFileUrl } = await apiGetUploadUrl(
        file.name,
        file.type
      )
      if (!signedURL || !publicFileUrl) {
        throw new Error("Failed to get upload URL")
      }

      const uploadResponse = await fetch(signedURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file")
      }

      const updated = await apiUpdateMe({ pfpURL: publicFileUrl })
      applyUser(updated)
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
        const img = document.createElement("img")
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Could not get canvas context"))
            return
          }

          const targetSize = 400
          canvas.width = targetSize
          canvas.height = targetSize

          const { width: imgWidth, height: imgHeight } = img
          const minDimension = Math.min(imgWidth, imgHeight)
          const cropX = (imgWidth - minDimension) / 2
          const cropY = (imgHeight - minDimension) / 2

          ctx.drawImage(
            img,
            cropX,
            cropY,
            minDimension,
            minDimension,
            0,
            0,
            targetSize,
            targetSize
          )

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Could not process image"))
                return
              }
              const processedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(processedFile)
            },
            "image/jpeg",
            0.85
          )
        }

        img.onerror = () => reject(new Error("Could not load image"))
        img.src = e.target?.result as string
      }

      reader.onerror = () => reject(new Error("Could not read file"))
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large. Please select an image smaller than 10MB.")
      return
    }

    try {
      setUploadingPfp(true)
      const processedFile = await processImage(file)
      await handleProfilePictureUpload(processedFile)
    } catch (error) {
      console.error("Error processing image:", error)
      toast.error("Error processing image. Please try a different file.")
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

  const displayName = formData.full_name || user?.email?.split("@")[0] || "User"
  const avatarLetter = (displayName.charAt(0) || "?").toUpperCase()

  const cardClass =
    "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50 backdrop-blur shadow-sm"
  const cardTight =
    "py-3 gap-3 [&_[data-slot=card-header]]:px-4 [&_[data-slot=card-header]]:pt-4 [&_[data-slot=card-header]]:pb-2 [&_[data-slot=card-content]]:px-4 [&_[data-slot=card-content]]:pb-4"

  return (
    <div className="min-h-screen dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 p-3 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-3 lg:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 sm:p-2 shrink-0"
            >
              NotesBhej
            </Button>
            <BackgroundSelector />
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Profile
            </h1>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="shrink-0 border-zinc-300 dark:border-zinc-700"
          >
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <div className="space-y-3 lg:space-y-4">
            <Card className={`${cardClass} ${cardTight}`}>
              <CardContent className="!pt-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="relative flex-shrink-0 flex items-center gap-3 sm:gap-4">
                    <div className="relative">
                      {user?.profilePictureUrl ? (
                        <Image
                          src={user.profilePictureUrl}
                          alt="Profile"
                          width={64}
                          height={64}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <span className="text-xl sm:text-2xl font-semibold text-zinc-600 dark:text-zinc-300">
                            {avatarLetter}
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
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {displayName}
                      </p>
                      {formData.batch && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {formData.batch}
                        </p>
                      )}
                      {user?.email && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {user.email}
                        </p>
                      )}
                      <label className="mt-1.5 inline-block">
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                          Change photo
                        </span>
                        <input
                          id="profile-picture"
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          disabled={uploadingPfp}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
              <Card className={`${cardClass} ${cardTight}`}>
                <CardHeader className="!pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <FileText className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    Contributions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Manage your uploads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => router.push("/manage-contributions")}
                    variant="default"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                  >
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
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 py-1">
                        None. Pin from homepage.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-zinc-300 dark:border-zinc-700 text-xs"
                        onClick={() => router.push("/")}
                      >
                        Go home
                      </Button>
                    </>
                  ) : (
                    <>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {pinnedCourses.slice(0, 5).map((course) => (
                          <li
                            key={course.id}
                            className="flex items-center justify-between gap-1.5 py-1.5 px-2 rounded border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-800/30"
                          >
                            <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate min-w-0">
                              {course.courseTitle || course.courseCode || "Course"}
                            </span>
                            <div className="flex shrink-0 gap-0.5">
                              {course.courseId != null && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    router.push(`/course/${course.courseId}`)
                                  }
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                onClick={() => handleUnpin(course.id)}
                              >
                                <Heart className="h-3.5 w-3.5 fill-current" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {pinnedCourses.length > 5 && (
                        <p className="text-xs text-zinc-500 pt-1">
                          +{pinnedCourses.length - 5} more on homepage
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-3 lg:space-y-4">
            <Card className={`${cardClass} ${cardTight}`}>
              <CardHeader className="!pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Profile details</CardTitle>
                    <CardDescription className="text-xs">Name, batch, role</CardDescription>
                  </div>
                  {!editing ? (
                    <Button size="sm" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(false)
                          setFormData({
                            full_name: user?.fullName || "",
                            batch: user?.batch || "",
                            admin_request: !!(user?.userReq ?? user?.adminRequest),
                          })
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {editing && (
                <CardContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="full_name" className="text-xs">
                        Full name
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange("full_name", e.target.value)}
                        placeholder="Name"
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="batch" className="text-xs">
                        Batch
                      </Label>
                      <Input
                        id="batch"
                        value={formData.batch}
                        onChange={(e) => handleInputChange("batch", e.target.value)}
                        placeholder="e.g. 2024"
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        user?.role && user.role.toLowerCase().includes("admin")
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {user?.role || "user"}
                    </Badge>
                    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        id="admin_request"
                        checked={formData.admin_request}
                        onChange={(e) => handleInputChange("admin_request", e.target.checked)}
                        className="rounded"
                      />
                      Help with moderation
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {user?.createdAt
                      ? `Joined ${new Date(user.createdAt).toLocaleDateString()}`
                      : ""}
                    {user?.updatedAt
                      ? ` · Updated ${new Date(user.updatedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </CardContent>
              )}
            </Card>

            <Card className={`${cardClass} ${cardTight}`}>
              <CardContent className="py-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Contribute notes and resources to climb the leaderboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
