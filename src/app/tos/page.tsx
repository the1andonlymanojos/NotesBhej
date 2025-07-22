"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BookOpen, ArrowLeft, Heart, Coffee, AlertTriangle, CheckCircle, Users, Shield, Zap } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function TermsOfService() {
  const router = useRouter()
  const [agreedSections, setAgreedSections] = useState<Set<number>>(new Set())

  const toggleSection = (sectionId: number) => {
    const newSet = new Set(agreedSections)
    if (newSet.has(sectionId)) {
      newSet.delete(sectionId)
    } else {
      newSet.add(sectionId)
    }
    setAgreedSections(newSet)
  }

  const allSectionsAgreed = agreedSections.size === 8 // Update this number if you add more sections

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
              <BookOpen className="text-indigo-500 dark:text-indigo-300 h-6 w-6" />
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-sky-400 dark:from-indigo-300 dark:via-fuchsia-400 dark:to-sky-300 bg-clip-text text-transparent">
                NotesBhej Terms of Service
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
              Welcome to the Fine Print!
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Don't worry, we promise this won't be as boring as your Constitutional Law readings. 
              We've tried to make this as painless as possible while still covering our legal bases.
            </p>
          </div>

          {/* Terms Sections */}
          <div className="space-y-6">
            
            {/* Section 1 - Content Rules (moved to first) */}
            <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      1. Content Rules (Don't Be That Person)
                    </h3>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                    Keep uploads educational and relevant. Don't share content your professor explicitly asks you not to distribute - like certain exam papers or restricted materials. Respect copyright and avoid anything inappropriate.
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    We reserve the right to remove content that violates these terms or common sense.
                  </p>
                </div>
                <button
                  onClick={() => toggleSection(1)}
                  className="ml-4 p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {agreedSections.has(1) ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <div className="h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Section 2 - What Is This Place */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      2. What Even Is This Place?
                    </h3>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                    NotesBhej is your friendly neighborhood course material archive for IIIT-Gwalior. 
                    Think of us as the digital equivalent of that one friend who always has their notes organized 
                    and actually shares them. We're here to help students access, share, and organize course materials 
                    without the drama of "Did you get the notes from yesterday?"
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    By using our platform, you acknowledge that we're not responsible if our notes are better 
                    than your professor's handwriting. That's just science.
                  </p>
                </div>
                <button
                  onClick={() => toggleSection(2)}
                  className="ml-4 p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  {agreedSections.has(2) ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <div className="h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Section 3 - Account & Pin Button */}
            <div className="bg-green-50/50 dark:bg-green-950/30 rounded-lg p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      3. Your Account & The Sacred Pin Button
                    </h3>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                    You're responsible for keeping your account secure. Don't share your password like it's 
                    the answers to the final exam. Also, we're not responsible if you get emotionally attached 
                    to the courses you pin – that heart button is dangerously addictive.
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Pro tip: If you pin every single course, you defeat the purpose. It's like highlighting 
                    everything in your textbook – technically possible, but not very helpful.
                  </p>
                </div>
                <button
                  onClick={() => toggleSection(3)}
                  className="ml-4 p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                  {agreedSections.has(3) ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <div className="h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Coffee className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      4. Academic Integrity & Coffee-Fueled Honesty
                    </h3>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                    We're here to help you learn, not to help you cheat. Use our materials responsibly – 
                    they're meant to supplement your learning, not replace actually attending classes 
                    (though we understand the temptation after a 8 AM lecture).
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Remember: Your professor can tell the difference between understanding the material 
                    and copy-pasting from our platform. Trust us, they've seen it all.
                  </p>
                </div>
                <button
                  onClick={() => toggleSection(4)}
                  className="ml-4 p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                >
                  {agreedSections.has(4) ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <div className="h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-orange-50/50 dark:bg-orange-950/30 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      5. Disclaimers (The "It's Not Our Fault" Section)
                    </h3>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                    We provide this service "as is" – like that printer in the computer lab that works 
                    60% of the time. We can't guarantee that our platform will be available 24/7, 
                    especially during exam week when everyone suddenly remembers they need notes.
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    We're also not responsible if the notes you find here are better than what you took yourself. 
                    That's a personal growth opportunity, not a lawsuit.
                  </p>
                </div>
                <button
                  onClick={() => toggleSection(5)}
                  className="ml-4 p-2 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                >
                  {agreedSections.has(5) ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <div className="h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-pink-50/50 dark:bg-pink-950/30 rounded-lg p-6 border border-pink-200 dark:border-pink-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      6. Privacy & Data (We're Not Creepy, Promise)
                    </h3>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                    We collect minimal data – basically just what you give us and how you use the platform. 
                    We won't sell your information to spam companies or use it to figure out when you're 
                    most likely to impulse-buy textbooks.
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Your course preferences and study habits are safe with us. We're more interested in 
                    helping you learn than in knowing you browsed "Advanced Calculus" at 3 AM.
                  </p>
                </div>
                <button
                  onClick={() => toggleSection(6)}
                  className="ml-4 p-2 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors"
                >
                  {agreedSections.has(6) ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <div className="h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Section 7 */}
            <div className="bg-cyan-50/50 dark:bg-cyan-950/30 rounded-lg p-6 border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      7. Changes to These Terms (The Fine Print on the Fine Print)
                    </h3>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                    We might update these terms occasionally – probably less often than your syllabus changes, 
                    but more often than the cafeteria menu. We'll try to give you a heads up when we do, 
                    but please check back here once in a while.
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    If you keep using the platform after we update the terms, we'll assume you're cool with the changes. 
                    If not, you're free to leave (but we'll miss you).
                  </p>
                </div>
                <button
                  onClick={() => toggleSection(7)}
                  className="ml-4 p-2 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
                >
                  {agreedSections.has(7) ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <div className="h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Section 8 */}
            <div className="bg-red-50/50 dark:bg-red-950/30 rounded-lg p-6 border border-red-200 dark:border-red-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      8. The Bottom Line (TL;DR)
                    </h3>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-4">
                    Be nice, be honest, use the platform responsibly, and help your fellow students learn. 
                    Don't upload inappropriate content, respect copyright, and remember that sharing knowledge 
                    is one of the most beautiful things humans do.
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Questions? Concerns? Found a bug? Want to tell us how awesome we are? 
                    Drop us a line. We actually read our messages (shocking, we know).
                  </p>
                </div>
                <button
                  onClick={() => toggleSection(8)}
                  className="ml-4 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  {agreedSections.has(8) ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <div className="h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 rounded-full" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Last updated: {new Date().toLocaleDateString()} • Effective immediately (or as soon as you finish reading this)
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              These terms are governed by the laws of good sense, academic integrity, and the universal law that 
              all students need caffeine to survive. Any disputes will be settled through a friendly game of rock-paper-scissors.
            </p>
            
            {/* Agreement Summary */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className={`p-2 rounded-full ${allSectionsAgreed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-zinc-100 dark:bg-zinc-700'}`}>
                  {allSectionsAgreed ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
                  )}
                </div>
                <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {allSectionsAgreed ? "All sections acknowledged!" : `${agreedSections.size}/8 sections acknowledged`}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {allSectionsAgreed 
                  ? "You've read through everything! You're now legally bound by the sacred pact of academic collaboration."
                  : "Click the checkboxes next to each section to acknowledge you've read and understood them."
                }
              </p>
            </div>

            <Button
              onClick={() => router.push('/')}
              className={`${
                allSectionsAgreed 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-zinc-400 hover:bg-zinc-500 cursor-not-allowed'
              } text-white px-8 py-2 text-lg`}
              disabled={!allSectionsAgreed}
            >
              {allSectionsAgreed ? "I Agree & I'm Ready to Learn!" : "Please Read All Sections First"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 