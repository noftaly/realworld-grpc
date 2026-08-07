# realworld-grpc

A [RealWorld](https://github.com/gothinkster/realworld) blogging platform (articles, comments, favorites,
follows, profile blocking) built as a gRPC-only backend. `apps/api` is a NestJS microservice exposing the
`realworld.v1` contract from `packages/proto` (buf + ts-proto) over gRPC on Postgres via MikroORM. `apps/web`
is a Next.js App Router frontend that talks to the API directly with a generated gRPC client from server
components and server actions — no REST/HTTP gateway in between. Turborepo ties the workspace together.

## Prereqs

- Node.js >= 18, npm >= 11 (see `packageManager` in `package.json`)
- Docker (for local Postgres)

## Running the stack

```sh
# 1. Start Postgres
docker compose up -d

# 2. Build everything (proto codegen, api, web)
npx turbo run build

# 3. Start the API (gRPC on 0.0.0.0:50051, schema-syncs to Postgres on boot)
cd apps/api && npm run start:prod   # or `npm run start` for ts-node/dev mode

# 4. Start the web app (in another terminal)
cd apps/web && npm run start        # production build; `npm run dev` for hot reload
```

Web app: http://localhost:3000. API: gRPC on `localhost:50051` (no HTTP surface).

## Default env vars

| App | Var | Default |
| --- | --- | --- |
| api | `DATABASE_URL` | `postgres://realworld:realworld@localhost:5432/realworld` |
| api | `JWT_SECRET` | `dev-secret` |
| web | `API_GRPC_URL` | `localhost:50051` |

`docker-compose.yml` provisions Postgres with user/password/db all set to `realworld` on port 5432, matching
the API's default `DATABASE_URL`.

## Linting

- `npm run lint` — [Biome](https://biomejs.dev) format + lint check across the whole monorepo.
- `npm run lint:proto --workspace=@repo/proto` — `buf lint` on the proto contract.
- `npm run lint:aip --workspace=@repo/proto` — [api-linter](https://github.com/googleapis/api-linter) AIP compliance check (see `packages/proto/apilinter.yaml` for the disabled-rule rationale).

## License

MIT, see [LICENSE](./LICENSE).
