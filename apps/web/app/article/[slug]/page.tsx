import type { Article } from '@repo/proto/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CommentSection } from '@/components/CommentSection';
import {
  deleteArticleAction,
  toggleFavoriteAction,
} from '@/lib/actions/articles';
import { getCurrentUser, getToken } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { authMetadata, grpc } from '@/lib/grpc';

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ commentsPage?: string }>;
}) {
  const { slug } = await params;
  const { commentsPage } = await searchParams;
  const token = await getToken();

  let article: Article;
  try {
    article = await grpc.lookupArticle({ slug }, authMetadata(token));
  } catch {
    notFound();
  }

  const [author, viewer] = await Promise.all([
    grpc
      .getUser({ name: article.author }, authMetadata(token))
      .catch(() => null),
    getCurrentUser(),
  ]);
  const isAuthor = viewer?.name === article.author;
  const path = `/article/${slug}`;

  return (
    <main className="container narrow">
      <article>
        <h1>{article.title}</h1>
        <div className="article-meta">
          {author ? (
            <Link href={`/profile/${author.username}`} className="author-link">
              {author.username}
            </Link>
          ) : (
            <span className="author-link">unknown</span>
          )}
          <span className="date">{formatDate(article.createTime)}</span>
        </div>

        <div className="article-actions">
          <form
            action={toggleFavoriteAction.bind(
              null,
              article.name,
              article.favorited,
              path,
            )}
            className="inline-form"
          >
            <button
              type="submit"
              className={`favorite-btn${article.favorited ? ' favorited' : ''}`}
            >
              ♥ {article.favorited ? 'Unfavorite' : 'Favorite'} (
              {article.favoriteCount})
            </button>
          </form>
          {isAuthor && (
            <>
              <Link href={`/editor/${article.slug}`} className="btn-secondary">
                Edit
              </Link>
              <form
                action={deleteArticleAction.bind(null, article.name)}
                className="inline-form"
              >
                <button type="submit" className="danger">
                  Delete
                </button>
              </form>
            </>
          )}
        </div>

        {article.description && <p className="lead">{article.description}</p>}
        <div className="article-body">
          {article.body
            .split('\n')
            .filter((line) => line.trim().length > 0)
            .map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
        </div>
      </article>

      <CommentSection
        parent={article.name}
        path={path}
        pageToken={commentsPage}
        viewerName={viewer?.name}
        canModerate={false}
      />
    </main>
  );
}
