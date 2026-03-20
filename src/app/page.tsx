import HomePage from "@/components/mainpage";
import { getCourses, getProfessorCourses } from "@/lib/api/client";
import {
  SafeCourse,
  SafeCourseIndex,
  SSGData,
} from "@/types/ssg";
import type { ProfessorCourseData } from "@/types/ssg";

export const runtime = "nodejs";
export const revalidate = 3600; // ISR: 1 hour

const ITEMS_PER_PAGE = 16;

export default async function HomePageTwo() {
  let safeCourses: SafeCourse[] = [];
  let totalCount = 0;
  let safeAllCourses: SafeCourseIndex[] = [];
  let professorData: ProfessorCourseData[] = [];

  try {
    console.log("............................................\nHOMEPAGERENDER")
    // 1) All courses from backend API
    const allCoursesFromApi = await getCourses();

    console.log("from api", allCoursesFromApi)
  

    // Sort by createdAt desc and take first page
    const sorted = [...allCoursesFromApi].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
    const paginated = sorted.slice(0, ITEMS_PER_PAGE);

    safeCourses = paginated.map((c) => ({
      id: c.id!,
      title: c.title ?? "",
      code: c.code ?? "",
      abbreviation: c.abbreviation ?? null,
      created_at: c.createdAt ?? new Date().toISOString(),
    }));

    totalCount = allCoursesFromApi.length;

    // 2) Index for search/autocomplete (all courses, sort by title)
    safeAllCourses = [...allCoursesFromApi]
      .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""))
      .map((c) => ({
        id: c.id!,
        title: c.title ?? "",
        code: c.code ?? "",
        abbreviation: c.abbreviation ?? null,
      }));

    // 3) Professor-course list from backend API
    const professorCoursesFromApi = await getProfessorCourses(0, 100);
    professorData = professorCoursesFromApi.map((p) => ({
      professor_id: p.professorId ?? 0,
      professor_name: p.professorName ?? "",
      professor_email: p.professorEmail ?? "",
      course_id: p.courseId ?? 0,
      course_title: p.courseTitle ?? "",
      course_code: p.courseCode ?? "",
    }));
  } catch (err) {
    console.error("Error fetching homepage data from API:", err);
  }

  const ssgData: SSGData = {
    courses: safeCourses,
    totalCount,
    allCourses: safeAllCourses,
    professorData,
  };

  return <HomePage initialData={ssgData} />;
}

