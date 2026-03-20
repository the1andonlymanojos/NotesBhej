/**
 * API client: server (direct backend for build/ISR) vs client (rewrite for auth/cookies).
 */

import type {
  ApiCourse,
  ApiProfessorCourseDTO,
  ApiPinnedCourseDTO,
  ApiTag,
  ApiInteractionDTO,
  ApiCourseContentResponse,
  ApiCreateInteractionRequest,
  ApiCourseContentVisibility,
  ApiUser,
  ApiUpdateMeRequest,
  ApiFeedbackRequest,
  ApiFeedback,
  ApiReorderRequest,
  ApiCourseContent,
  ApiProfessor,
  ApiCourseContentCreate,
  ApiGetUploadUrlResponse,
  ApiAnnouncement,
  ApiAnnouncementRead,
  ApiCreateAnnouncementRequest,
} from "./types";

/** Direct backend URL for server-side only (build/ISR). No rewrites — use API_SERVER_BASE_URL or localhost:8080. */
export function getApiBaseUrlServer(): string {
  if (typeof process.env.API_SERVER_BASE_URL === "string" && process.env.API_SERVER_BASE_URL) {
    return process.env.API_SERVER_BASE_URL.replace(/\/$/, "");
  }
  return "http://localhost:8080";
}

/** Same-origin rewrite URL for browser (cookies sent). Use NEXT_PUBLIC_API_BASE_URL or /springboot. */
export function getApiBaseUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string" && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000/springboot";
}

/** Server-side fetch (page.tsx, ISR). Hits backend directly so it works at build time without rewrites. */
async function fetchApiServer<T>(path: string): Promise<T> {
  const url = `${getApiBaseUrlServer()}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  console.log("res status", res.status)
  return res.json() as Promise<T>;
}

/** Client-side fetch (browser; sends cookies via rewrite). */
async function fetchApiBrowser<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ——— Server only: unauthenticated, build/ISR (direct backend; no rewrites) ———

export async function getCourses(): Promise<ApiCourse[]> {
  return fetchApiServer<ApiCourse[]>("/api/v1/courses");
}

export async function getProfessorCourses(offset = 0, limit = 100): Promise<ApiProfessorCourseDTO[]> {
  return fetchApiServer<ApiProfessorCourseDTO[]>(
    `/api/v1/professors/courses?offset=${offset}&limit=${limit}`
  );
}

/** GET /api/v1/course-content/{id} — content + professors for a given course */
export async function getCourseContentForCourse(courseId: number): Promise<ApiCourseContentResponse> {
  return fetchApiServer<ApiCourseContentResponse>(`/api/v1/course-content/${courseId}`);
}

// ——— Client: authenticated routes (rewrite so cookies are sent) ———

export async function apiGetCourses(): Promise<ApiCourse[]> {
  return fetchApiBrowser<ApiCourse[]>("/api/v1/courses");
}

/** POST /api/v1/courses */
export async function apiCreateCourse(body: ApiCourse): Promise<ApiCourse> {
  return fetchApiBrowser<ApiCourse>("/api/v1/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiGetProfessorCourses(offset = 0, limit = 100): Promise<ApiProfessorCourseDTO[]> {
  return fetchApiBrowser<ApiProfessorCourseDTO[]>(
    `/api/v1/professors/courses?offset=${offset}&limit=${limit}`
  );
}

/** GET /api/v1/pinned-courses/me — returns PinnedCourseDTO[] (includes id for DELETE) */
export async function apiGetPinnedCoursesMe(): Promise<ApiPinnedCourseDTO[]> {
  return fetchApiBrowser<ApiPinnedCourseDTO[]>("/api/v1/pinned-courses/me");
}

/** GET /api/v1/tags */
export async function apiGetTags(): Promise<ApiTag[]> {
  return fetchApiBrowser<ApiTag[]>("/api/v1/tags");
}

/** GET /api/v1/professors */
export async function apiGetProfessors(): Promise<ApiProfessor[]> {
  return fetchApiBrowser<ApiProfessor[]>("/api/v1/professors");
}

/** POST /api/v1/professors */
export async function apiCreateProfessor(body: ApiProfessor): Promise<ApiProfessor> {
  return fetchApiBrowser<ApiProfessor>("/api/v1/professors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** POST /api/v1/pinned-courses/{courseId} */
export async function apiPinCourse(courseId: number): Promise<void> {
  await fetchApiBrowser<undefined>(`/api/v1/pinned-courses/${courseId}`, { method: "POST" });
}

/** DELETE /api/v1/pinned-courses/{id} — id is PinnedCourses.id */
export async function apiUnpinCourse(pinnedId: number): Promise<void> {
  await fetchApiBrowser<undefined>(`/api/v1/pinned-courses/${pinnedId}`, { method: "DELETE" });
}

/** GET /api/v1/interactions/me — recent interactions for current user */
export async function apiGetMyInteractions(limit = 20): Promise<ApiInteractionDTO[]> {
  return fetchApiBrowser<ApiInteractionDTO[]>(`/api/v1/interactions/me?limit=${limit}`);
}

/** GET /api/v1/interactions/me/course/{courseId} — recent interactions for a course */
export async function apiGetMyCourseInteractions(courseId: number, limit = 10): Promise<ApiInteractionDTO[]> {
  return fetchApiBrowser<ApiInteractionDTO[]>(`/api/v1/interactions/me/course/${courseId}?limit=${limit}`);
}

/** POST /api/v1/interactions — log a user interaction (course/content) */
export async function apiCreateInteraction(body: ApiCreateInteractionRequest): Promise<ApiInteractionDTO> {
  return fetchApiBrowser<ApiInteractionDTO>("/api/v1/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** GET /api/v1/course-content/{id} — content + professors for a given course */
export async function apiGetCourseContentForCourse(courseId: number): Promise<ApiCourseContentResponse> {
  return fetchApiBrowser<ApiCourseContentResponse>(`/api/v1/course-content/${courseId}`);
}

/** PATCH /api/v1/course-content/approve/{id} — moderation visibility update */
export async function apiPatchCourseContentVisibility(
  id: number,
  visibility: ApiCourseContentVisibility
): Promise<boolean> {
  return fetchApiBrowser<boolean>(`/api/v1/course-content/approve/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibility }),
  });
}

/** PATCH /api/v1/course-content/{id}/reorder — move item between prev/next neighbors */
export async function apiReorderCourseContent(
  id: number,
  body: ApiReorderRequest
): Promise<ApiCourseContent> {
  return fetchApiBrowser<ApiCourseContent>(`/api/v1/course-content/${id}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** POST /api/v1/course-content — create new course content entry */
export async function apiCreateCourseContent(
  body: ApiCourseContentCreate
): Promise<ApiCourseContent> {
  return fetchApiBrowser<ApiCourseContent>("/api/v1/course-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** POST /api/v1/files/upload-url — get signed URL for file upload */
export async function apiGetUploadUrl(
  fileName: string,
  fileType?: string
): Promise<ApiGetUploadUrlResponse> {
  const params = new URLSearchParams({ fileName });
  if (fileType) params.set("fileType", fileType);
  return fetchApiBrowser<ApiGetUploadUrlResponse>(
    `/api/v1/files/upload-url?${params.toString()}`,
    { method: "POST" }
  );
}

/** GET /api/v1/me — authenticated user from access_token cookie */
export async function apiGetMe(): Promise<ApiUser> {
  return fetchApiBrowser<ApiUser>("/api/v1/me");
}

/** PATCH /api/v1/me — update current user fields (e.g. bgPref) */
export async function apiUpdateMe(body: ApiUpdateMeRequest): Promise<ApiUser> {
  return fetchApiBrowser<ApiUser>("/api/v1/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** POST /api/v1/feedback — submit feedback for current user */
export async function apiCreateFeedback(body: ApiFeedbackRequest): Promise<ApiFeedback> {
  return fetchApiBrowser<ApiFeedback>("/api/v1/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** POST /auth/logout — clears auth cookies on backend */
export async function apiLogout(): Promise<void> {
  await fetchApiBrowser<undefined>("/auth/logout", { method: "POST" });
}

/** GET /api/announcements */
export async function apiGetAnnouncements(): Promise<ApiAnnouncement[]> {
  return fetchApiBrowser<ApiAnnouncement[]>("/api/announcements");
}

/** POST /api/announcements?userId={id} */
export async function apiCreateAnnouncement(
  userId: number,
  body: ApiCreateAnnouncementRequest
): Promise<void> {
  await fetchApiBrowser<undefined>(`/api/announcements?userId=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** POST /api/announcements/reads?userId={id}&announcementId={id} */
export async function apiMarkAnnouncementAsRead(
  userId: number,
  announcementId: number
): Promise<void> {
  await fetchApiBrowser<undefined>(
    `/api/announcements/reads?userId=${userId}&announcementId=${announcementId}`,
    { method: "POST" }
  );
}

/** GET /api/announcements/reads/{userId} */
export async function apiGetAnnouncementReads(userId: number): Promise<ApiAnnouncementRead[]> {
  return fetchApiBrowser<ApiAnnouncementRead[]>(`/api/announcements/reads/${userId}`);
}
