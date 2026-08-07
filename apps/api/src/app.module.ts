import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { MikroOrmRpcInterceptor } from './common/mikro-orm-rpc.interceptor';
import { ArticlesController } from './controllers/articles.controller';
import { AuthController } from './controllers/auth.controller';
import { CommentsController } from './controllers/comments.controller';
import { UsersController } from './controllers/users.controller';
import { Article } from './entities/article.entity';
import { Block } from './entities/block.entity';
import { Comment } from './entities/comment.entity';
import { Favorite } from './entities/favorite.entity';
import { Follow } from './entities/follow.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    MikroOrmModule.forRoot({
      driver: PostgreSqlDriver,
      clientUrl:
        process.env.DATABASE_URL ||
        'postgres://realworld:realworld@localhost:5432/realworld',
      entities: [User, Article, Comment, Follow, Block, Favorite],
      allowGlobalContext: true,
    }),
  ],
  controllers: [
    AuthController,
    UsersController,
    ArticlesController,
    CommentsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: MikroOrmRpcInterceptor },
  ],
})
export class AppModule {}
