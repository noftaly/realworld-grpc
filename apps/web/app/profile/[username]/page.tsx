import type { User } from '@repo/proto/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { CommentSection } from '@/components/CommentSection';
import { Pager } from '@/components/Pager';
import {
  blockAction,
  followAction,
  unblockAction,
  unfollowAction,
} from '@/lib/actions/users';
import { getCurrentUser, getToken } from '@/lib/auth';
import { authMetadata, grpc } from '@/lib/grpc';
import { resolveAuthors } from '@/lib/resolve';

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{
    tab?: string;
    articlesPage?: string;
    favoritedPage?: string;
    commentsPage?: string;
  }>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const token = await getToken();

  let profile: User;
  try {
    profile = await grpc.lookupUser({ username }, authMetadata(token));
  } catch {
    notFound();
  }
  const viewer = await getCurrentUser();

  const tab = sp.tab === 'favorited' ? 'favorited' : 'articles';
  const filter =
    tab === 'favorited' ? `favorited_by="${username}"` : `author="${username}"`;
  const articlesPageToken =
    tab === 'favorited' ? sp.favoritedPage : sp.articlesPage;

  const { articles, nextPageToken } = await grpc.listArticles(
    { pageSize: 10, pageToken: articlesPageToken ?? '', filter },
    authMetadata(token),
  );
  const authors = await resolveAuthors(
    articles.map((a) => a.author),
    token,
  );

  const isOwner = viewer?.name === profile.name;
  const path = `/profile/${username}`;
  const tabPath = `${path}?tab=${tab}`;

  return (
    <main className="container">
      <section className="profile-header">
        {profile.image && (
          <img src={profile.image} alt={profile.username} className="avatar" />
        )}
        <h1>{profile.username}</h1>
        {profile.bio && <p className="bio">{profile.bio}</p>}
        {isOwner ? (
          <Link href="/settings" className="btn-secondary">
            Edit settings
          </Link>
        ) : viewer ? (
          <div className="profile-actions">
            <form
              action={(profile.following ? unfollowAction : followAction).bind(
                null,
                profile.name,
                path,
              )}
              className="inline-form"
            >
              <button type="submit">
                {profile.following ? 'Unfollow' : 'Follow'} {profile.username}
              </button>
            </form>
            <form
              action={(profile.blocked ? unblockAction : blockAction).bind(
                null,
                profile.name,
                path,
              )}
              className="inline-form"
            >
              <button type="submit" className="btn-secondary">
                {profile.blocked ? 'Unblock' : 'Block'}
              </button>
            </form>
          </div>
        ) : null}
      </section>

      <nav className="tabs">
        <Link
          href={`${path}?tab=articles`}
          className={tab === 'articles' ? 'active' : ''}
        >
          Articles
        </Link>
        <Link
          href={`${path}?tab=favorited`}
          className={tab === 'favorited' ? 'active' : ''}
        >
          Favorited
        </Link>
      </nav>

      {articles.length === 0 && <p className="muted">No articles.</p>}
      {articles.map((article) => (
        <ArticleCard
          key={article.name}
          article={article}
          author={authors.get(article.author)}
          path={tabPath}
        />
      ))}
      <Pager
        nextPageToken={nextPageToken}
        basePath={path}
        currentParams={{ tab }}
        tokenParam={tab === 'favorited' ? 'favoritedPage' : 'articlesPage'}
      />

      <CommentSection
        parent={profile.name}
        path={path}
        pageToken={sp.commentsPage}
        currentParams={{
          tab,
          articlesPage: sp.articlesPage,
          favoritedPage: sp.favoritedPage,
        }}
        viewerName={viewer?.name}
        canModerate={isOwner}
      />
    </main>
  );
}
