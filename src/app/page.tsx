import HomePage from "@/components/mainpage_ssr";
import { getApiBaseUrlServer, getCourses, getProfessorCourses } from "@/lib/api/client";
import type { ApiPinnedCourseDTO, ApiUser } from "@/lib/api/types";
import {
  SSRPinnedCourseData,
  SafeCourse,
  SafeCourseIndex,
  SSGData,
} from "@/types/ssg";
import type { ProfessorCourseData } from "@/types/ssg";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 16;
const ENABLE_SSR_TIMING_LOGS = process.env.NODE_ENV !== "production";

function logSsrTiming(message: string) {
  if (ENABLE_SSR_TIMING_LOGS) {
    console.log(`[SSR /] ${message}`);
  }
}

async function fetchServerAuthed<T>(
  path: string,
  cookieHeader: string
): Promise<T> {
  const res = await fetch(`${getApiBaseUrlServer()}${path}`, {
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

async function fetchServerAuthedOptional<T>(
  path: string,
  cookieHeader: string
): Promise<T | null> {
  const res = await fetch(`${getApiBaseUrlServer()}${path}`, {
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export default async function HomePageTwo() {
  const requestStart = Date.now();
  let safeCourses: SafeCourse[] = [];
  let totalCount = 0;
  let safeAllCourses: SafeCourseIndex[] = [];
  let professorData: ProfessorCourseData[] = [];
  let user: ApiUser | null = null;
  let pinnedCourses: SSRPinnedCourseData[] = [];
  let authResolved = false;

  try {
    logSsrTiming("start request");

    // 1) Prepare auth cookie header and start independent requests in parallel.
    const cookieReadStart = Date.now();
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    logSsrTiming(`cookies read in ${Date.now() - cookieReadStart}ms`);

    const dataFetchStart = Date.now();
    const [allCoursesFromApi, professorCoursesFromApi, me, pinnedFromApi] = await Promise.all([
      getCourses(),
      getProfessorCourses(0, 100),
      fetchServerAuthedOptional<ApiUser>("/api/v1/me", cookieHeader),
      fetchServerAuthedOptional<ApiPinnedCourseDTO[]>("/api/v1/pinned-courses/me", cookieHeader),
    ]);
    logSsrTiming(
      `parallel fetch complete in ${Date.now() - dataFetchStart}ms (courses + professors + me + pinned)`
    );
    user = me;
    authResolved = true;

    // 2) Transform courses for first page + index
    const courseTransformStart = Date.now();
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
    logSsrTiming(`course transforms done in ${Date.now() - courseTransformStart}ms`);

    // 3) Professor-course list transform
    const professorTransformStart = Date.now();
    professorData = professorCoursesFromApi.map((p) => ({
      professor_id: p.professorId ?? 0,
      professor_name: p.professorName ?? "",
      professor_email: p.professorEmail ?? "",
      course_id: p.courseId ?? 0,
      course_title: p.courseTitle ?? "",
      course_code: p.courseCode ?? "",
    }));
    logSsrTiming(`professor transform done in ${Date.now() - professorTransformStart}ms`);

    // 4) Auth-aware pinned data (already fetched in parallel)
    if (user && pinnedFromApi) {
      pinnedCourses = pinnedFromApi.map((p) => ({
        id: p.id ?? 0,
        courseId: p.courseId ?? 0,
        courseTitle: p.courseTitle ?? "",
        courseCode: p.courseCode ?? "",
        pinnedAt: p.pinnedAt ?? new Date().toISOString(),
      }));
      logSsrTiming(`pinned courses count: ${pinnedCourses.length}`);
    } else {
      logSsrTiming("no authenticated user (or pinned unavailable); using empty pinned list");
    }
  } catch (err) {
    console.error("Error fetching homepage data from API:", err);
  } finally {
    logSsrTiming(`total request time ${Date.now() - requestStart}ms`);
  }

  const ssgData: SSGData = {
    courses: safeCourses,
    totalCount,
    allCourses: safeAllCourses,
    professorData,
    user,
    pinnedCourses,
    authResolved,
  };

  return <HomePage initialData={ssgData} />;
}
