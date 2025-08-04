// app/page.tsx (or your equivalent route)
// This is a Server Component by default

import { createClient } from "@/utils/supabase/server";
import HomeClientPage from "@/components/HomeClientPage"; // We will create this next
import { cookies } from "next/headers";
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
    // Fetch role
    const { data: roleData } = await supabase
      .from("user_meta")
      .select("role")
      .eq("user_id", user.id)
      .single();
    userRole = roleData?.role || null;

    // Fetch pinned courses
    const { data: pinnedData } = await supabase
      .from("user_pinned_courses")
      .select("course_id")
      .eq("user_id", user.id);
      
    if (pinnedData && pinnedData.length > 0) {
      const courseIds = pinnedData.map(p => p.course_id);
      pinnedCourseIds = new Set(courseIds);
      const { data: courses } = await supabase
        .from("coursenew")
        .select("*")
        .in("id", courseIds);
      pinnedCourses = courses || [];
    }
  }


  
  // Fetch for 'list' view
  const { data: initialCourses, count: totalCourses } = await supabase
    .from("coursenew")
    .select("*", { count: 'exact' })
    .order('title')
    .range(0, ITEMS_PER_PAGE - 1);

  // Fetch for 'professor' view
  const { data: initialProfessorData, error: profError } = await supabase.rpc('professor_course_list', {
    limit_count: ITEMS_PER_PAGE,
    offset_count: 0
  });
  console.log(profError)

  // --- 4. Fetch All Courses for Search Dialogs ---
  const { data: allCourses } = await supabase
    .from("coursenew")
    .select("*")
    .order('title');


  // --- 5. Pass everything as props to the Client Component ---
  return (
    <HomeClientPage
      initialUser={user}
      initialUserRole={userRole}
      initialPinnedCourses={pinnedCourses}
      initialPinnedCourseIds={Array.from(pinnedCourseIds) as number[]} // Pass as array, convert back to Set on client
      initialCoursesData={{
        courses: initialCourses || [],
        total: totalCourses || 0,
      }}
      initialProfessorData={{
        courses: initialProfessorData || [],
        // You might need a separate RPC to get the total count more efficiently
        total: initialProfessorData?.length || 0 // This is an approximation; adjust if needed
      }}
      allCourses={allCourses || []}
      view_mode={viewMode}
      show_PinnedSection={showPinnedSection}
    />
  );
}