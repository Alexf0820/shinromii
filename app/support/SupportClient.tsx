"use client";

import { useState } from "react";
import { InfoArticle } from "@/components/InfoArticle";
import { InfoEmptyCard } from "@/components/InfoBlocks";
import { SUPPORT_PAGE_URL } from "@/lib/site-links";

export function SupportClient() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <InfoArticle>
      <p>
        SHINROMiiは、進路について考える高校生と家族が、気軽に使えるサービスを目指して開発しています。
      </p>
      <p>SHINROMiiを気に入っていただけたら、開発を応援してもらえるとうれしいです。</p>
      <InfoEmptyCard icon="heart">
        {SUPPORT_PAGE_URL ? (
          <a className="action-button primary info-cta info-support-cta" href={SUPPORT_PAGE_URL} target="_blank" rel="noreferrer">
            開発を応援する
          </a>
        ) : (
          <button
            type="button"
            className="action-button primary info-cta info-support-cta"
            onClick={() => setMessage("応援ページは現在準備中です。")}
          >
            開発を応援する
          </button>
        )}
        {message ? <p className="info-note">{message}</p> : null}
      </InfoEmptyCard>
    </InfoArticle>
  );
}
