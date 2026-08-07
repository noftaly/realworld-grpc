import type { Comment, User } from '@repo/proto/client';
import {
  deleteCommentAction,
  updateCommentAction,
} from '@/lib/actions/comments';
import { formatDate } from '@/lib/format';

export function CommentItem({
  comment,
  author,
  path,
  canEdit,
  canDelete,
}: {
  comment: Comment;
  author?: User;
  path: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="comment">
      <div className="comment-meta">
        <span className="author">{author?.username ?? 'unknown'}</span>
        <span className="date">{formatDate(comment.createTime)}</span>
      </div>
      <p>{comment.body}</p>
      {(canEdit || canDelete) && (
        <div className="comment-actions">
          {canEdit && (
            <details>
              <summary>Edit</summary>
              <form
                action={updateCommentAction.bind(null, comment.name, path)}
                className="form"
              >
                <textarea name="body" defaultValue={comment.body} required />
                <button type="submit">Save</button>
              </form>
            </details>
          )}
          {canDelete && (
            <form
              action={deleteCommentAction.bind(null, comment.name, path)}
              className="inline-form"
            >
              <button type="submit" className="danger">
                Delete
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
