import CourseViewPage from "./page-client"
import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";


const SITE_URL = "https://notesbhej.manoj-shiv.tech";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ "course-id": string }>;
}): Promise<Metadata> {
  // support both Promise and plain object
  const p = await params;
  const courseIdStr = p["course-id"];
  const courseId = Number(courseIdStr); // your ids are numeric in DB

  const supabase = await createClient();

  // fetch course
  const { data: course, error: courseError } = await supabase
    .from("coursenew")
    .select("*")
    .eq("id", courseId)
    .single();

  // Query all course content for this course to get professor ids
  const { data: allContent, error: allContentError } = await supabase
    .from("course_contentnew")
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
    console.log(profIds)

    if (profIds.length > 0) {
      // Query professors table for their names
      const { data: profs, error: profsError } = await supabase
        .from("professorsnew")
        .select("name")
        .in("id", profIds);

        console.log(profsError, allContentError)
      if (profs && profs.length > 0) {
        professorNames = profs.map((p: any) => p.name).filter(Boolean);
      }
    }

    console.log(professorNames);
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
    .from("course_contentnew")
    .select("*")
    .eq("course_id", courseId)
    .limit(1)
    .single();

  console.log(coursecontent,contentError)
  // Build professor names string for metadata
  const profNamesStr = professorNames.length > 0 ? ` (Professors: ${professorNames.join(", ")})` : "";

  // build descriptive title + description
  const title = `${course.title}${profNamesStr} | NotesBhej`;
  const shortDescParts = [];
  if (course.abbreviation) shortDescParts.push(course.abbreviation);
  if ((course as any).code) shortDescParts.push((course as any).code);
  const shortMeta = shortDescParts.length ? ` (${shortDescParts.join(" • ")})` : "";

  const description =
    (coursecontent?.title
      ? `${coursecontent.title} — `
      : "") +
    `Notes, resources and uploads for ${course.title}${shortMeta}${profNamesStr}. Find semester-wise PDFs, notes and professor uploads.`;

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

export default function CourseViewPage2({
  params,
}: {
  params: Promise<{ "course-id": string }>
}) {
  return <CourseViewPage params={params} />
}                           