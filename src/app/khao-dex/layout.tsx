import type { Viewport } from "next"

// KhaaoDex is a full-screen map "app" surface. Pin the viewport so iOS Safari
// doesn't zoom in when a form field is focused (and doesn't let a stray pinch
// fight the map's own zoom). Form fields are also ≥16px to be safe.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function KhaaoDexLayout({ children }: { children: React.ReactNode }) {
  return children
}
