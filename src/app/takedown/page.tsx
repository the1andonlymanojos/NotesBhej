"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Flag, Mail, ShieldAlert, FileText } from "lucide-react"

const TAKEDOWN_EMAIL = "mshivagange@gmail.com"

export default function TakedownPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ff] to-[#f0fdfa] dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a] transition-colors duration-500 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Flag className="text-indigo-500 dark:text-indigo-300 h-6 w-6" />
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
                Takedown Policy
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Main Content */}
        <div className="bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-6 sm:p-8 mb-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Report content for removal
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              NotesBhej is a community archive. Most content is uploaded by users. If something shouldn&apos;t be here,
              let me know and I&apos;ll take it down.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  How to request a takedown
                </h3>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                Email{" "}
                <Link
                  href={`mailto:${TAKEDOWN_EMAIL}`}
                  className="font-medium text-indigo-700 dark:text-indigo-300 underline underline-offset-4"
                >
                  {TAKEDOWN_EMAIL}
                </Link>{" "}
                with the offending content and enough details for me to find it quickly.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-zinc-700 dark:text-zinc-300">
                <li>Link(s) to the content (URL), and the course/page it appears on</li>
                <li>A short description of what the content is</li>
                <li>Why it should be removed (copyright, privacy, restricted material, etc.)</li>
                <li>If relevant, proof that you own the rights or are authorized to act</li>
              </ul>
            </div>

            <div className="bg-orange-50/50 dark:bg-orange-950/30 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  What happens after you email
                </h3>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300">
                I review requests and may remove or disable access to the reported material. I may also reach out for
                clarification if the report doesn&apos;t include enough info to locate the content.
              </p>
            </div>

            <div className="bg-red-50/50 dark:bg-red-950/30 rounded-lg p-6 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Disclaimer
                </h3>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300">
                NotesBhej hosts user-uploaded content. Uploaders are responsible for what they submit. This page is a
                simple way to report and request removal of content you believe is inappropriate or unlawful. This is
                not legal advice.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/")} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2">
                Go Home
              </Button>
              <Button asChild variant="outline" className="px-6 py-2">
                <Link href={`mailto:${TAKEDOWN_EMAIL}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email takedown request
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

