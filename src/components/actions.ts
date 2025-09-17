'use server'
 
import { revalidatePath } from 'next/cache'
 
export default async function revalidateCoursePage(courseID:string) {
    console.log(courseID)
  // Invalidate the cache for the /posts route
  revalidatePath('/course/'+courseID)
}