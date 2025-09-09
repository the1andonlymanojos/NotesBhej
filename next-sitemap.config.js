/** @type {import('next-sitemap').IConfig} */

const SITE_URL = "https://notesbhej.manoj-shiv.tech";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function fetchCourses() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️ Missing SUPABASE_URL or SUPABASE_KEY env vars");
    return [];
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/coursenew`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error("❌ Failed to fetch courses:", res.status, res.statusText);
    return [];
  }

  return res.json();
}

module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  sitemapSize: 5000,

  // Add dynamic course URLs
  additionalPaths: async () => {
    const courses = await fetchCourses();
    return courses.map((c) => ({
      loc: `/course/${c.id}`,
      lastmod: c.updated_at || new Date().toISOString(),
      changefreq: "weekly",
      priority: 0.7,
    }));
  },

  transform: async (config, path) => {
    return {
      loc: path,
      changefreq: "weekly",
      priority: path === "/" ? 1.0 : 0.7,
      lastmod: new Date().toISOString(),
    };
  },
};
