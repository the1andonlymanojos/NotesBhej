import CreateCourseClient from "./create-course-client"

// The client form depends on router/search-param hooks and authentication.
// Keep the route request-rendered rather than prerendering it during builds.
export const dynamic = "force-dynamic"

export default function CreateCoursePage() {
  return <CreateCourseClient />
}
