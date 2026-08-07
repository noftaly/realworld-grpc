import { redirect } from 'next/navigation';
import { EditorForm } from '@/components/EditorForm';
import { createArticleAction } from '@/lib/actions/articles';
import { getCurrentUser } from '@/lib/auth';

export default async function NewArticlePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="container narrow">
      <h1>New article</h1>
      <EditorForm action={createArticleAction} />
    </main>
  );
}
