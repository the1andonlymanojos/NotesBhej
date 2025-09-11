import CourseViewPage from "./page-client"
import { Metadata } from "next";
import { createClient as cl } from "@supabase/supabase-js";
export const revalidate = 3600; 


export async function generateStaticParams() {
    console.log("YO IM RUNNING AND GETTING COURSE IDS")
  
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // must be set in Vercel (server-only)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
}
const supabase = await cl(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  // optional global opts
});;


  // Fetch IDs you want pre-built (top 1000 popular courses, etc.)
  const { data } = await supabase.from("coursenew").select("id").limit(1000);
  console.log(data);
  return (data || []).map((c: any) => ({ "course-id": String(c.id) }));
}

const SITE_URL = "https://notesbhej.manoj-shiv.tech";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ "course-id": string }>;
}): Promise<Metadata> {
  // support both Promise and plain object
  const p = await params;
  console.log("p",p);
  const courseIdStr = p["course-id"];
  console.log("courseIdStr", courseIdStr)
  const courseId = Number(courseIdStr); // your ids are numeric in DB
  console.log("courseId", courseId)


  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // must be set in Vercel (server-only)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
}
const supabase = await cl(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  // optional global opts
});;

  // fetch course
  const { data: course, error: courseError } = await supabase
    .from("coursenew")
    .select("*")
    .eq("id", courseId)
    .single();

  // Query all course content for this course to get professor ids
  const { data: allContent } = await supabase
    .from("course_contentnew_safe")
    .select("professor_id")
    .eq("course_id", courseId);

  let professorNames: string[] = [];
  if (allContent && allContent.length > 0) {
    // Get unique professor ids (filter out nulls)
    const profIds = Array.from(
      new Set(
        allContent
          .map((c: any) => c.professor_id)
          .filter((id: any) => id !== null && id !== undefined)
      )
    );
    //console.log(profIds)

    if (profIds.length > 0) {
      // Query professors table for their names
      const { data: profs} = await supabase
        .from("professorsnew")
        .select("name")
        .in("id", profIds);

        //console.log(profsError, allContentError)
      if (profs && profs.length > 0) {
        professorNames = profs.map((p: any) => p.name).filter(Boolean);
      }
    }

    //console.log(professorNames);
  }

  if (!course || courseError) {
    // not found -> show "not found" metadata and tell crawlers not to index
    return {
      title: "Course not found | NotesBhej",
      description: "This course could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // fetch one piece of content to use in description (you can fetch more if needed)
  const { data: coursecontent, error: contentError } = await supabase
  .rpc("get_public_course_content", { target_course_id: courseId })

  console.log("coursecontent",coursecontent)
  console.log("contentError",contentError)
  // Build professor names string for metadata
  const profNamesStr = professorNames.length > 0 ? ` (Professors: ${professorNames.join(", ")})` : "";

  // build descriptive title + description
  const title = `${course.title}${profNamesStr} | NotesBhej`;
  const shortDescParts = [];
  if (course.abbreviation) shortDescParts.push(course.abbreviation);
  if ((course as any).code) shortDescParts.push((course as any).code);

  const description =
    `Notes, resources and uploads for ${course.title} •${profNamesStr}. Find semester-wise PDFs, notes and professor uploads.`;

   // console.log(description)
  // OG image pattern: prefer course-specific image if you have one; else fallback
  // If you plan to generate social preview images dynamically create an API endpoint like /api/og?courseId=...
  const ogImage =
    (course as any).og_image ||
    `${SITE_URL}/api/og?title=${encodeURIComponent(course.title)}&type=course&prof=${encodeURIComponent(professorNames.join(", "))}`;

  const canonical = `${SITE_URL}/course/${courseId}`;

  return {
    title,
    description,
    keywords: [
      course.title,
      course.abbreviation ?? "",
      (course as any).code ?? "",
      coursecontent?.title ?? "",
      ...professorNames,
    ]
      .filter(Boolean)
      .join(", "),
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "NotesBhej",
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: course.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    // optionally hint crawlers not to index empty/hidden courses
    // if your course has no visible content, you might want noindex:
    // robots: { index: false, follow: true }
  };
}

export default async function CourseViewPage2({
  params,
}: {
  params: Promise<{ "course-id": string }>
}) {
  const courseId = Number((await params)["course-id"]);
  console.log("coursid", courseId)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // must be set in Vercel (server-only)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
}
const supabase = await cl(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  // optional global opts
});;
  // Fetch course and content server-side (these are run at build time for IDs returned by generateStaticParams,
  // and at request-time (SSR) for IDs not pre-built — then cached per `revalidate`).
  const [{ data: course }, { data: content, error: err, data: coursecontent, error: contentError }] = await Promise.all([
    supabase.from("coursenew").select("*").eq("id", courseId).single(),
    supabase.rpc("get_public_course_content", { target_course_id: courseId }),
  ]);
  console.log("err",err)
  console.log("contentError",contentError)
  console.log("coursecontent",coursecontent)
  

  // Gather professors (if you want to show names)
  const profIds = Array.from(new Set((content || []).map((c: any) => c.professor_id).filter(Boolean)));
  let professors: any[] = [];
  if (profIds.length) {
    const { data: profs } = await supabase.from("professorsnew").select("id,name").in("id", profIds);
    professors = profs || [];
  }

  //log all the parametes: 
  console.log("Course", course)
  console.log("Content", coursecontent)
  console.log("Professors", professors)
  console.log("Course ID", courseId)
  //console.log("Params", params)

  return <CourseViewPage params={params} serverCourse={course}
  serverContent={content}
  serverProfessors={professors} />
}                           