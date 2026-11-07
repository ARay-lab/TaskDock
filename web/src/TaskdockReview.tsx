import { useRef, useState } from "react";
import { createComment, getTask, releaseTaskdockTask, setTaskdockStatus } from "./api";
import type { Task } from "./types";

export function TaskdockReview({ task, onChanged, showActions = false }: {
  task: Task; onChanged: (task: Task) => void; showActions?: boolean;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const saving = useRef(false);
  const canReview = showActions && task.status === "in_review";

  async function submit(action: "comment" | "accept" | "return") {
    if (saving.current || (action !== "accept" && !comment.trim())) return;
    saving.current = true;
    setBusy(true); setError(""); setMessage("");
    let commentSaved = false;
    try {
      if (comment.trim()) {
        await createComment(task.id, comment.trim());
        commentSaved = true;
        setComment("");
        onChanged(await getTask(task.id));
      }
      if (action === "comment") {
        setMessage("评论已保存，可在历史中查看");
        return;
      }
      let current = task;
      if (action === "return" && current.claimedBy) current = await releaseTaskdockTask(current);
      onChanged(await setTaskdockStatus(current, action === "accept" ? "done" : "todo"));
      setMessage(action === "accept" ? "已确认完成" : "已退回待办，Agent 可重新认领；原成果和修改意见已保留");
    } catch (cause) {
      setError(`${commentSaved ? "评论已保存，但后续操作未完成：" : ""}${cause instanceof Error ? cause.message : "保存失败"}`);
    } finally {
      saving.current = false; setBusy(false);
    }
  }

  return <form className="taskdock-review" aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void submit("comment"); }}>
    <h3>{canReview ? "验收与反馈" : "发表评论"}</h3>
    {canReview && <p>成果符合要求时确认完成；需要修改时，请填写具体意见后退回。</p>}
    <label>{canReview ? "评论或修改意见" : "评论"}<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} maxLength={100000} disabled={busy} placeholder={canReview ? "说明需要修改的内容和预期结果…" : "记录反馈或补充说明…"} /></label>
    <div className="taskdock-review-actions">
      <button type="submit" disabled={busy || !comment.trim()}>发表评论</button>
      {canReview && <>
        <button type="button" disabled={busy || !comment.trim()} onClick={() => void submit("return")}>退回修改</button>
        <button className="taskdock-review-accept" type="button" disabled={busy} onClick={() => void submit("accept")}>确认完成</button>
      </>}
    </div>
    {busy && <p role="status">保存中…</p>}
    {message && <p role="status">{message}</p>}
    {error && <p className="agentboard-error" role="alert">{error}</p>}
  </form>;
}
