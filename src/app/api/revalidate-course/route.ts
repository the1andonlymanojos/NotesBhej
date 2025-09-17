import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

type RevalidateRequest = {
  courseId?: number | string;
  currentCount?: number;
  currentHash?: string;
};

function getSupabaseAdmin() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
  }
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {});
}

function hashContent(input: unknown): string {
  const json = JSON.stringify(input ?? null);
  return crypto.createHash("sha1").update(json).digest("hex");
}

async function checkAndRevalidate({ courseId, currentCount, currentHash }: RevalidateRequest) {
  if (courseId === undefined || courseId === null || Number.isNaN(Number(courseId))) {
    return NextResponse.json({ ok: false, error: "Invalid or missing courseId" }, { status: 400 });
  }

  const numericCourseId = Number(courseId);
  const supabase = getSupabaseAdmin();

  const { data: latestContent, error } = await supabase.rpc(
    "get_public_course_content",
    { target_course_id: numericCourseId }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const latestCount: number = Array.isArray(latestContent) ? latestContent.length : 0;
  const latestHash: string = hashContent(latestContent);

  let changed = false;
  if (typeof currentCount === "number") {
    changed = latestCount > currentCount;
  } else if (typeof currentHash === "string" && currentHash.length > 0) {
    changed = latestHash !== currentHash;
  } else {
    // If no baseline provided, assume we should revalidate when there is any content.
    changed = latestCount > 0;
  }

  if (changed) {
    // Invalidate the course page path; App Router will re-generate on next request
    revalidatePath(`/course/${numericCourseId}`);
  }

  return NextResponse.json({
    ok: true,
    changed,
    latestCount,
    latestHash,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const currentCountParam = searchParams.get("currentCount");
  const currentHash = searchParams.get("currentHash") || undefined;
  const currentCount = currentCountParam ? Number(currentCountParam) : undefined;
  return checkAndRevalidate({ courseId: courseId ?? undefined, currentCount, currentHash });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RevalidateRequest;
  return checkAndRevalidate(body);
}


