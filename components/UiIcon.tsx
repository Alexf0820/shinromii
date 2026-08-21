import type { SVGProps } from "react";

type UiIconName =
  | "home"
  | "home-fill"
  | "grades"
  | "grades-fill"
  | "university"
  | "university-fill"
  | "campus"
  | "campus-fill"
  | "ai"
  | "ai-fill"
  | "plus"
  | "edit"
  | "copy"
  | "delete"
  | "star"
  | "chevron-right"
  | "detail"
  | "calendar"
  | "link"
  | "spark"
  | "bell"
  | "person"
  | "person-fill"
  | "download"
  | "upload"
  | "lock"
  | "bulb"
  | "check"
  | "heart"
  | "mail"
  | "settings"
  | "cloud";

type UiIconProps = SVGProps<SVGSVGElement> & {
  name: UiIconName;
};

export function UiIcon({ name, ...props }: UiIconProps) {
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6.5 9.5V20h11V9.5" />
        </svg>
      );
    case "home-fill":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="M12 3.1a1 1 0 0 1 .62.21l8 6.4A1 1 0 0 1 21 10.5V19a2 2 0 0 1-2 2h-4.2v-5.1a2.8 2.8 0 0 0-5.6 0V21H5a2 2 0 0 1-2-2v-8.5a1 1 0 0 1 .38-.79l8-6.4A1 1 0 0 1 12 3.1Z" />
        </svg>
      );
    case "grades-fill":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <rect x="4.4" y="12.4" width="3.6" height="7.2" rx="1.4" />
          <rect x="10.2" y="6.6" width="3.6" height="13" rx="1.4" />
          <rect x="16" y="9.8" width="3.6" height="9.8" rx="1.4" />
        </svg>
      );
    case "university-fill":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="M12.46 3.6a1.1 1.1 0 0 0-.92 0l-8.4 4a.85.85 0 0 0 0 1.54l8.4 4.02a1.1 1.1 0 0 0 .92 0l8.4-4.02a.85.85 0 0 0 0-1.54l-8.4-4Z" />
          <path d="M5.6 12.15v3.63c0 .5.25.96.68 1.22 1.36.83 3.4 1.72 5.72 1.72s4.36-.89 5.72-1.72c.43-.26.68-.72.68-1.22v-3.63l-5.55 2.66a2.4 2.4 0 0 1-1.7 0L5.6 12.15Z" />
        </svg>
      );
    case "campus-fill":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="M8 2.4a.9.9 0 0 1 .9.9V5h6.2V3.3a.9.9 0 0 1 1.8 0V5H17a3 3 0 0 1 3 3v.6H4V8a3 3 0 0 1 3-3h.1V3.3a.9.9 0 0 1 .9-.9Z" />
          <path d="M4 10.4h16V18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7.6Zm4 3a1.1 1.1 0 1 0 0 2.2h3a1.1 1.1 0 0 0 0-2.2H8Z" />
        </svg>
      );
    case "ai-fill":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="M12 3.6c-4.7 0-8.5 3.2-8.5 7.2 0 2.26 1.22 4.27 3.13 5.6-.16 1.2-.7 2.3-1.5 3.14-.3.32-.1.85.34.83 1.9-.1 3.6-.75 4.9-1.72.52.1 1.06.15 1.63.15 4.7 0 8.5-3.2 8.5-7.2s-3.8-7.2-8.5-7.2Z" />
          <circle cx="8.6" cy="10.7" r="1.15" fill="#ffffff" />
          <circle cx="12" cy="10.7" r="1.15" fill="#ffffff" />
          <circle cx="15.4" cy="10.7" r="1.15" fill="#ffffff" />
        </svg>
      );
    case "grades":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M5 19V9" />
          <path d="M12 19V5" />
          <path d="M19 19v-7" />
          <path d="M3 19h18" />
        </svg>
      );
    case "university":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="m3 9 9-5 9 5-9 5-9-5Z" />
          <path d="M6 11.5V18" />
          <path d="M18 11.5V18" />
          <path d="M8.5 18h7" />
        </svg>
      );
    case "campus":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 10h16" />
        </svg>
      );
    case "ai":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M12 5a5 5 0 0 0-5 5v1.2A3 3 0 0 0 5 14v.2A3.8 3.8 0 0 0 8.8 18H10l2 2 2-2h1.2A3.8 3.8 0 0 0 19 14.2V14a3 3 0 0 0-2-2.8V10a5 5 0 0 0-5-5Z" />
          <path d="M9.5 12.5h5" />
          <path d="M10.5 9.5h3" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M4 20h4l9.5-9.5a2.1 2.1 0 0 0-4-4L4 16v4Z" />
        </svg>
      );
    case "copy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <rect x="9" y="9" width="11" height="11" rx="2.6" />
          <path d="M15 5.6A2.6 2.6 0 0 0 12.4 4H6.6A2.6 2.6 0 0 0 4 6.6v5.8A2.6 2.6 0 0 0 5.6 15" />
        </svg>
      );
    case "delete":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M5 7h14" />
          <path d="M9 7V5h6v2" />
          <path d="M8 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="m12 4.6 2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 15.4 7.8 17.6l.8-4.7-3.4-3.3 4.7-.7Z" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "detail":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 9.2h.01" />
          <path d="M11.2 12h1.2v3.2H13" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 10h16" />
          <path d="M9 14h2" />
        </svg>
      );
    case "link":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M10 14 8.5 15.5a3 3 0 0 1-4.2-4.2L7 8.6a3 3 0 0 1 4.2 0" />
          <path d="m14 10 1.5-1.5a3 3 0 1 1 4.2 4.2L17 15.4a3 3 0 0 1-4.2 0" />
          <path d="M9 15 15 9" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="m12 4 1.8 4.2L18 10l-4.2 1.8L12 16l-1.8-4.2L6 10l4.2-1.8L12 4Z" />
          <path d="m18.5 4 .7 1.8L21 6.5l-1.8.7-.7 1.8-.7-1.8L16 6.5l1.8-.7.7-1.8Z" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M18 15.5V11a6 6 0 0 0-12 0v4.5L4.6 17.4h14.8L18 15.5Z" strokeLinejoin="round" />
          <path d="M10.2 20a2 2 0 0 0 3.6 0" />
        </svg>
      );
    case "person":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.6 19.2c.7-3.2 3.2-5 6.4-5s5.7 1.8 6.4 5" strokeLinecap="round" />
        </svg>
      );
    case "person-fill":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.2 19.6c.8-3.5 3.5-5.4 6.8-5.4s6 1.9 6.8 5.4A1.2 1.2 0 0 1 17.6 21H6.4a1.2 1.2 0 0 1-1.2-1.4Z" />
        </svg>
      );
    case "download":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M12 4v10" />
          <path d="m8.5 10.5 3.5 3.8 3.5-3.8" />
          <path d="M5 19h14" />
        </svg>
      );
    case "upload":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M12 20V10" />
          <path d="m8.5 13.5 3.5-3.8 3.5 3.8" />
          <path d="M5 5h14" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <rect x="6" y="10.5" width="12" height="9" rx="2.2" />
          <path d="M8.6 10.5V8.2a3.4 3.4 0 0 1 6.8 0v2.3" />
        </svg>
      );
    case "bulb":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M12 4.4a5.2 5.2 0 0 0-3.1 9.4c.5.4.8 1 .8 1.6V16h4.6v-.6c0-.6.3-1.2.8-1.6A5.2 5.2 0 0 0 12 4.4Z" />
          <path d="M10 18.4h4" />
          <path d="M10.6 20.2h2.8" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...props}>
          <path d="m6.2 12.2 3.8 3.8 7.8-8.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M12 19.4s-6.6-4.1-8.4-8.1C2.2 8.4 3.7 5.6 6.8 5.4c1.7-.1 3.2.8 4 2.2.8-1.4 2.3-2.3 4-2.2 3.1.2 4.6 3 3.2 5.9-1.8 4-8 8.1-8 8.1Z" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <rect x="3.6" y="6.2" width="16.8" height="11.6" rx="2.2" />
          <path d="m4.4 7.6 7.6 5.4 7.6-5.4" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M12 3.9v1.8" />
          <path d="M12 18.3v1.8" />
          <path d="m18.1 5.9-1.3 1.3" />
          <path d="m7.2 16.8-1.3 1.3" />
          <path d="M20.1 12h-1.8" />
          <path d="M5.7 12H3.9" />
          <path d="m18.1 18.1-1.3-1.3" />
          <path d="m7.2 7.2-1.3-1.3" />
          <path d="M14.8 4.7 14 6.5" />
          <path d="m10 17.5-.8 1.8" />
          <path d="m19.3 14.8-1.8-.8" />
          <path d="m6.5 10-.8-.8" />
          <path d="m19.3 9.2-1.8.8" />
          <path d="m6.5 14 .8.8" />
          <path d="m14.8 19.3-.8-1.8" />
          <path d="M10 6.5 9.2 4.7" />
        </svg>
      );
    case "cloud":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...props}>
          <path d="M7.2 18.4a3.6 3.6 0 0 1-.4-7.18 5.8 5.8 0 0 1 11.3-1.3 4 4 0 0 1-.9 7.98H7.2Z" />
        </svg>
      );
    default:
      return null;
  }
}
