import { Suspense } from "react"
import KhaaoDexPage from "@/components/khaoodex/khaoodex-page"

export const metadata = {
  title: "KhaaoDex · Gwalior food atlas",
  description: "Explore a community-curated prototype map of Gwalior restaurants.",
}

export default function KhaaoDexRoute() {
  return (
    <Suspense fallback={null}>
      <KhaaoDexPage />
    </Suspense>
  )
}
