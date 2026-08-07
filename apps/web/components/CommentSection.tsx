import Link from 'next/link';
import { CommentItem } from '@/components/CommentItem';
import { Pager } from '@/components/Pager';
import { createCommentAction } from '@/lib/actions/comments';
import { getToken } from '@/lib/auth';
import { authMetadata, grpc } from '@/lib/grpc';
import { resolveAuthors } from '@/lib/resolve';

export async function CommentSection({
  parent,
  path,
  pageToken,
  currentParams,
  viewerName,
  canModerate,
}: {
  parent: string;
  path: string;
  pageToken?: string;
  currentParams?: Record<string, string | undefined>;
  viewerName?: string;
  canModerate: boolean;
}) {
  const token = await getToken();
  const { comments, nextPageToken } = await grpc.listComments(
    { parent, pageSize: 20, pageToken: pageToken ?? '' },
    authMetadata(token),
  );
  const authors = await resolveAuthors(
    comments.map((c) => c.author),
    token,
  );

  return (
    <section className="comments">
      <h2>Comments</h2>
      {viewerName ? (
        <form
          action={createCommentAction.bind(null, parent, path)}
          className="form comment-form"
        >
          <textarea name="body" placeholder="Write a comment..." required />
          <button type="submit">Post comment</button>
        </form>
      ) : (
        <p>
          <Link href="/login">Sign in</Link> to comment.
        </p>
      )}
      {comments.length === 0 && <p className="muted">No comments yet.</p>}
      {comments.map((c) => (
        <CommentItem
          key={c.name}
          comment={c}
          author={authors.get(c.author)}
          path={path}
          canEdit={c.author === viewerName}
          canDelete={c.author === viewerName || canModerate}
        />
      ))}
      <Pager
        nextPageToken={nextPageToken}
        basePath={path}
        currentParams={currentParams}
        tokenParam="commentsPage"
      />
    </section>
  );
}
