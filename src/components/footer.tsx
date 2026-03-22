"use client"

import { Heart, BookOpen, Code, Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-gradient-to-br from-zinc-50 via-indigo-50/30 to-purple-50/20 dark:from-zinc-950 dark:via-indigo-950/40 dark:to-purple-950/20 border-t border-zinc-200 dark:border-zinc-800">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                NotesBhej
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Making IIITM great again, one doc at a time!
            </p>
            
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"> 
                  Home
                </Link>
              </li>
              <li>
                <Link href="/create-course" className="text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Create Course
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Profile
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/pp" className="text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/tos" className="text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/takedown" className="text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Takedown Policy
                </Link>
              </li>
            </ul>
          </div>

          

          {/* Connect */}
          <div className="space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Code className="h-4 w-4 text-green-500" />
              Connect
            </h3>
            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="justify-start text-xs h-8 bg-white/50 dark:bg-zinc-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border-zinc-300 dark:border-zinc-700"
                asChild
              >
                <Link href="mailto:mshivagange@gmail.com" className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Get in touch
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <span>© {currentYear} NotesBhej</span>
              <span className="hidden md:inline">•</span>
                             <span className="flex items-center gap-1">
                 Made with <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" /> at IIITM Gwalior
               </span>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </div>
          
          {/* Fun message */}
          <div className="mt-4 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
              &quot;Knowledge not shared is knowledge wasted.&quot; 
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
} 