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

interface TopContributorRpcResponse {
  user_id: string
  full_name: string | null
  profile_picture_url: string | null
  batch: string | null
  contribution_count: number
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
      // Get users with their contribution counts using aggregation
      const { data: users, error: usersError } = await supabase.rpc('top_contributors', { limit_count: 10 });

      if (usersError) {
        console.error("Error fetching leaderboard:", usersError)
        setLoading(false)
        return
      }

      if (!users || users.length === 0) {
        setLeaderboard([])
        setLoading(false)
        return
      }

      // Transform the data to our LeaderboardEntry format
      const leaderboardData: LeaderboardEntry[] = (users as TopContributorRpcResponse[]).map(user => ({
        user_id: user.user_id,
        full_name: user.full_name,
        profile_picture_url: user.profile_picture_url,
        batch: user.batch,
        contribution_count: user.contribution_count,
        rank: 0 // Will be assigned after sorting
      }))

      // Sort by contribution count and assign ranks
      leaderboardData.sort((a, b) => b.contribution_count - a.contribution_count)
      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1
      })

      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
      default:
        return <span className="h-5 w-5 md:h-6 md:w-6 flex items-center justify-center text-sm md:text-lg font-bold text-gray-600 dark:text-gray-400">#{rank}</span>
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="mt-4 text-base md:text-lg">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-3 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent hover:bg-gray-50 dark:hover:bg-gray-800 p-2"
            >
              NotesBhej
            </Button>
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 md:gap-2"
            >
              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
          <div className="flex items-center gap-2 md:gap-3 ml-2 md:ml-4">
            <Trophy className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
            <h1 className="text-xl md:text-3xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 ml-2 md:ml-4">
            Top contributors to the platform
          </p>
        </div>

        {/* Stats Card */}
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {leaderboard.length}
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Contributors</p>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
                  {leaderboard.reduce((sum, entry) => sum + entry.contribution_count, 0)}
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Contributions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
              Top Contributors
            </CardTitle>
            <CardDescription className="text-sm">
              Ranked by number of contributions to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-gray-500">
                <Users className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm md:text-base">No contributions found</p>
                <p className="text-xs md:text-sm">Be the first to contribute!</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`p-3 md:p-4 rounded-lg border transition-all hover:shadow-md ${getRankColor(entry.rank)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getRankIcon(entry.rank)}
                        </div>
                        
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          {entry.profile_picture_url ? (
                            <Image 
                              src={entry.profile_picture_url} 
                              alt={`${entry.full_name || 'User'}'s profile`}
                              width={40}
                              height={40}
                              className="w-8 h-8 md:w-12 md:h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm md:text-lg font-semibold text-gray-600 dark:text-gray-300">
                                {entry.full_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm md:text-lg truncate">
                              {entry.full_name || 'Anonymous User'}
                            </h3>
                            {entry.batch && (
                              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                                Batch: {entry.batch}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0 ml-2">
                        <Badge 
                          variant={entry.rank <= 3 ? "default" : "secondary"}
                          className="text-xs md:text-sm px-2 py-1 md:px-3"
                        >
                          <span className="hidden sm:inline">{entry.contribution_count} contribution{entry.contribution_count !== 1 ? 's' : ''}</span>
                          <span className="sm:hidden">{entry.contribution_count}</span>
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
          <CardContent className="pt-4 md:pt-6">
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
              Rankings are based on the number of visible contributions to courses. 
              Keep contributing to climb the leaderboard! 🚀
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
