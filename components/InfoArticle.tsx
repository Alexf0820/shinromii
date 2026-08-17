import type { ReactNode } from "react";

type InfoArticleProps = {
  children: ReactNode;
};

export function InfoArticle({ children }: InfoArticleProps) {
  return <article className="info-article">{children}</article>;
}
