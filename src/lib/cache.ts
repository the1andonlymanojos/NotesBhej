import redis from './redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
}

export class CacheManager {
  private static instance: CacheManager;
  private defaultTTL = 300; // 5 minutes default

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Generate a cache key based on the query and parameters
   */
  private generateKey(prefix: string, query: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${prefix}:${Buffer.from(query + paramString).toString('base64')}`;
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache with TTL
   */
  async set(key: string, data: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries with a specific prefix
   */
  async clearPrefix(prefix: string): Promise<void> {
    try {
      const keys = await redis.keys(`${prefix}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear prefix error:', error);
    }
  }

  /**
   * Cache database query results
   */
  async cacheQuery<T>(
    prefix: string,
    query: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL } = options;
    const cacheKey = this.generateKey(prefix, query);

    // Try to get from cache first
    const cached = await this.get<T>(cacheKey);
    if (cached !== null) {
      console.log(`Cache hit for ${prefix}`);
      return cached;
    }

    // If not in cache, execute query and cache result
    console.log(`Cache miss for ${prefix}, executing query`);
    const result = await queryFn();
    await this.set(cacheKey, result, ttl);
    return result;
  }

  /**
   * Invalidate cache entries for a specific prefix
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    await this.clearPrefix(prefix);
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Predefined cache prefixes for different data types
export const CACHE_PREFIXES = {
  USER_ROLE: 'user_role',
  PINNED_COURSES: 'pinned_courses',
  COURSES: 'courses',
  PROFESSOR_DATA: 'professor_data',
  ALL_COURSES: 'all_courses',
} as const; 