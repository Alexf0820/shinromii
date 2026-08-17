import { CONTACT_FORM_URL } from "@/lib/site-links";
import { InfoArticle } from "@/components/InfoArticle";
import { InfoEmptyCard } from "@/components/InfoBlocks";

export default function ContactPage() {
  return (
    <InfoArticle>
      <InfoEmptyCard icon="mail">
        {CONTACT_FORM_URL ? (
          <>
            <p className="info-empty-title">お問い合わせフォームへ</p>
            <p>ご質問・ご意見・不具合のご連絡は、次のボタンから送れます。</p>
            <a className="action-button primary info-cta" href={CONTACT_FORM_URL} target="_blank" rel="noreferrer">
              お問い合わせフォームを開く
            </a>
          </>
        ) : (
          <>
            <p className="info-empty-title">お問い合わせフォームは準備中です</p>
            <p>準備ができましたら、こちらからご連絡いただけるようにします。</p>
          </>
        )}
      </InfoEmptyCard>
    </InfoArticle>
  );
}
