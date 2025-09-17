import revalidateCoursePage from "@/components/actions"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const courseID = searchParams.get('courseID')
    console.log(courseID, "courseid")
    if(!courseID) {
        return new Response('Course ID is required', { status: 400 })
    }
    await revalidateCoursePage(courseID)
    return new Response('Course page revalidated', { status: 200 })
}