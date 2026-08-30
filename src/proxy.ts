import { NextResponse, type NextRequest } from "next/server"
import { KHAAODEX_HOST_HEADER } from "@/lib/khaaodex-host"

// khao-dex.mshiv.net serves the KhaaoDex map at its root. Only the KhaaoDex
// surface is remapped onto /khao-dex/*; every other path (auth, profile, API,
// assets) passes straight through so the shared app and tunnel keep working.
const REWRITES: Array<[test: (p: string) => boolean, to: (p: string) => string]> = [
  [(p) => p === "/", () => "/khao-dex"],
  [(p) => p === "/moderation" || p.startsWith("/moderation/"), (p) => `/khao-dex${p}`],
  [(p) => p === "/how-it-works", () => "/khao-dex/how-it-works"],
]

function isKhaaoDexHost(host: string) {
  return host === "khao-dex.mshiv.net" || host.startsWith("khao-dex.")
}

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase()
  if (!isKhaaoDexHost(host)) return NextResponse.next()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(KHAAODEX_HOST_HEADER, "1")

  const { pathname } = request.nextUrl
  const rule = REWRITES.find(([test]) => test(pathname))
  if (!rule) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const url = request.nextUrl.clone()
  url.pathname = rule[1](pathname)
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
