import { Database } from "./supabase";

// Base types from database schema
export type Course = Database["public"]["Tables"]["coursenew"]["Row"];
export type CourseContent = Database["public"]["Tables"]["course_contentnew"]["Row"];
export type Professor = Database["public"]["Tables"]["professorsnew"]["Row"];
export type UserMeta = Database["public"]["Tables"]["user_meta"]["Row"];

// RPC function return types
export type ProfessorCourseData = Database["public"]["Functions"]["professor_course_list"]["Returns"][0];
export type ProfessorCourseResources = Database["public"]["Functions"]["professor_course_resources"]["Returns"][0];
export type TopContributors = Database["public"]["Functions"]["top_contributors"]["Returns"][0];
export type PublicCourseContent = Database["public"]["Functions"]["get_public_course_content"]["Returns"][0];

// Safe data shapes for public consumption (stripped of sensitive fields)
export type SafeCourse = Pick<Course, "id" | "title" | "code" | "abbreviation" | "created_at">;
export type SafeCourseIndex = Pick<Course, "id" | "title" | "code" | "abbreviation">;
export type SafeCourseContent = Pick<CourseContent, "id" | "title" | "resource_url" | "filetype" | "created_at" | "visible">;
export type SafeProfessor = Pick<Professor, "id" | "name" | "department" | "designation">;

// SSG data interfaces
export interface SSGData {
  courses: SafeCourse[];
  totalCount: number;
  allCourses: SafeCourseIndex[];
  professorData: ProfessorCourseData[];
}

export interface CoursePageSSGData {
  course: SafeCourse;
  content: SafeCourseContent[];
  professorData: ProfessorCourseData[];
}

export interface ProfilePageSSGData {
  userMeta: UserMeta;
  contributions: CourseContent[];
  topContributors: TopContributors[];
}

// Error handling types
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface SSGResult<T> {
  data: T | null;
  error: SupabaseError | null;
}

// Utility types for API responses
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
