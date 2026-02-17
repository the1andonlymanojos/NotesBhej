const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

export const BACKGROUND_COOKIE_NAME = "notesbhej-background";
export const DEFAULT_BACKGROUND = "url('/b-004.jpg')";
export const SOFT_GRADIENT_BACKGROUND =
  "linear-gradient(135deg,rgb(105, 155, 206) 0%,rgb(92, 113, 182) 60%,rgb(8, 99, 78) 100%)";
export const OG_GRAD_BG = "linear-gradient(135deg, #18181b 0%, #312e81 60%, #0f172a 100%)";
//dark:from-[#18181b] dark:via-[#312e81] dark:to-[#0f172a]
const getCookieValue = (cookieName: string) => {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");
  const match = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  if (!match) return null;

  return match.substring(cookieName.length + 1);
};

export const readBackgroundPreference = () => {
  const rawValue = getCookieValue(BACKGROUND_COOKIE_NAME);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    if (typeof parsed?.value === "string" && parsed.value.length > 0) {
      return parsed.value;
    }
  } catch {
    // Ignore parse errors and fall back to default
  }

  return null;
};

export const persistBackgroundPreference = (value: string) => {
  if (typeof document === "undefined") return;

  const encodedValue = encodeURIComponent(JSON.stringify({ value }));
  const parts = [
    `${BACKGROUND_COOKIE_NAME}=${encodedValue}`,
    `max-age=${COOKIE_MAX_AGE_SECONDS}`,
    "path=/",
    "samesite=lax",
  ];

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    parts.push("secure");
  }

  document.cookie = parts.join("; ");
};

