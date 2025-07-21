"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Send, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface ChatboxProps {
  courseCode: string
}

export default function Chatbox({ courseCode }: ChatboxProps) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    const systemMessage: Message = {
      id: "system-notice",
      content: "🚨 Context-Aware Help Assistant Temporarily Unavailable\n\nThis is an AI-powered help assistant that provides context-aware answers about your course content. However, it requires significant GPU compute resources to run.\n\nUnfortunately, until I can afford an NVIDIA GPU with enough VRAM (and let's be honest, even selling kidneys won't get you a decent card these days thanks to Ngreedia's pricing), this feature will remain disabled.\n\nStay tuned for when we can sort out the hardware requirements! 🎮💸",
      isUser: false,
      timestamp: new Date(),
    }
    setMessages([systemMessage])
  }, [])

  const handleSend = () => {
    alert("Context-aware chat is currently disabled due to GPU hardware requirements. Check back when we can afford some decent VRAM!")
  }

  return (
    <div>
      {/* Floating Chat Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="rounded-full shadow-lg h-14 w-14 p-0 bg-primary hover:bg-primary/90"
            aria-label="Open chat"
          >
            <MessageCircle className="h-7 w-7" />
          </Button>
        </DialogTrigger>
        <DialogContent className="p-0 border-none bg-transparent max-w-full w-[95vw] sm:w-[400px] shadow-2xl">
          <Card className="w-full h-[600px] flex flex-col gap-0">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Context-Aware Chat Assistant</h2>
            </div>
            <ScrollArea className="flex-1 p-4 h-[400px]">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex w-full justify-start"
                  >
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[90%]",
                        "bg-yellow-100 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200"
                      )}
                    >
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  disabled={true}
                  placeholder="Disabled until we get a GPU with actual VRAM 😭"
                  className="flex-1" 
                />
                <Button onClick={handleSend} size="icon" disabled={true}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  )
}