import type { Article } from '@repo/proto/client';
import { notFound, redirect } from 'next/navigation';
import { EditorForm } from '@/components/EditorForm';
import { updateArticleAction } from '@/lib/actions/articles';
import { getCurrentUser, getToken } from '@/lib/auth';
import { authMetadata, grpc } from '@/lib/grpc';

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const token = await getToken();
  let article: Article;
  try {
    article = await grpc.lookupArticle({ slug }, authMetadata(token));
  } catch {
    notFound();
  }

  if (article.author !== user.name) redirect(`/article/${slug}`);

  const action = updateArticleAction.bind(null, article.name, article.slug, {
    title: article.title,
    description: article.description,
    body: article.body,
  });

  return (
    <main className="container narrow">
      <h1>Edit article</h1>
      <EditorForm action={action} initial={article} />
    </main>
  );
}
