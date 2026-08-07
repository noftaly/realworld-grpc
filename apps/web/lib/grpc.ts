import {
  credentials,
  Metadata,
  type ServiceError,
  status,
} from '@grpc/grpc-js';
import {
  type Article,
  ArticleServiceClient,
  AuthServiceClient,
  type BlockUserRequest,
  type Comment,
  CommentServiceClient,
  type CreateArticleRequest,
  type CreateCommentRequest,
  type CreateUserRequest,
  type DeleteArticleRequest,
  type DeleteCommentRequest,
  type FavoriteArticleRequest,
  type FollowUserRequest,
  type GetArticleRequest,
  type GetUserRequest,
  type ListArticlesRequest,
  type ListArticlesResponse,
  type ListCommentsRequest,
  type ListCommentsResponse,
  type LookupArticleRequest,
  type LookupUserRequest,
  type SignInRequest,
  type SignInResponse,
  type UnblockUserRequest,
  type UnfavoriteArticleRequest,
  type UnfollowUserRequest,
  type UpdateArticleRequest,
  type UpdateCommentRequest,
  type UpdateUserRequest,
  type User,
  UserServiceClient,
} from '@repo/proto/client';

const ADDRESS = process.env.API_GRPC_URL ?? 'localhost:50051';

const authClient = new AuthServiceClient(ADDRESS, credentials.createInsecure());
const userClient = new UserServiceClient(ADDRESS, credentials.createInsecure());
const articleClient = new ArticleServiceClient(
  ADDRESS,
  credentials.createInsecure(),
);
const commentClient = new CommentServiceClient(
  ADDRESS,
  credentials.createInsecure(),
);

// The generated clients type each method with three overloads (cb / metadata+cb /
// metadata+options+cb); passing `client[method]` around loses that, so `client` is
// `any` here and every call site below pins the real Req/Res types via generics.
function promisify<Req, Res>(client: any, method: string) {
  return (req: Req, metadata: Metadata = new Metadata()): Promise<Res> =>
    new Promise<Res>((resolve, reject) => {
      client[method](req, metadata, (err: ServiceError | null, res: Res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
}

export const grpc = {
  signIn: promisify<SignInRequest, SignInResponse>(authClient, 'signIn'),

  createUser: promisify<CreateUserRequest, User>(userClient, 'createUser'),
  getUser: promisify<GetUserRequest, User>(userClient, 'getUser'),
  updateUser: promisify<UpdateUserRequest, User>(userClient, 'updateUser'),
  lookupUser: promisify<LookupUserRequest, User>(userClient, 'lookupUser'),
  followUser: promisify<FollowUserRequest, User>(userClient, 'followUser'),
  unfollowUser: promisify<UnfollowUserRequest, User>(
    userClient,
    'unfollowUser',
  ),
  blockUser: promisify<BlockUserRequest, User>(userClient, 'blockUser'),
  unblockUser: promisify<UnblockUserRequest, User>(userClient, 'unblockUser'),

  createArticle: promisify<CreateArticleRequest, Article>(
    articleClient,
    'createArticle',
  ),
  getArticle: promisify<GetArticleRequest, Article>(
    articleClient,
    'getArticle',
  ),
  lookupArticle: promisify<LookupArticleRequest, Article>(
    articleClient,
    'lookupArticle',
  ),
  listArticles: promisify<ListArticlesRequest, ListArticlesResponse>(
    articleClient,
    'listArticles',
  ),
  updateArticle: promisify<UpdateArticleRequest, Article>(
    articleClient,
    'updateArticle',
  ),
  deleteArticle: promisify<DeleteArticleRequest, unknown>(
    articleClient,
    'deleteArticle',
  ),
  favoriteArticle: promisify<FavoriteArticleRequest, Article>(
    articleClient,
    'favoriteArticle',
  ),
  unfavoriteArticle: promisify<UnfavoriteArticleRequest, Article>(
    articleClient,
    'unfavoriteArticle',
  ),

  createComment: promisify<CreateCommentRequest, Comment>(
    commentClient,
    'createComment',
  ),
  listComments: promisify<ListCommentsRequest, ListCommentsResponse>(
    commentClient,
    'listComments',
  ),
  updateComment: promisify<UpdateCommentRequest, Comment>(
    commentClient,
    'updateComment',
  ),
  deleteComment: promisify<DeleteCommentRequest, unknown>(
    commentClient,
    'deleteComment',
  ),
};

export function authMetadata(token?: string): Metadata {
  const metadata = new Metadata();
  if (token) metadata.set('authorization', `Bearer ${token}`);
  return metadata;
}

export function friendlyError(err: unknown): string {
  const serviceErr = err as Partial<ServiceError> | undefined;
  if (serviceErr && typeof serviceErr.code === 'number') {
    switch (serviceErr.code) {
      case status.NOT_FOUND:
        return 'Not found.';
      case status.ALREADY_EXISTS:
        return 'That username or email is already taken.';
      case status.UNAUTHENTICATED:
        return 'Please sign in and try again.';
      case status.PERMISSION_DENIED:
        return "You don't have permission to do that.";
      case status.INVALID_ARGUMENT:
        return serviceErr.details || 'Invalid input.';
      default:
        return serviceErr.details || 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
