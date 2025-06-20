"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Send, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollAreaViewport } from "@radix-ui/react-scroll-area"

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
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  let scrollTimeout: ReturnType<typeof setTimeout>
  const [chatKey, setChatKey] = useState<string | null>(null)
  useEffect(() => {
    const fetchChatKey = async () => {
      const response = await fetch("/api/get-chat-key")
      const data = await response.json()
      console.log("Chat key", data)
      setChatKey(data.jwt)
    }
    fetchChatKey()
  }, [])

  useEffect(() => {
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  return () => clearTimeout(scrollTimeout)
  }, [messages])

  const handleSend = () => {
    if (isLoading) return
    setIsLoading(true)
    setEnabled(false)

    if (!input.trim()) return

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInput("")

    if (!chatKey) {
      alert("No chat key found")
      return
    }

    const eventSource = new EventSource(`https://casterly-rock.stoat-toad.ts.net/chat/stream?course_code=${courseCode}&question=${input.trim()}&chat_key=${chatKey}`)
    

    const botMessageId = Math.random().toString(36).substr(2, 9)
    let accumulated = ""
    let thinking = false

    const newBotMessage: Message = {
      id: botMessageId,
      content: "",
      isUser: false,
      timestamp: new Date(),
    }

    // Add initial empty bot message
    setMessages((prev) => [...prev, newBotMessage])

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "done") {
          eventSource.close();
          setIsLoading(false)
          setEnabled(true)
          return;
        }

        // Handle error messages
        if (data.type === "error") {
          accumulated += "\n[Error]: " + data.message;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, content: accumulated.trim() } : msg
            )
          );
          return;
        }

        // Handle answer streaming
        if (data.type === "answer") {
          if (thinking) {
            accumulated += "\n\n Answer:\n"
            thinking = false
          }
          accumulated += data.text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, content: accumulated.trim() } : msg
            )
          );
          return;
        }

        // Show system/status messages for "thinking", "context_start", "answer_start"
        if (data.type === "thinking") {
          if (!thinking) {
            accumulated += "\n\n Thinking:\n"
            thinking = true
          }
          accumulated += data.message || data.text || ""
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, content: accumulated.trim() } : msg
            )
          );
          return;
        }

      } catch (err) {
        // fallback for non-JSON or unexpected data
        console.log("error", err)
        console.error("Failed to parse SSE data:", event.data);
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
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
              <h2 className="text-lg font-semibold">Chat</h2>
            </div>
            <ScrollArea className="flex-1 p-4 h-[400px]">
              <ScrollAreaViewport ref={viewportRef}>

              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full",
                      message.isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[80%]",
                        message.isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div ref={bottomRef} />
              </ScrollAreaViewport>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  disabled = {!enabled}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1" 
                />
                <Button onClick={handleSend} size="icon" disabled={!enabled}>
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