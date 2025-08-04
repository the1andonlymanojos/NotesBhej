// app/page.tsx (or your equivalent route)
// This is a Server Component by default

import { createClient } from "@/utils/supabase/server";
import HomeClientPage from "@/components/HomeClientPage"; // We will create this next
import { cookies } from "next/headers";
import { databaseService } from "@/lib/database";
const ITEMS_PER_PAGE = 12;

export default async function HomePage() {
  const supabase = await createClient();
  const cookieStore = await  cookies();
  const viewMode = cookieStore.get("viewMode")?.value || "list";
  const showPinnedSectionRaw = cookieStore.get("showPinnedSection")?.value;
  const showPinnedSection = showPinnedSectionRaw === undefined
    ? true
    : showPinnedSectionRaw === "true" || showPinnedSectionRaw === "1";
  console.log(viewMode)
  console.log(showPinnedSection)
  // --- 1. Fetch User Data ---
  const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log(authError)
  // --- 2. Fetch User-Specific Data (Role, Pinned Courses) if user exists ---
  let userRole = null;
  let pinnedCourses = [];
  let pinnedCourseIds = new Set();
  
  if (user) {
    // Use cached database service for user role
    userRole = await databaseService.getUserRole(user.id);

    // Use cached database service for pinned courses
    const pinnedData = await databaseService.getPinnedCourses(user.id);
    pinnedCourses = pinnedData.courses;
    pinnedCourseIds = new Set(pinnedData.courseIds);
  }

  // --- 3. Fetch Initial Page Data (for both views) with caching ---
  
  // Fetch for 'list' view with caching
  const initialCoursesData = await databaseService.getInitialCourses(0, ITEMS_PER_PAGE);

  // Fetch for 'professor' view with caching
  const professorData = await databaseService.getProfessorData(ITEMS_PER_PAGE, 0);

  // --- 4. Fetch All Courses for Search Dialogs with caching ---
  const allCourses = await databaseService.getAllCourses();

  // --- 5. Pass everything as props to the Client Component ---
  return (
    <HomeClientPage
      initialUser={user}
      initialUserRole={userRole}
      initialPinnedCourses={pinnedCourses}
      initialPinnedCourseIds={Array.from(pinnedCourseIds) as number[]} // Pass as array, convert back to Set on client
      initialCoursesData={{
        courses: initialCoursesData.courses,
        total: initialCoursesData.total,
      }}
      initialProfessorData={{
        courses: professorData.courses,
        total: professorData.total
      }}
      allCourses={allCourses}
      view_mode={viewMode}
      show_PinnedSection={showPinnedSection}
    />
  );
}