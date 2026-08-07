import type { Article } from '@repo/proto/client';
import { ArticleCard } from '@/components/ArticleCard';
import { Pager } from '@/components/Pager';
import { getToken } from '@/lib/auth';
import { authMetadata, grpc } from '@/lib/grpc';
import { resolveAuthors } from '@/lib/resolve';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const token = await getToken();

  let articles: Article[] = [];
  let nextPageToken: string | undefined;
  let loadError = false;
  try {
    const res = await grpc.listArticles(
      { pageSize: 20, pageToken: page ?? '', filter: '' },
      authMetadata(token),
    );
    articles = res.articles;
    nextPageToken = res.nextPageToken;
  } catch {
    loadError = true;
  }
  const authors = await resolveAuthors(
    articles.map((a) => a.author),
    token,
  );

  return (
    <main className="container">
      <h1>Global Feed</h1>
      {loadError && <p className="error">Could not load articles right now.</p>}
      {!loadError && articles.length === 0 && (
        <p className="muted">No articles yet.</p>
      )}
      {articles.map((article) => (
        <ArticleCard
          key={article.name}
          article={article}
          author={authors.get(article.author)}
          path="/"
        />
      ))}
      <Pager nextPageToken={nextPageToken} basePath="/" tokenParam="page" />
    </main>
  );
}
