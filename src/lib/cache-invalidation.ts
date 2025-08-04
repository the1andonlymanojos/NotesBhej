import { cacheManager, CACHE_PREFIXES } from './cache';

/**
 * Cache invalidation utilities for different scenarios
 */
export class CacheInvalidationService {
  /**
   * Invalidate cache when user data changes (role, pinned courses, etc.)
   */
  static async invalidateUserData(userId: string) {
    console.log(`Invalidating cache for user: ${userId}`);
    await Promise.all([
      cacheManager.invalidatePrefix(`${CACHE_PREFIXES.USER_ROLE}:${userId}`),
      cacheManager.invalidatePrefix(`${CACHE_PREFIXES.PINNED_COURSES}:${userId}`)
    ]);
  }

  /**
   * Invalidate cache when course data changes
   */
  static async invalidateCourseData() {
    console.log('Invalidating course-related cache');
    await Promise.all([
      cacheManager.invalidatePrefix(CACHE_PREFIXES.COURSES),
      cacheManager.invalidatePrefix(CACHE_PREFIXES.PROFESSOR_DATA),
      cacheManager.invalidatePrefix(CACHE_PREFIXES.ALL_COURSES)
    ]);
  }

  /**
   * Invalidate specific course list cache
   */
  static async invalidateCourseList() {
    console.log('Invalidating course list cache');
    await cacheManager.invalidatePrefix(CACHE_PREFIXES.COURSES);
  }

  /**
   * Invalidate professor data cache
   */
  static async invalidateProfessorData() {
    console.log('Invalidating professor data cache');
    await cacheManager.invalidatePrefix(CACHE_PREFIXES.PROFESSOR_DATA);
  }

  /**
   * Invalidate all courses cache (used for search)
   */
  static async invalidateAllCourses() {
    console.log('Invalidating all courses cache');
    await cacheManager.invalidatePrefix(CACHE_PREFIXES.ALL_COURSES);
  }

  /**
   * Invalidate all cache (nuclear option)
   */
  static async invalidateAll() {
    console.log('Invalidating all cache');
    await Promise.all([
      cacheManager.invalidatePrefix(CACHE_PREFIXES.USER_ROLE),
      cacheManager.invalidatePrefix(CACHE_PREFIXES.PINNED_COURSES),
      cacheManager.invalidatePrefix(CACHE_PREFIXES.COURSES),
      cacheManager.invalidatePrefix(CACHE_PREFIXES.PROFESSOR_DATA),
      cacheManager.invalidatePrefix(CACHE_PREFIXES.ALL_COURSES)
    ]);
  }

  /**
   * Invalidate cache for a specific user's pinned courses
   */
  static async invalidatePinnedCourses(userId: string) {
    console.log(`Invalidating pinned courses cache for user: ${userId}`);
    await cacheManager.invalidatePrefix(`${CACHE_PREFIXES.PINNED_COURSES}:${userId}`);
  }

  /**
   * Invalidate cache for a specific user's role
   */
  static async invalidateUserRole(userId: string) {
    console.log(`Invalidating user role cache for user: ${userId}`);
    await cacheManager.invalidatePrefix(`${CACHE_PREFIXES.USER_ROLE}:${userId}`);
  }
}

// Export for easy use
export const cacheInvalidation = CacheInvalidationService; 