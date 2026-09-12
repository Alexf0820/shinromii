"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function GradeReferenceInfo({ isolateClicks = false }: { isolateClicks?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  return <>
    <button type="button" className="grade-reference-info" aria-label="参考評定平均について" aria-haspopup="dialog" onPointerDown={isolateClicks ? (event) => event.stopPropagation() : undefined} onClick={(event) => { if (isolateClicks) { event.preventDefault(); event.stopPropagation(); } setOpen(true); }}>ⓘ</button>
    {open && createPortal(
      <dialog ref={dialog} className="grade-reference-dialog" aria-labelledby={titleId} onClose={() => setOpen(false)}>
        <h2 id={titleId}>参考評定平均について</h2>
        <p>SHINROMiiでは、入力された評定をそのまま使用して参考値を計算します。得点から評定を自動換算することはありません。</p>
        <ul>
          <li>有効な評定は1〜5</li>
          <li>未入力や不正な値は計算対象外</li>
          <li>学期平均は入力済み評定の単純平均</li>
          <li>年間参考平均は学年末評定を優先</li>
          <li>学年末評定がない科目は学期評定から補完</li>
          <li>重複する記録に異なる評定がある場合は集計対象外</li>
        </ul>
        <p>これは調査書や大学出願時の正式な評定平均を示すものではありません。評定の扱いは学校・入試方式によって異なります。必ず在籍校・志望校の公式情報をご確認ください。</p>
        <form method="dialog"><button type="submit" autoFocus>閉じる</button></form>
      </dialog>, document.body
    )}
  </>;
}

export function GradeReferenceNotice() {
  return <p className="grade-reference-notice">※参考値です。必ず在籍校・志望校の公式情報をご確認ください。</p>;
}
