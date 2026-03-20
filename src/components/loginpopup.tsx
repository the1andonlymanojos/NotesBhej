"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

interface LoginRedirectPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onCancel: () => void
}

export function LoginPopup({
  open,
  onOpenChange,
  title,
  description,
  onCancel,
}: LoginRedirectPopupProps) {
  const router = useRouter()

  const handleRedirect = () => {
    const redirectTo = typeof window !== "undefined" ? window.location.pathname : "/";
    router.push(`/loginnext?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            I&apos;ll think about it
          </Button>
          <Button type="button" onClick={handleRedirect}>
            Take me to login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
