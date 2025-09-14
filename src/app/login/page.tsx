"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen, Github, Twitch } from "lucide-react"

export default function LoginPage() {

  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const redirectTo = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("redirect") || "/")
        : "/";
        console.log(redirectTo)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      
      // Get redirect parameter from URL query params
      // Get the "redirect" parameter from the URL query params, default to "/"
      const redirectTo = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("redirect") || "/")
        : "/";

        
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
          queryParams: {
            redirect: redirectTo
          }
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubLogin = async () => {
    try {
      setLoading(true)
      const redirectTo = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("redirect") || "/")
        : "/";
      const {error} = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
          queryParams: {
            redirecttt: redirectTo
          }
        },
      })

      console.log(error)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }
  const handleSpotifyLogin  = async () =>{
    try {
      setLoading(true)
      const redirectTo = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("redirect") || "/")
        : "/";
      const {error} = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
          queryParams: {
            redirecttt: redirectTo
          }
        },
      })

      console.log(error)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleTwitchLogin = async () => {
    try {
      setLoading(true)
      const redirectTo = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("redirect") || "/")
        : "/";
      const {error} = await supabase.auth.signInWithOAuth({
        provider: 'twitch',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
          queryParams: {
            redirecttt: redirectTo
          }
        },
      })

      console.log(error)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleDiscordLogin = async () => {
    try {
      setLoading(true)
      const redirectTo = typeof window !== "undefined"
        ? (new URLSearchParams(window.location.search).get("redirect") || "/")
        : "/";
      const {error} = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
          queryParams: {
            redirecttt: redirectTo
          }
        },
      })

      console.log(error)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-4">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white/80 dark:bg-zinc-900/80 shadow-2xl rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 backdrop-blur-lg">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="text-indigo-500 dark:text-indigo-300 h-8 w-8" />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
            Welcome Back
          </h1>
        </div>

        <p className="text-zinc-600 dark:text-zinc-300 mb-8 text-center">
          Sign in to access your course content and resources
        </p>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 shadow-md hover:shadow-lg transition-all duration-200 h-12"
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-base font-medium">
                {loading ? "Signing in..." : "Continue with Google"}
              </span>
            </div>
          </Button>
          <Button
            onClick={handleGitHubLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 shadow-md hover:shadow-lg transition-all duration-200 h-12"
          >
            <div className="flex items-center justify-center gap-3">
              <Github/>
              <span className="text-base font-medium">
                {loading ? "Signing in..." : "Continue with GitHub"}
              </span>
            </div>
          </Button>
          <Button
            onClick={handleSpotifyLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 shadow-md hover:shadow-lg transition-all duration-200 h-12"
          >
            <div className="flex items-center justify-center gap-3">
            {/* Spotify logo, theme-aware */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              className="w-5 h-5"
            >
              <circle
                cx="320"
                cy="320"
                r="248"
                className="fill-[#1DB954] dark:fill-white"
              />
              <path
                d="M420.7 436.9C416.5 436.9 413.9 435.6 410 433.3C347.6 395.7 275 394.1 203.3 408.8C199.4 409.8 194.3 411.4 191.4 411.4C181.7 411.4 175.6 403.7 175.6 395.6C175.6 385.3 181.7 380.4 189.2 378.8C271.1 360.7 354.8 362.3 426.2 405C432.3 408.9 435.9 412.4 435.9 421.5C435.9 430.6 428.8 436.9 420.7 436.9z"
                className="fill-[#191414] dark:fill-[#1DB954]"
              />
              <path
                d="M447.6 371.3C442.4 371.3 438.9 369 435.3 367.1C372.8 330.1 279.6 315.2 196.7 337.7C191.9 339 189.3 340.3 184.8 340.3C174.1 340.3 165.4 331.6 165.4 320.9C165.4 310.2 170.6 303.1 180.9 300.2C208.7 292.4 237.1 286.6 278.7 286.6C343.6 286.6 406.3 302.7 455.7 332.1C463.8 336.9 467 343.1 467 351.8C466.9 362.6 458.5 371.3 447.6 371.3z"
                className="fill-[#191414] dark:fill-[#1DB954]"
              />
              <path
                d="M478.6 295.1C473.4 295.1 470.2 293.8 465.7 291.2C394.5 248.7 267.2 238.5 184.8 261.5C181.2 262.5 176.7 264.1 171.9 264.1C158.7 264.1 148.6 253.8 148.6 240.5C148.6 226.9 157 219.2 166 216.6C201.2 206.3 240.6 201.4 283.5 201.4C356.5 201.4 433 216.6 488.9 249.2C496.7 253.7 501.8 259.9 501.8 271.8C501.8 285.4 490.8 295.1 478.6 295.1z"
                className="fill-[#191414] dark:fill-[#1DB954]"
              />
            </svg>
              <span className="text-base font-medium">
                {loading ? "Signing in..." : "Continue with Spotify"}
              </span>
            </div>
          </Button>
          <Button
            onClick={handleTwitchLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 shadow-md hover:shadow-lg transition-all duration-200 h-12"
          >
            <div className="flex items-center justify-center gap-3">
              <Twitch/>
              <span className="text-base font-medium">
                {loading ? "Signing in..." : "Continue with Twitch"}
              </span>
            </div>
          </Button>

          <Button
            onClick={handleDiscordLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 shadow-md hover:shadow-lg transition-all duration-200 h-12"
          >
            <div className="flex items-center justify-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
              <path
                d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z"
                fill="#FFFFFF"
              />
            </svg>
            <span className="text-base font-medium">
                {loading ? "Signing in..." : "Continue with Discord"}
              </span>
            </div>
          </Button>


        </div>
        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400"> We thought it would be funny to collect OAuth providers like they were Pokémon</p>

        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          By continuing, you agree to our{" "}
          <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}
