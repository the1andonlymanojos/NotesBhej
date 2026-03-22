/**
 * Types matching the backend OpenAPI schema (camelCase).
 * Used only for homepage API responses; mapped to existing SSG shapes where needed.
 */

export interface ApiCourse {
  id?: number;
  title?: string;
  code?: string;
  abbreviation?: string;
  createdAt?: string;
}

export interface ApiCourseContentDTO {
  id?: number;
  title?: string;
  year?: number;
  semesterNumber?: number;
  batch?: string;
  fileType?: string;
  r2Url?: string;
  resourceUrl?: string;
  orderIndex?: number;
  visibility?: string;
  professorId?: number;
  tags?: ApiTag[];
}

export interface ApiProfessorDTO {
  id?: number;
  name?: string;
  department?: string;
  designation?: string;
}

export interface ApiCourseContentResponse {
  content?: ApiCourseContentDTO[];
  professors?: Record<string, ApiProfessorDTO>;
}

/** Full Professor entity from /api/v1/professors */
export interface ApiProfessor {
  id?: number;
  name?: string;
  designation?: string;
  department?: string;
  email?: string;
  researchInterests?: string;
}

export interface ApiProfessorCourseDTO {
  professorId?: number;
  professorName?: string;
  professorEmail?: string;
  courseId?: number;
  courseTitle?: string;
  courseCode?: string;
}

/** GET /api/v1/pinned-courses/me response item */
export interface ApiPinnedCourseDTO {
  id?: number;
  courseId?: number;
  courseTitle?: string;
  courseCode?: string;
  pinnedAt?: string;
}

/** GET /api/v1/tags response item */
export interface ApiTag {
  id?: number;
  name?: string;
}

/** GET /api/v1/interactions/me, /interactions/me/course/{courseId} item */
export interface ApiInteractionDTO {
  courseId?: number;
  courseTitle?: string;
  contentId?: number;
  contentTitle?: string;
  type?: string;
  createdAt?: string;
}

/** POST /api/v1/interactions body */
export interface ApiCreateInteractionRequest {
  courseId: number;
  contentId?: number;
  type: string;
  message?: string;
}

export type ApiCourseContentVisibility = "PENDING_REVIEW" | "VISIBLE" | "HIDDEN" | "DELETED";

/** GET /api/v1/me response */
export interface ApiUser {
  id?: number;
  userId?: string;
  googleId?: string;
  email?: string;
  fullName?: string;
  batch?: string;
  profilePictureUrl?: string;
  adminRequest?: boolean;
  role?: "STUDENT" | "PROFESSOR" | "MODERATOR" | "ADMIN" | string;
  bgPref?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** PATCH /api/v1/me body */
export interface ApiUpdateMeRequest {
  bgPref?: string;
}

/** POST /api/v1/feedback body */
export interface ApiFeedbackRequest {
  feedback: string;
  rating?: number | null;
}

/** POST /api/v1/feedback response */
export interface ApiFeedback {
  id?: number;
  feedback?: string;
  rating?: number;
  createdAt?: string;
}

/** PATCH /api/v1/course-content/{id}/reorder body */
export interface ApiReorderRequest {
  prevId?: number | null;
  nextId?: number | null;
}

/** CourseContent shape returned by some write endpoints */
export interface ApiCourseContent {
  id?: number;
  orderIndex?: number;
}

/** POST /api/v1/course-content body (minimal fields used by the app) */
export interface ApiCourseContentCreate {
  course: { id: number };
  professor?: { id: number } | null;
  year?: number;
  batch?: string;
  semesterNumber?: number;
  title?: string;
  resourceUrl?: string;
  r2Url?: string | null;
  fileType?: string;
  visibility?: ApiCourseContentVisibility;
  tags?: ApiTag[];
}

/** PATCH /api/v1/course-content/{id} body */
export interface ApiCourseContentPatch {
  title?: string;
  year?: number;
  batch?: string;
  semesterNumber?: number;
  professorId?: number | null;
  tagIds?: number[];
}

/** POST /api/v1/files/upload-url response */
export interface ApiGetUploadUrlResponse {
  signedURL?: string;
  fileName?: string;
  publicFileUrl?: string;
}

/** GET /api/announcements item */
export interface ApiAnnouncement {
  id?: number;
  title?: string;
  message?: string;
  link?: string;
  createdAt?: string;
  expiresAt?: string;
}

/** GET /api/announcements/reads/{userId} item */
export interface ApiAnnouncementRead {
  announcementId?: number;
}

/** POST /api/announcements body */
export interface ApiCreateAnnouncementRequest {
  title: string;
  message: string;
  link?: string | null;
  expiresAt?: string | null;
}
