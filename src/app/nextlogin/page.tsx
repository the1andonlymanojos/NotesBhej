"use client"

import { Suspense, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BookOpen } from "lucide-react"
import { getApiBaseUrl } from "@/lib/api/client"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function UnauthorizedDomainWatcher({
  onUnauthorizedDomain,
}: {
  onUnauthorizedDomain: (cleanHref: string) => void
}) {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams?.get("error") === "unauthorized_domain") {
      const redirect = searchParams.get("redirect")
      const cleanHref = redirect
        ? `/nextlogin?redirect=${encodeURIComponent(redirect)}`
        : "/nextlogin"
      onUnauthorizedDomain(cleanHref)
    }
  }, [onUnauthorizedDomain, searchParams])

  return null
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [unauthorizedDomainOpen, setUnauthorizedDomainOpen] = useState(false)
  const [cleanLoginHref, setCleanLoginHref] = useState("/nextlogin")
  const router = useRouter()

  const handleUnauthorizedDomainDialogChange = (open: boolean) => {
    setUnauthorizedDomainOpen(open)
    if (!open) {
      router.replace(cleanLoginHref)
    }
  }

  const handleGoogleLogin = () => {
    const redirectTo =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("redirect") || "/"
        : "/"
    setLoading(true)
    window.location.href = `${getApiBaseUrl()}/auth/google?redirect=${encodeURIComponent(redirectTo)}`
  }

  return (
    <div className="min-h-screen  dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/60 flex flex-col items-center justify-center transition-colors duration-500 p-4">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <Suspense fallback={null}>
        <UnauthorizedDomainWatcher
          onUnauthorizedDomain={(href) => {
            setCleanLoginHref(href)
            setUnauthorizedDomainOpen(true)
          }}
        />
      </Suspense>

      <Dialog open={unauthorizedDomainOpen} onOpenChange={handleUnauthorizedDomainDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Use your college email</DialogTitle>
            <DialogDescription>
              Listen up; please sign in using your college ID email ending with{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">@iiitm.ac.in</span>.
              <br />
              <br />
              We do this to make sure only IIITM students can access the content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleUnauthorizedDomainDialogChange(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        </div>

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
