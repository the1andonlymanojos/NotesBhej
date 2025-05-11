"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { User } from '@supabase/supabase-js'
import Image from 'next/image'

export default function ProtectedPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push("/")
        return
      }

      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [router, supabase])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Protected Page</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">User Details</h2>
        
        <div className="space-y-3">
          <p><span className="font-medium">Email:</span> {user?.email}</p>
          <p><span className="font-medium">ID:</span> {user?.id}</p>
          <p><span className="font-medium">Last Sign In:</span> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
          
          {user?.user_metadata && (
            <>
              <p><span className="font-medium">Full Name:</span> {user.user_metadata.full_name}</p>
              {user.user_metadata.avatar_url && (
                <div>
                  <span className="font-medium">Avatar:</span>
                  <Image 
                    src={user.user_metadata.avatar_url} 
                    alt="User avatar"
                    width={80}
                    height={80}
                    className="rounded-full mt-2"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
