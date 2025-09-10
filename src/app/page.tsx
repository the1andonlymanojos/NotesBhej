import HomePage from "@/components/mainpage";
import { adminSupabase } from "@/utils/supabase/admin";
import { 
  SafeCourse, 
  SafeCourseIndex,
  SSGData,
   
} from "@/types/ssg";

export const runtime = "nodejs";
export const revalidate = 3600; // ISR: 1 hour

export default async function HomePageTwo() {
  const ITEMS_PER_PAGE = 16;

  // 1) Paginated public courses (page 1)
  const { data: courses = [], error: coursesErr } = await adminSupabase
    .from("coursenew")
    .select("id,title,code,abbreviation,created_at")
    .order("created_at", { ascending: false })
    .range(0, ITEMS_PER_PAGE - 1);

  if (coursesErr) {
    console.error("Error fetching courses (server):", coursesErr);
  }

  // 2) Total count (exact)
  const { count, error: countErr } = await adminSupabase
    .from("coursenew")
    .select("*", { head: true, count: "exact" });

  if (countErr) {
    console.error("Error fetching course count (server):", countErr);
  }
    

  // 3) Small index for search/autocomplete (only necessary fields)
  const { data: allCourses = [], error: allCoursesErr } = await adminSupabase
    .from("coursenew")
    .select("id,title,code,abbreviation")
    .order("title");

  if (allCoursesErr) {
    console.error("Error fetching all courses (server):", allCoursesErr);
  }

  // 4) Professor-course RPC (limit to reasonable number)
  const { data: professorData = [], error: professorErr } = await adminSupabase
    .rpc("professor_course_list", {
      limit_count: 100,
      offset_count: 0
    });

  if (professorErr) {
    console.error("Error fetching professor data (server):", professorErr);
  }
    

  // Map to "safe" shapes (strip any sensitive fields)
  const safeCourses: SafeCourse[] = (courses || []).map((c) => ({
    id: c.id,
    title: c.title,
    code: c.code,
    abbreviation: c.abbreviation,
    created_at: c.created_at
  }));

  const safeAllCourses: SafeCourseIndex[] = (allCourses || []).map((c) => ({
    id: c.id, 
    title: c.title, 
    code: c.code, 
    abbreviation: c.abbreviation
  }));



  // Prepare SSG data
  const ssgData: SSGData = {
    courses: safeCourses,
    totalCount: count || 0,
    allCourses: safeAllCourses,
    professorData: professorData || []
  };
  console.log("Server page data: ", ssgData);

  return <HomePage initialData={ssgData} />;
}

