# Redis Caching with TTL Implementation

This project now includes a comprehensive Redis caching system with TTL (Time To Live) for database operations. The system is designed to improve performance by reducing database queries and providing fast access to frequently accessed data.

## Features

- **Automatic TTL**: All cached data has configurable expiration times
- **Smart Key Generation**: Cache keys are automatically generated based on queries and parameters
- **Cache Invalidation**: Easy-to-use functions for invalidating cache when data changes
- **Error Handling**: Graceful fallback to database queries if Redis is unavailable
- **Performance Monitoring**: Console logs for cache hits/misses

## Cache TTL Configuration

Different types of data have different TTL values based on how frequently they change:

- **User Roles**: 10 minutes (600 seconds)
- **Pinned Courses**: 5 minutes (300 seconds)
- **Course Lists**: 3 minutes (180 seconds)
- **Professor Data**: 3 minutes (180 seconds)
- **All Courses**: 10 minutes (600 seconds)

## Usage

### 1. Database Service

The `DatabaseService` class provides cached versions of all database operations:

```typescript
import { databaseService } from '@/lib/database';

// Get user role with caching
const userRole = await databaseService.getUserRole(userId);

// Get pinned courses with caching
const pinnedData = await databaseService.getPinnedCourses(userId);

// Get initial courses with caching
const coursesData = await databaseService.getInitialCourses(page, itemsPerPage);

// Get professor data with caching
const professorData = await databaseService.getProfessorData(limit, offset);

// Get all courses with caching
const allCourses = await databaseService.getAllCourses();
```

### 2. Cache Invalidation

When data changes, use the cache invalidation service to clear relevant cache entries:

```typescript
import { cacheInvalidation } from '@/lib/cache-invalidation';

// Invalidate user-specific cache
await cacheInvalidation.invalidateUserData(userId);

// Invalidate course-related cache
await cacheInvalidation.invalidateCourseData();

// Invalidate specific cache types
await cacheInvalidation.invalidatePinnedCourses(userId);
await cacheInvalidation.invalidateUserRole(userId);
await cacheInvalidation.invalidateCourseList();
await cacheInvalidation.invalidateProfessorData();
await cacheInvalidation.invalidateAllCourses();

// Nuclear option - invalidate all cache
await cacheInvalidation.invalidateAll();
```

### 3. API Route Example

Here's how to use cache invalidation in API routes:

```typescript
// Example: Pinning/unpinning a course
export async function POST(request: NextRequest) {
  // ... perform database operation ...
  
  // Invalidate relevant cache
  await cacheInvalidation.invalidatePinnedCourses(user.id);
  
  return NextResponse.json({ success: true });
}
```

## Environment Variables

Make sure you have the following environment variable set:

```env
REDIS_URL=your_redis_connection_string
```

## Cache Key Structure

Cache keys are automatically generated using the following pattern:
- `prefix:base64(query + parameters)`

Examples:
- `user_role:base64(user_role_123)`
- `pinned_courses:base64(pinned_courses_123)`
- `courses:base64(initial_courses_0_12)`

## Performance Benefits

1. **Reduced Database Load**: Frequently accessed data is served from Redis
2. **Faster Response Times**: Cache hits are much faster than database queries
3. **Automatic Expiration**: Data automatically expires to ensure freshness
4. **Graceful Degradation**: If Redis is down, the system falls back to database queries

## Monitoring

The system provides console logs for monitoring cache performance:

- `Cache hit for [prefix]` - Data was served from cache
- `Cache miss for [prefix], executing query` - Data was fetched from database and cached
- `Invalidating cache for [type]` - Cache invalidation events

## Best Practices

1. **Invalidate Cache on Data Changes**: Always invalidate relevant cache when data is modified
2. **Use Appropriate TTL**: Set TTL based on how frequently data changes
3. **Monitor Cache Performance**: Watch console logs for cache hit/miss ratios
4. **Handle Redis Failures**: The system gracefully handles Redis connection issues

## Troubleshooting

### Redis Connection Issues
- Check your `REDIS_URL` environment variable
- Ensure Redis server is running
- Check network connectivity

### Cache Not Working
- Verify Redis is connected (check console logs)
- Check if cache keys are being generated correctly
- Ensure TTL values are appropriate

### Data Stale
- Verify cache invalidation is being called when data changes
- Check TTL values - they might be too long
- Use cache invalidation functions to manually clear cache 