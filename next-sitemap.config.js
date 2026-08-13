/** @type {import('next-sitemap').IConfig} */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const API_SERVER_BASE_URL = (process.env.API_SERVER_BASE_URL || "http://127.0.0.1:30080").replace(/\/$/, "");

async function fetchCourses() {
  try {
    const res = await fetch(`${API_SERVER_BASE_URL}/api/v1/courses`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(`⚠️ Sitemap: backend returned ${res.status} ${res.statusText}; skipping dynamic course URLs.`);
      return [];
    }

    return res.json();
  } catch (error) {
    console.warn(
      `⚠️ Sitemap: could not reach ${API_SERVER_BASE_URL}; skipping dynamic course URLs.`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
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
