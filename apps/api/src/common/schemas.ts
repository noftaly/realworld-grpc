import { Type } from '@sinclair/typebox';

// Requests arriving via @grpc/proto-loader always carry every scalar field (proto3 defaults to
// '' for unset strings), so these schemas only validate structural shape and hard requirements
// (e.g. signup fields). Softer "did the caller actually mean to change this" checks for partial
// updates are done ad-hoc in the handlers, since a TypeBox minLength here would reject legitimate
// partial updates where an untouched field arrives as ''.

export const SignInSchema = Type.Object({
  email: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 1 }),
});

const USERNAME_PATTERN = '^[a-zA-Z0-9_-]+$';
const EMAIL_PATTERN = '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$';

export const CreateUserSchema = Type.Object({
  user: Type.Object({
    username: Type.String({
      minLength: 3,
      maxLength: 32,
      pattern: USERNAME_PATTERN,
    }),
    email: Type.String({ pattern: EMAIL_PATTERN }),
  }),
  password: Type.String({ minLength: 8 }),
});

export const UpdateUserSchema = Type.Object({
  user: Type.Object({
    name: Type.String({ minLength: 1 }),
  }),
});

export const CreateArticleSchema = Type.Object({
  article: Type.Object({
    title: Type.String({ minLength: 1 }),
    body: Type.String({ minLength: 1 }),
  }),
});

export const UpdateArticleSchema = Type.Object({
  article: Type.Object({
    name: Type.String({ minLength: 1 }),
  }),
});

export const CreateCommentSchema = Type.Object({
  parent: Type.String({ minLength: 1 }),
  comment: Type.Object({
    body: Type.String({ minLength: 1 }),
  }),
});

export const UpdateCommentSchema = Type.Object({
  comment: Type.Object({
    name: Type.String({ minLength: 1 }),
  }),
});

export { EMAIL_PATTERN, USERNAME_PATTERN };
