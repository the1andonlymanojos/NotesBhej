"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Users, ArrowLeft } from "lucide-react"

interface LeaderboardEntry {
  user_id: string
  full_name: string | null
  profile_picture_url: string | null
  batch: string | null
  contribution_count: number
  rank: number
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  const fetchLeaderboardData = async () => {
    setLoading(true)
    try {
      // Query to get user contribution counts
      const { data, error } = await supabase
        .rpc('get_user_contribution_counts')

      if (error) {
        console.error("Error with RPC, falling back to manual query:", error)
        await fetchLeaderboardManually()
        return
      }

      setLeaderboard(data || [])
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
      // Fallback to manual query
      await fetchLeaderboardManually()
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaderboardManually = async () => {
    try {
      // Get all users with their metadata
      const { data: users, error: usersError } = await supabase
        .from("user_meta")
        .select("user_id, full_name, profile_picture_url, batch")

      if (usersError) {
        console.error("Error fetching users:", usersError)
        return
      }

      // Get contribution counts for each user
      const leaderboardPromises = users.map(async (user) => {
        const { count, error } = await supabase
          .from("course_contentnew")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.user_id)
          .eq("visible", true) // Only count visible contributions

        if (error) {
          console.error(`Error counting contributions for user ${user.user_id}:`, error)
          return null
        }

        return {
          user_id: user.user_id,
          full_name: user.full_name,
          profile_picture_url: user.profile_picture_url,
          batch: user.batch,
          contribution_count: count || 0,
          rank: 0 // Will be assigned after sorting
        }
      })

      const results = await Promise.all(leaderboardPromises)
      const validResults = results.filter((result): result is LeaderboardEntry => 
        result !== null && result.contribution_count > 0
      )

      // Sort by contribution count and assign ranks
      validResults.sort((a, b) => b.contribution_count - a.contribution_count)
      validResults.forEach((entry, index) => {
        entry.rank = index + 1
      })

      setLeaderboard(validResults)
    } catch (error) {
      console.error("Error in manual leaderboard fetch:", error)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="h-6 w-6 flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-400">#{rank}</span>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700"
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20 border-gray-200 dark:border-gray-600"
      case 3:
        return "bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700"
      default:
        return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="mt-4 text-lg">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              NotesBhej
            </Button>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 ml-4">
            Top contributors to the platform
          </p>
        </div>

        {/* Stats Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {leaderboard.length}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Contributors</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {leaderboard.reduce((sum, entry) => sum + entry.contribution_count, 0)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Contributions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Contributors
            </CardTitle>
            <CardDescription>
              Ranked by number of contributions to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No contributions found</p>
                <p className="text-sm">Be the first to contribute!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`p-4 rounded-lg border transition-all hover:shadow-md ${getRankColor(entry.rank)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(entry.rank)}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {entry.profile_picture_url ? (
                            <Image 
                              src={entry.profile_picture_url} 
                              alt={`${entry.full_name || 'User'}'s profile`}
                              width={48}
                              height={48}
                              className="rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                                {entry.full_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          
                          <div>
                            <h3 className="font-semibold text-lg">
                              {entry.full_name || 'Anonymous User'}
                            </h3>
                            {entry.batch && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Batch: {entry.batch}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge 
                          variant={entry.rank <= 3 ? "default" : "secondary"}
                          className="text-lg px-3 py-1"
                        >
                          {entry.contribution_count} contribution{entry.contribution_count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Rankings are based on the number of visible contributions to courses. 
              Keep contributing to climb the leaderboard! 🚀
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
