import { NextResponse, type NextRequest } from "next/server"

// khao-dex.mshiv.net serves the KhaaoDex map at its root. Only the KhaaoDex
// surface is remapped onto /khao-dex/*; every other path (auth, profile, API,
// assets) passes straight through so the shared app and tunnel keep working.
const REWRITES: Array<[test: (p: string) => boolean, to: (p: string) => string]> = [
  [(p) => p === "/", () => "/khao-dex"],
  [(p) => p === "/moderation" || p.startsWith("/moderation/"), (p) => `/khao-dex${p}`],
]

function isKhaaoDexHost(host: string) {
  return host === "khao-dex.mshiv.net" || host.startsWith("khao-dex.")
}

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase()
  if (!isKhaaoDexHost(host)) return NextResponse.next()

  const { pathname } = request.nextUrl
  const rule = REWRITES.find(([test]) => test(pathname))
  if (!rule) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = rule[1](pathname)
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
