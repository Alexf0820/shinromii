export const SITE_LINKS = [
  { href: "/about", label: "SHINROMiiについて" },
  { href: "/guide", label: "使い方" },
  { href: "/privacy", label: "プライバシー" },
  { href: "/terms", label: "利用規約" },
  { href: "/contact", label: "お問い合わせ" },
  { href: "/support", label: "応援する" },
] as const;

/** 後から外部フォームURLを入れる。空のときは準備中表示。 */
export const CONTACT_FORM_URL = "";

/** 後から外部の応援ページURLを入れる。空のときは準備中表示。 */
export const SUPPORT_PAGE_URL = "";
