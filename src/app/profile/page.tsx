"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { User } from '@supabase/supabase-js'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Database } from "@/types/supabase"
import { ChevronDown, ChevronRight, Edit, ExternalLink, Calendar, Users, Github, Link, Unlink } from "lucide-react"

type UserMeta = Database["public"]["Tables"]["user_meta"]["Row"]
type CourseContent = Database["public"]["Tables"]["course_contentnew"]["Row"]
type Course = Database["public"]["Tables"]["coursenew"]["Row"]

interface ContributionWithCourse extends CourseContent {
  course: Course | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [userMeta, setUserMeta] = useState<UserMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [uploadingPfp, setUploadingPfp] = useState(false)
  const [contributions, setContributions] = useState<ContributionWithCourse[]>([])
  const [loadingContributions, setLoadingContributions] = useState(false)
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set())
  const [editingContribution, setEditingContribution] = useState<number | null>(null)
  const [selectedContributions, setSelectedContributions] = useState<Set<number>>(new Set())
  const [showBatchEdit, setShowBatchEdit] = useState(false)
  const [availableTags, setAvailableTags] = useState<{id: number, name: string}[]>([])
  const [updatingTags, setUpdatingTags] = useState(false)
  const [identities, setIdentities] = useState<any[]>([])
  const [loadingIdentities, setLoadingIdentities] = useState(false)
  const [linkingAccount, setLinkingAccount] = useState(false)
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
        router.push("/")
        return
      }
      console.log("User found:", user)
      setUser(user)
      await fetchUserMeta(user.id, user)
      await fetchUserContributions(user.id)
      await fetchAvailableTags()
      await fetchUserIdentities()
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

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

  const fetchUserContributions = async (userId: string) => {
    setLoadingContributions(true)
    try {
      const { data, error } = await supabase
        .from("course_contentnew")
        .select(`
          *,
          course:coursenew(*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching contributions:", error)
        return
      }

      setContributions(data || [])
    } catch (error) {
      console.error("Error fetching contributions:", error)
    } finally {
      setLoadingContributions(false)
    }
  }

  const fetchAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name")
        .order("name")

      if (error) {
        console.error("Error fetching tags:", error)
        return
      }

      setAvailableTags(data || [])
    } catch (error) {
      console.error("Error fetching tags:", error)
    }
  }

  const fetchUserIdentities = async () => {
    setLoadingIdentities(true)
    try {
      const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()
      
      if (identitiesError) {
        console.error("Error fetching identities:", identitiesError)
        return
      }

      console.log(identities);

      setIdentities(identities.identities || [])
    } catch (error) {
      console.error("Error fetching identities:", error)
    } finally {
      setLoadingIdentities(false)
    }
  }

  const handleLinkGitHub = async () => {
    setLinkingAccount(true)
    try {
      const { error } = await supabase.auth.linkIdentity({ provider: 'github' })
      
      if (error) {
        console.error("Error linking GitHub account:", error)
        alert("Error linking GitHub account: " + error.message)
        return
      }

      // Refresh identities after successful linking
      await fetchUserIdentities()
      alert("GitHub account linked successfully!")
    } catch (error) {
      console.error("Error linking GitHub account:", error)
      alert("Error linking GitHub account")
    } finally {
      setLinkingAccount(false)
    }
  }

  const handleBatchTagUpdate = async (tagIds: number[]) => {
    if (selectedContributions.size === 0) return

    setUpdatingTags(true)
    try {
      const contributionIds = Array.from(selectedContributions)
      
      // Update each selected contribution
      for (const contributionId of contributionIds) {
        const { error } = await supabase
          .from("course_contentnew")
          .update({ tag_ids: tagIds })
          .eq("id", contributionId)

        if (error) {
          console.error(`Error updating contribution ${contributionId}:`, error)
          throw error
        }
      }

      // Refresh contributions
      if (user) {
        await fetchUserContributions(user.id)
      }
      
      setSelectedContributions(new Set())
      setShowBatchEdit(false)
      alert(`Successfully updated tags for ${contributionIds.length} contribution${contributionIds.length > 1 ? 's' : ''}!`)
    } catch (error) {
      console.error("Error updating tags:", error)
      alert("Error updating tags")
    } finally {
      setUpdatingTags(false)
    }
  }

  const toggleContributionSelection = (contributionId: number) => {
    const newSelected = new Set(selectedContributions)
    if (newSelected.has(contributionId)) {
      newSelected.delete(contributionId)
    } else {
      newSelected.add(contributionId)
    }
    setSelectedContributions(newSelected)
  }

  const selectAllInCourse = (courseContributions: ContributionWithCourse[]) => {
    const newSelected = new Set(selectedContributions)
    courseContributions.forEach(contribution => {
      newSelected.add(contribution.id)
    })
    setSelectedContributions(newSelected)
  }

  const toggleCourseExpansion = (courseId: number) => {
    const newExpanded = new Set(expandedCourses)
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId)
    } else {
      newExpanded.add(courseId)
    }
    setExpandedCourses(newExpanded)
  }

  const handleEditContribution = async (contributionId: number, updates: Partial<CourseContent>) => {
    try {
      const { error } = await supabase
        .from("course_contentnew")
        .update(updates)
        .eq("id", contributionId)

      if (error) {
        console.error("Error updating contribution:", error)
        alert("Error updating contribution")
        return
      }

      // Refresh contributions
      if (user) {
        await fetchUserContributions(user.id)
      }
      setEditingContribution(null)
      alert("Contribution updated successfully!")
    } catch (error) {
      console.error("Error updating contribution:", error)
      alert("Error updating contribution")
    }
  }

  const groupContributionsByCourse = () => {
    const grouped = contributions.reduce((acc, contribution) => {
      const courseId = contribution.course_id || 0
      const courseName = contribution.course?.title || "Unknown Course"
      console.log(courseName)
      
      if (!acc[courseId]) {
        acc[courseId] = {
          course: contribution.course,
          contributions: []
        }
      }
      acc[courseId].contributions.push(contribution)
      return acc
    }, {} as Record<number, { course: Course | null, contributions: ContributionWithCourse[] }>)

    return Object.entries(grouped).map(([courseId, data]) => ({
      courseId: parseInt(courseId),
      ...data
    }))
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
        alert("Error updating profile")
        return
      }

      // Refresh user meta data
      await fetchUserMeta(user.id, user)
      setEditing(false)
      alert("Profile updated successfully!")
    } catch (error) {
      console.error("Error:", error)
      alert("Error updating profile")
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
        alert("Error updating profile picture")
        return
      }

      // Refresh user meta data
      await fetchUserMeta(user.id, user)
      alert("Profile picture updated successfully!")
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      alert("Error uploading profile picture")
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
      alert('Please select an image file')
      return
    }

    // Check file size (limit to 10MB before processing)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large. Please select an image smaller than 10MB.')
      return
    }

    try {
      setUploadingPfp(true)
      const processedFile = await processImage(file)
      await handleProfilePictureUpload(processedFile)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('Error processing image. Please try a different file.')
    } finally {
      // uploadingPfp will be set to false in handleProfilePictureUpload
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="mt-4 text-lg">Loading profile...</p>
              </div>
    </div>
  )
}

// Contribution Edit Form Component
interface ContributionEditFormProps {
  contribution: ContributionWithCourse
  onSave: (updates: Partial<CourseContent>) => void
  onCancel: () => void
}

function ContributionEditForm({ contribution, onSave, onCancel }: ContributionEditFormProps) {
  const [formData, setFormData] = useState({
    title: contribution.title,
    batch: contribution.batch,
    year: contribution.year,
    semester_number: contribution.semester_number
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="edit-title" className="text-sm">Title</Label>
          <Input
            id="edit-title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Content title"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="edit-batch" className="text-sm">Batch</Label>
          <Input
            id="edit-batch"
            value={formData.batch}
            onChange={(e) => setFormData(prev => ({ ...prev, batch: e.target.value }))}
            placeholder="Batch"
            className="text-sm"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-year" className="text-sm">Year</Label>
          <Input
            id="edit-year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
            placeholder="Year"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="edit-semester" className="text-sm">Semester</Label>
          <Input
            id="edit-semester"
            type="number"
            value={formData.semester_number}
            onChange={(e) => setFormData(prev => ({ ...prev, semester_number: parseInt(e.target.value) }))}
            placeholder="Semester"
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button type="submit" size="sm" className="text-xs sm:text-sm">
          Save Changes
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs sm:text-sm">
          Cancel
        </Button>
      </div>
    </form>
  )
}

// Batch Tag Selector Component
interface BatchTagSelectorProps {
  availableTags: {id: number, name: string}[]
  onSave: (tagIds: number[]) => void
  onCancel: () => void
  updating: boolean
}

function BatchTagSelector({ availableTags, onSave, onCancel, updating }: BatchTagSelectorProps) {
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSave = () => {
    onSave(selectedTags)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Select Tags</Label>
        <p className="text-xs text-gray-500 mb-3">
          Choose tags to apply to all selected contributions. This will replace existing tags.
        </p>
        <div className="flex flex-wrap gap-1 sm:gap-2 max-h-32 sm:max-h-40 overflow-y-auto">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border transition-colors ${
                selectedTags.includes(tag.id)
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button 
          onClick={handleSave} 
          disabled={updating}
          size="sm"
          className="text-xs sm:text-sm"
        >
          {updating ? "Updating..." : "Update Tags"}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={updating}
          size="sm"
          className="text-xs sm:text-sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent hover:bg-gray-50 dark:hover:bg-gray-800 p-2 sm:p-4"
            >
              NotesBhej
            </Button>
            <Button
              onClick={() => supabase.auth.signOut()}
              variant="outline"
              size="sm"
              className="w-fit self-start sm:self-auto"
            >
              Sign Out
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl ml-2 sm:ml-4 font-bold">Profile</h1>
        </div>

        {/* Profile Picture and Basic Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Profile Picture & Basic Info</CardTitle>
            <CardDescription className="text-sm">Your account details and profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 sm:gap-6">
              <div className="relative flex-shrink-0">
                {userMeta?.profile_picture_url ? (
                  <Image 
                    src={userMeta.profile_picture_url} 
                    alt="Profile picture"
                    width={100}
                    height={100}
                    className="w-20 h-20 sm:w-[120px] sm:h-[120px] rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-[120px] sm:h-[120px] rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-2xl sm:text-4xl font-semibold text-gray-600 dark:text-gray-300">
                      {formData.full_name.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                {uploadingPfp && (
                  <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 w-full">
                <Label htmlFor="profile-picture" className="text-sm font-medium">Profile Picture</Label>
                <input
                  id="profile-picture"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploadingPfp}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs sm:text-sm text-gray-500">Upload a new profile picture - will be automatically cropped to square and resized to 400x400px</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm">Email</Label>
                <Input value={user?.email || ""} disabled className="bg-gray-50 dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <Label className="text-sm">User ID</Label>
                <Input value={user?.id || ""} disabled className="bg-gray-50 dark:bg-gray-800 text-sm break-all" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl">Profile Details</CardTitle>
                <CardDescription className="text-sm">Manage your profile information</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {editing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(false)
                        // Reset form data
                        setFormData({
                          full_name: userMeta?.full_name || "",
                          batch: userMeta?.batch || "",
                          role: userMeta?.role || "",
                          admin_request: userMeta?.admin_request || false
                        })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      size="sm"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)} size="sm">
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {editing && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="full_name" className="text-sm">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    disabled={!editing}
                    placeholder="Enter your full name"
                    className="text-sm"
                  />
                </div>
                
                <div>
                  <Label htmlFor="batch" className="text-sm">Batch</Label>
                  <Input
                    id="batch"
                    value={formData.batch}
                    onChange={(e) => handleInputChange("batch", e.target.value)}
                    disabled={!editing}
                    placeholder="e.g., 2024, B.Tech 2021-2025"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm">Role</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={userMeta?.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {userMeta?.role || 'user'}
                    </Badge>
                    <span className="text-xs text-gray-500">(Cannot be edited)</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Admin Request</Label>
                  <div className="flex items-start gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="admin_request"
                      checked={formData.admin_request}
                      onChange={(e) => handleInputChange("admin_request", e.target.checked)}
                      disabled={!editing}
                      className="rounded mt-0.5"
                    />
                    <Label htmlFor="admin_request" className="text-xs sm:text-sm leading-relaxed">
                      I am willing to help with the moderation of the platform    
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <Label className="text-sm">Account Created</Label>
                  <p>{userMeta?.created_at ? new Date(userMeta.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm">Last Updated</Label>
                  <p>{userMeta?.updated_at ? new Date(userMeta.updated_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* User Contributions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              My Contributions
            </CardTitle>
            <CardDescription className="text-sm">
              Documents and resources you&apos;ve contributed to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingContributions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                <span className="ml-2 text-sm">Loading contributions...</span>
              </div>
            ) : contributions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">No contributions yet</p>
                <p className="text-xs sm:text-sm">Start by adding content to courses!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Total contributions: {contributions.length}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedContributions.size > 0 && (
                      <>
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {selectedContributions.size} selected
                        </span>
                        <Button
                          size="sm"
                          onClick={() => setShowBatchEdit(true)}
                          disabled={updatingTags}
                          className="text-xs"
                        >
                          Edit Tags
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedContributions(new Set())}
                          className="text-xs"
                        >
                          Clear
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Batch Tag Edit Dialog */}
                {showBatchEdit && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                      <h3 className="text-base sm:text-lg font-semibold mb-4">
                        Edit Tags for {selectedContributions.size} Contribution{selectedContributions.size > 1 ? 's' : ''}
                      </h3>
                      <BatchTagSelector
                        availableTags={availableTags}
                        onSave={handleBatchTagUpdate}
                        onCancel={() => setShowBatchEdit(false)}
                        updating={updatingTags}
                      />
                    </div>
                  </div>
                )}
                
                {groupContributionsByCourse().map(({ courseId, course, contributions: courseContributions }) => (
                  <div key={courseId} className="border rounded-lg">
                    <button
                      onClick={() => toggleCourseExpansion(courseId)}
                      className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        {expandedCourses.has(courseId) ? (
                          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        )}
                        <div className="text-left min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base truncate">
                            {course?.title || "Unknown Course"}
                          </h3>
                          {course?.code && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {course.code}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          {courseContributions.length}
                        </Badge>
                        {expandedCourses.has(courseId) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              selectAllInCourse(courseContributions)
                            }}
                            className="text-xs p-1 sm:p-2 hidden sm:inline-flex"
                          >
                            Select All
                          </Button>
                        )}
                      </div>
                    </button>
                    
                    {expandedCourses.has(courseId) && (
                      <div className="border-t">
                        {/* Mobile Select All Button */}
                        <div className="p-3 border-b bg-gray-50 dark:bg-gray-800 sm:hidden">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => selectAllInCourse(courseContributions)}
                            className="text-xs w-full"
                          >
                            Select All in This Course
                          </Button>
                        </div>
                        {courseContributions.map((contribution) => (
                          <div key={contribution.id} className="p-3 sm:p-4 border-b last:border-b-0">
                            {editingContribution === contribution.id ? (
                              <ContributionEditForm
                                contribution={contribution}
                                onSave={(updates) => handleEditContribution(contribution.id, updates)}
                                onCancel={() => setEditingContribution(null)}
                              />
                            ) : (
                              <div className="flex items-start gap-3 sm:gap-4">
                                <input
                                  type="checkbox"
                                  checked={selectedContributions.has(contribution.id)}
                                  onChange={() => toggleContributionSelection(contribution.id)}
                                  className="mt-1 rounded flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm sm:text-base">{contribution.title}</h4>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(contribution.created_at).toLocaleDateString()}
                                    </span>
                                    <span>Batch: {contribution.batch}</span>
                                    <span>Year: {contribution.year}</span>
                                    <span>Sem: {contribution.semester_number}</span>
                                  </div>
                                  {/* Display current tags */}
                                  {contribution.tag_ids && contribution.tag_ids.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {contribution.tag_ids.map((tagId) => {
                                        const tag = availableTags.find(t => t.id === tagId)
                                        return tag ? (
                                          <span
                                            key={tagId}
                                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                                          >
                                            {tag.name}
                                          </span>
                                        ) : null
                                      })}
                                    </div>
                                  )}
                                  {contribution.resource_url && (
                                    <a
                                      href={contribution.resource_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      View Resource
                                    </a>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingContribution(contribution.id)}
                                  className="flex-shrink-0"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Account Information</CardTitle>
            <CardDescription className="text-sm">Additional account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm">Last Sign In</Label>
                <p className="text-xs sm:text-sm">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm">Email Confirmed</Label>
                <p className="text-xs sm:text-sm">{user?.email_confirmed_at ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Connected Accounts</CardTitle>
            <CardDescription className="text-sm">Manage your linked social accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingIdentities ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                <span className="ml-2 text-sm">Loading connected accounts...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* GitHub Account */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Github className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">GitHub</p>
                      <p className="text-xs text-gray-500">
                        {identities.find(identity => identity.provider === 'github') 
                          ? `Connected as ${identities.find(identity => identity.provider === 'github')?.identity_data?.user_name || 'GitHub user'}`
                          : 'Not connected'
                        }
                      </p>
                    </div>
                  </div>
                  <div>
                    {identities.find(identity => identity.provider === 'github') ? (
                      <Badge variant="secondary" className="text-xs">
                        <Link className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleLinkGitHub}
                        disabled={linkingAccount}
                        className="text-xs"
                      >
                        {linkingAccount ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Linking...
                          </>
                        ) : (
                          <>
                            <Link className="h-3 w-3 mr-1" />
                            Link GitHub
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Email Account (always present) */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">@</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">Email</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <Link className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                </div>

                {identities.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No additional accounts connected</p>
                    <p className="text-xs">Link your GitHub account to enhance your profile</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
