import { redirect } from "next/navigation"

// Legacy alias — the real login page lives at /nextlogin. Some callers still
// push to "/login".
export default async function LoginAlias({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const back = typeof sp.redirect === "string" ? sp.redirect : undefined
  redirect(back ? `/nextlogin?redirect=${encodeURIComponent(back)}` : "/nextlogin")
}
