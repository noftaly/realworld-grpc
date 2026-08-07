import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ArticlesModule } from './articles/articles.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { MikroOrmRpcInterceptor } from './common/mikro-orm-rpc.interceptor';
import { Article } from './entities/article.entity';
import { Block } from './entities/block.entity';
import { Comment } from './entities/comment.entity';
import { Favorite } from './entities/favorite.entity';
import { Follow } from './entities/follow.entity';
import { User } from './entities/user.entity';
import { UsersModule } from './users/users.module';

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
    AuthModule,
    UsersModule,
    ArticlesModule,
    CommentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: MikroOrmRpcInterceptor },
  ],
})
export class AppModule {}
