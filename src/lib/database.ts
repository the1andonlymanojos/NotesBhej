import { createClient } from "@/utils/supabase/server";
import { cacheManager, CACHE_PREFIXES } from './cache';
import { SupabaseClient } from "@supabase/supabase-js";

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = null as unknown as SupabaseClient;
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient();
    }
    return this.supabase;
  }

  /**
   * Get user role with caching
   */
  async getUserRole(userId: string) {
    return cacheManager.cacheQuery(
      CACHE_PREFIXES.USER_ROLE,
      `user_role_${userId}`,
      async () => {
        const supabase = await this.getSupabase();
        const { data } = await supabase
          .from("user_meta")
          .select("role")
          .eq("user_id", userId)
          .single();
        return data?.role || null;
      },
      { ttl: 600 } // 10 minutes TTL for user roles
    );
  }

  /**
   * Get pinned courses with caching
   */
  async getPinnedCourses(userId: string) {
    return cacheManager.cacheQuery(
      CACHE_PREFIXES.PINNED_COURSES,
      `pinned_courses_${userId}`,
      async () => {
        const supabase = await this.getSupabase();
        
        // Get pinned course IDs
        const { data: pinnedData } = await supabase
          .from("user_pinned_courses")
          .select("course_id")
          .eq("user_id", userId);
          
        if (!pinnedData || pinnedData.length === 0) {
          return { courseIds: [], courses: [] };
        }

        const courseIds = pinnedData.map(p => p.course_id);
        
        // Get course details
        const { data: courses } = await supabase
          .from("coursenew")
          .select("*")
          .in("id", courseIds);

        return {
          courseIds,
          courses: courses || []
        };
      },
      { ttl: 300 } // 5 minutes TTL for pinned courses
    );
  }

  /**
   * Get initial courses for list view with caching
   */
  async getInitialCourses(page: number = 0, itemsPerPage: number = 12) {
    return cacheManager.cacheQuery(
      CACHE_PREFIXES.COURSES,
      `initial_courses_${page}_${itemsPerPage}`,
      async () => {
        const supabase = await this.getSupabase();
        const { data, count } = await supabase
          .from("coursenew")
          .select("*", { count: 'exact' })
          .order('title')
          .range(page * itemsPerPage, (page + 1) * itemsPerPage - 1);

        return {
          courses: data || [],
          total: count || 0
        };
      },
      { ttl: 180 } // 3 minutes TTL for course lists
    );
  }

  /**
   * Get professor data with caching
   */
  async getProfessorData(limit: number = 12, offset: number = 0) {
    return cacheManager.cacheQuery(
      CACHE_PREFIXES.PROFESSOR_DATA,
      `professor_data_${limit}_${offset}`,
      async () => {
        const supabase = await this.getSupabase();
        const { data, error } = await supabase.rpc('professor_course_list', {
          limit_count: limit,
          offset_count: offset
        });

        return {
          courses: data || [],
          total: data?.length || 0,
          error
        };
      },
      { ttl: 180 } // 3 minutes TTL for professor data
    );
  }

  /**
   * Get all courses for search with caching
   */
  async getAllCourses() {
    return cacheManager.cacheQuery(
      CACHE_PREFIXES.ALL_COURSES,
      'all_courses',
      async () => {
        const supabase = await this.getSupabase();
        const { data } = await supabase
          .from("coursenew")
          .select("*")
          .order('title');

        return data || [];
      },
      { ttl: 600 } // 10 minutes TTL for all courses (less frequently changing)
    );
  }

  /**
   * Invalidate user-specific cache when user data changes
   */
  async invalidateUserCache(userId: string) {
    await Promise.all([
      cacheManager.invalidatePrefix(`${CACHE_PREFIXES.USER_ROLE}:${userId}`),
      cacheManager.invalidatePrefix(`${CACHE_PREFIXES.PINNED_COURSES}:${userId}`)
    ]);
  }

  /**
   * Invalidate course-related cache when course data changes
   */
  async invalidateCourseCache() {
    await Promise.all([
      cacheManager.invalidatePrefix(CACHE_PREFIXES.COURSES),
      cacheManager.invalidatePrefix(CACHE_PREFIXES.PROFESSOR_DATA),
      cacheManager.invalidatePrefix(CACHE_PREFIXES.ALL_COURSES)
    ]);
  }
}

// Export singleton instance
export const databaseService = new DatabaseService(); 