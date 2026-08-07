import type { Article, User } from '@repo/proto/client';
import Link from 'next/link';
import { toggleFavoriteAction } from '@/lib/actions/articles';
import { formatDate } from '@/lib/format';

export function ArticleCard({
  article,
  author,
  path,
}: {
  article: Article;
  author?: User;
  path: string;
}) {
  return (
    <article className="article-preview">
      <div className="article-preview-meta">
        {author ? (
          <Link href={`/profile/${author.username}`} className="author-link">
            {author.username}
          </Link>
        ) : (
          <span className="author-link">unknown</span>
        )}
        <span className="date">{formatDate(article.createTime)}</span>
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
            ♥ {article.favoriteCount}
          </button>
        </form>
      </div>
      <Link href={`/article/${article.slug}`} className="article-title-link">
        <h2>{article.title}</h2>
        {article.description && <p>{article.description}</p>}
      </Link>
    </article>
  );
}
