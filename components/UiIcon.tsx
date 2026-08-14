import type { SVGProps } from "react";

type UiIconName =
  | "home"
  | "grades"
  | "university"
  | "campus"
  | "ai"
  | "plus"
  | "edit"
  | "delete"
  | "chevron-right"
  | "detail"
  | "calendar"
  | "link"
  | "spark";

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
    default:
      return null;
  }
}
