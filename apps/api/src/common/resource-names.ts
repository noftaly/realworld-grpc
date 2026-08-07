import { invalidArgument } from './errors';

export const userName = (id: string) => `users/${id}`;
export const articleName = (id: string) => `articles/${id}`;
export const articleCommentName = (articleId: string, commentId: string) =>
  `articles/${articleId}/comments/${commentId}`;
export const userCommentName = (userId: string, commentId: string) =>
  `users/${userId}/comments/${commentId}`;

export function parseUserName(name: string): string {
  const m = /^users\/([^/]+)$/.exec(name ?? '');
  if (!m) throw invalidArgument(`invalid user resource name: "${name}"`);
  return m[1];
}

export function parseArticleName(name: string): string {
  const m = /^articles\/([^/]+)$/.exec(name ?? '');
  if (!m) throw invalidArgument(`invalid article resource name: "${name}"`);
  return m[1];
}

// Comment names come in two shapes (articles/{a}/comments/{c} or users/{u}/comments/{c}) but
// comment ids are globally unique (single table), so only the trailing id is needed to look one up.
export function parseCommentName(name: string): string {
  const m = /^(?:articles|users)\/[^/]+\/comments\/([^/]+)$/.exec(name ?? '');
  if (!m) throw invalidArgument(`invalid comment resource name: "${name}"`);
  return m[1];
}

// parent is "articles/{article}" or "users/{user}" per CreateCommentRequest/ListCommentsRequest.
export function parseCommentParent(parent: string): {
  kind: 'article' | 'user';
  id: string;
} {
  const article = /^articles\/([^/]+)$/.exec(parent ?? '');
  if (article) return { kind: 'article', id: article[1] };
  const user = /^users\/([^/]+)$/.exec(parent ?? '');
  if (user) return { kind: 'user', id: user[1] };
  throw invalidArgument(`invalid comment parent: "${parent}"`);
}
