"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield, Eye, Database, Cookie, Users, Lock } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function PrivacyPolicy() {
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
              <Shield className="text-indigo-500 dark:text-indigo-300 h-6 w-6" />
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
                NotesBhej Privacy Policy
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Main Content */}
        <div className="bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-6 sm:p-8 mb-8">
          
          {/* Introduction */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Your Privacy Matters (For Real)
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              We're not here to spy on you or sell your data. Mostly because nobody would buy it, 
              but also because we actually care about your privacy.
            </p>
          </div>

          {/* Privacy Sections */}
          <div className="space-y-6">
            
            {/* What We Collect */}
            <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  What We Actually Collect
                </h3>
              </div>
              <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
                <p><strong>Account Info:</strong> Your email, name, and profile picture (if you choose to add one)</p>
                <p><strong>Course Data:</strong> Which courses you pin, what you upload, and your interaction history</p>
                <p><strong>Usage Logs:</strong> How you navigate the site, what features you use, and when things break</p>
                <p><strong>Technical Stuff:</strong> Your IP address, browser type, and device info (standard web stuff)</p>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">
                We don't collect your browsing history outside our site, your personal files, or your deepest fears about exams.
              </p>
            </div>

            {/* Why We Collect */}
            <div className="bg-green-50/50 dark:bg-green-950/30 rounded-lg p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Why We Need This Stuff
                </h3>
              </div>
              <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
                <p><strong>Better UX:</strong> Understanding how you use the platform helps us make it less terrible</p>
                <p><strong>Bug Fixes:</strong> Logs help us figure out why things randomly stop working at 3 AM</p>
                <p><strong>Security:</strong> Detecting weird login patterns and protecting against spam</p>
                <p><strong>Features:</strong> Knowing what you actually use vs. what we think is cool</p>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">
                Basically, we want to make NotesBhej not suck. Your data helps us achieve this noble goal.
              </p>
            </div>

            {/* What We Don't Do */}
            <div className="bg-red-50/50 dark:bg-red-950/30 rounded-lg p-6 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  What We DON'T Do (Promise)
                </h3>
              </div>
              <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
                <p><strong>Sell Your Data:</strong> Nobody wants to buy "student pinned Calculus 101 at 2 AM" anyway</p>
                <p><strong>Spam You:</strong> We won't email you about hot singles in your area or crypto opportunities</p>
                <p><strong>Share Without Permission:</strong> Your course preferences stay between you and us</p>
                <p><strong>Track You Everywhere:</strong> We don't follow you around the internet like a creepy ex</p>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">
                We're a course sharing platform, not a surveillance operation. We have neither the resources nor the desire to be Big Brother.
              </p>
            </div>

            {/* Cookies */}
            <div className="bg-orange-50/50 dark:bg-orange-950/30 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3 mb-4">
                <Cookie className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Cookies (The Digital Kind)
                </h3>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                We use cookies to keep you logged in, remember your theme preference, and track basic analytics. 
                No third-party tracking cookies that follow you around – we're not that sophisticated.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You can disable cookies in your browser, but then you'll have to log in every time and see the light theme. 
                Nobody wants that.
              </p>
            </div>

            {/* Data Security */}
            <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  How We Protect Your Stuff
                </h3>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                We use industry-standard security measures: encrypted connections, secure authentication, 
                and passwords that aren't "password123". Your data is stored on secure servers, not on a laptop in someone's dorm room.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                That said, no system is 100% secure. If we get hacked, we'll let you know faster than your professor posts grades.
              </p>
            </div>

            {/* Your Rights */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Your Rights (You Have Them!)
                </h3>
              </div>
              <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
                <p><strong>Access:</strong> Ask us what data we have about you (spoiler: it's not much)</p>
                <p><strong>Correction:</strong> Fix any wrong info in your profile</p>
                <p><strong>Deletion:</strong> Delete your account and data (we'll miss you though)</p>
                <p><strong>Portability:</strong> Get a copy of your data in a readable format</p>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">
                Just shoot us a message if you want to exercise any of these rights. We actually respond, unlike some companies.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Last updated: {new Date().toLocaleDateString()} • Effective immediately
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              Questions about this policy? Think we missed something important? Just want to chat about privacy? 
              Drop us a line. We're more responsive than your academic advisor.
            </p>
            
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>TL;DR:</strong> We collect basic stuff to make the site work better, we don't sell your data because who would buy it, 
                and we actually care about keeping your information safe. Be nice, and we'll be nice back.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => router.push('/')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
              >
                Got It, Take Me Home
              </Button>
              <Button
                onClick={() => router.push('/tos')}
                variant="outline"
                className="px-6 py-2"
              >
                Read Terms of Service
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 