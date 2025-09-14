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
import {  Github, Link, Unlink, Trophy, Plus, Twitch } from "lucide-react"
import { toast } from "sonner"

// Provider configuration
const PROVIDERS: { id: string; label: string; Icon?: any }[] = [
  { id: 'github', label: 'GitHub', Icon: Github },
  { id: 'google', label: 'Google' /* add icon if you want */ },
  { id: 'spotify', label: 'Spotify' /* add icon if you want */ },
  {id: 'twitch', label: 'Twitch', Icon: Twitch },
  {id: 'discord', label:'Discord'
  },
  // add more providers here as needed
]

type UserMeta = Database["public"]["Tables"]["user_meta"]["Row"]



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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/manage-contributions')}
                  className="text-xs sm:text-sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Manage Contributions
                </Button>
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

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
              Achievements
            </CardTitle>
            <CardDescription className="text-sm">
              Your accomplishments and milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Trophy className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm sm:text-base">No achievements yet</p>
              <p className="text-xs sm:text-sm">Start contributing to earn your first achievement!</p>
            </div>
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

        {/* Connected Accounts (REWRITTEN) */}
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
                {PROVIDERS.map((p) => {
                  const identity = identities.find((i: any) => i.provider === p.id)
                  const connected = !!identity
                  const connectedAs = identity?.identity_data?.user_name
                    || identity?.identity_data?.full_name
                    || identity?.identity_data?.email
                    || ''
                  
                  const displayText = connected ? `Connected${connectedAs ? ` as ${connectedAs}` : ''}` : 'Not connected'
                  
                  // Check if this is the last identity (since we're ignoring email)
                  const isLastIdentity = identities.length === 1 && connected
                  
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {p.Icon ? <p.Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" /> : null}
                        <div>
                          <p className="font-medium text-sm">{p.label}</p>
                          <p className="text-xs text-gray-500">{displayText}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {connected ? (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              <Link className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleUnlinkAccount(p.id)} 
                              disabled={isLastIdentity}
                              className="text-xs"
                              title={isLastIdentity ? "Cannot unlink your last authentication method" : ""}
                            >
                              <Unlink className="h-3 w-3 mr-1" /> Unlink
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => handleLinkProvider(p.id)} disabled={linkingAccount} className="text-xs">
                            {linkingAccount ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Linking...
                              </>
                            ) : (
                              <>
                                <Link className="h-3 w-3 mr-1" /> Link {p.label}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {identities.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No additional accounts connected</p>
                    <p className="text-xs">Link your accounts to enhance your profile</p>
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
