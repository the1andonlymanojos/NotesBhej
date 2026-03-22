import CourseViewPage from "../../../components/page-client-ssr"
import { Metadata } from "next";
import { getCourses, getCourseContentForCourse } from "@/lib/api/client";
export const revalidate = 3600; 


export async function generateStaticParams() {
  // Use backend courses API instead of Supabase
  try {
    const courses = await getCourses();
    return (courses || []).map((c) => ({ slugg: String(c.id) }));
  } catch (error) {
    console.error("generateStaticParams failed to fetch courses:", error);
    return [];
  }
}

const SITE_URL = "https://notesbhej.mshiv.net";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ "slugg": string }>;
}): Promise<Metadata> {
  // support both Promise and plain object
  const p = await params;
  const courseIdStr = p["slugg"];
  const courseId = Number(courseIdStr);

  const courses = await getCourses();
  const course = (courses || []).find((c) => c.id === courseId) || null;

  // Use course-content API to derive professor names for metadata
  let professorNames: string[] = [];
  if (courseId && !Number.isNaN(courseId)) {
    try {
      const ccResponse = await getCourseContentForCourse(courseId);
      const dtoList = ccResponse.content ?? [];
      const profMap = ccResponse.professors ?? {};
      const profIds = Array.from(
        new Set(
          dtoList
            .map((c) => c.professorId)
            .filter((id): id is number => id != null)
        )
      );
      if (profIds.length > 0) {
        professorNames = profIds
          .map((id) => profMap[String(id)]?.name)
          .filter((name): name is string => !!name);
      }
    } catch (error) {
      console.error(`generateMetadata: failed loading course content for ${courseId}:`, error);
      professorNames = [];
    }
  }

  if (!course) {
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

  // use first piece of content title if available
  let firstContentTitle: string | undefined;
  try {
    if (courseId && !Number.isNaN(courseId)) {
      const ccResponse = await getCourseContentForCourse(courseId);
      const dtoList = ccResponse.content ?? [];
      firstContentTitle = dtoList[0]?.title;
    }
  } catch (error) {
    console.error(`generateMetadata: failed loading first content title for ${courseId}:`, error);
    firstContentTitle = undefined;
  }
  // Build professor names string for metadata
  const profNamesStr = professorNames.length > 0 ? ` (Professors: ${professorNames.join(", ")})` : "";

  // build descriptive title + description
  const title = `${course.title}${profNamesStr} | NotesBhej`;
  const shortDescParts = [];
  if (course.abbreviation) shortDescParts.push(course.abbreviation);
  if ((course as any).code) shortDescParts.push((course as any).code);

  const description =
    `Notes, resources and uploads for ${course.title}${profNamesStr ? ` •${profNamesStr}` : ""}. Find semester-wise PDFs, notes and professor uploads.`;

   // console.log(description)
  // OG image pattern: prefer course-specific image if you have one; else fallback
  // If you plan to generate social preview images dynamically create an API endpoint like /api/og?courseId=...
  const courseTitleSafe = course.title ?? "";
  const ogImage =
    (course as any).og_image ||
    `${SITE_URL}/apinext/og?title=${encodeURIComponent(courseTitleSafe)}&type=course&prof=${encodeURIComponent(
      professorNames.join(", ")
    )}`;

  const canonical = `${SITE_URL}/coursessr/${courseId}`;

  return {
    title,
    description,
    keywords: [
      course.title,
      course.abbreviation ?? "",
      (course as any).code ?? "",
      firstContentTitle ?? "",
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
  params: Promise<{ slugg: string }>
}) {
  const p = await params;
  const courseId = Number(p.slugg);

  const courses = await getCourses();
  const course = (courses || []).find((c) => c.id === courseId) || null;

  let resolvedContent: any[] = [];
  let professors: any[] = [];
  let tags: any[] = [];

  if (courseId && !Number.isNaN(courseId)) {
    try {
      const ccResponse = await getCourseContentForCourse(courseId);
      const dtoList = ccResponse.content ?? [];
      const profMap = ccResponse.professors ?? {};

      resolvedContent = dtoList.map((item) => {
        const prof =
          item.professorId != null
            ? profMap[String(item.professorId)] ?? null
            : null;

        return {
          id: item.id ?? null,
          course_id: courseId,
          professor_id: item.professorId ?? null,
          user_id: null,
          year: item.year ?? null,
          batch: item.batch ?? null,
          semester_number: item.semesterNumber ?? null,
          resource_url: null,
          title: item.title ?? "",
          visible: item.visibility === "VISIBLE",
          created_at: null,
          filetype: item.fileType ?? "",
          r2_url: item.r2Url ?? null,
          tag_ids: (item.tags ?? [])
            .map((tag) => tag.id ?? null)
            .filter((id): id is number => id != null),
          professor_name: prof?.name,
          order: item.orderIndex ?? null,
        };
      });

      // Build professors array from map
      professors = Object.values(profMap).map((p) => ({
        id: p.id ?? null,
        name: p.name ?? "",
      }));

      // Build tags array from content payload for SSR hydration/UI filters.
      const tagMap = new Map<number, string>();
      dtoList.forEach((item) => {
        (item.tags ?? []).forEach((tag) => {
          const id = tag.id ?? null;
          const name = tag.name?.trim() ?? "";
          if (id != null && name) {
            tagMap.set(id, name);
          }
        });
      });
      tags = Array.from(tagMap.entries()).map(([id, name]) => ({ id, name }));
    } catch (error) {
      console.error(`Course page SSR: failed loading content for ${courseId}:`, error);
      resolvedContent = [];
      professors = [];
      tags = [];
    }
  }

  if (resolvedContent.length === 0) {
    resolvedContent.push({
      id: 0,
      course_id: courseId,
      user_id: "NA",
      professor_id: 71,
      year: 2022,
      batch: "IMT",
      semester_number: 1,
      resource_url: null,
      title: "No content available, please upload some content",
      visible: true,
      created_at: "2025-09-11T17:18:49.101115+00:00",
      filetype: "application/pdf",
    });

    if (professors.length === 0) {
      professors.push({
        id: 71,
        name: "Dummy Professor",
      });
    }
  }

  return (
    <CourseViewPage
      params={params}
      serverCourse={course as any}
      serverContent={resolvedContent as any}
      serverProfessors={professors as any}
      serverTags={tags as any}
      skipInitialContentFetch
    />
  );
}                           