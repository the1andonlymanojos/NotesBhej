import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cacheInvalidation } from '@/lib/cache-invalidation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { courseId, action } = await request.json();
    
    if (!courseId || !action) {
      return NextResponse.json({ error: 'Missing courseId or action' }, { status: 400 });
    }

    if (action === 'pin') {
      // Pin the course
      const { error } = await supabase
        .from('user_pinned_courses')
        .insert({ user_id: user.id, course_id: courseId });
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (action === 'unpin') {
      // Unpin the course
      const { error } = await supabase
        .from('user_pinned_courses')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Invalidate cache for this user's pinned courses
    await cacheInvalidation.invalidatePinnedCourses(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in pin/unpin course:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 