import * as path from 'node:path';
import { MikroORM } from '@mikro-orm/postgresql';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { PROTO_DIR, PROTO_VENDOR_DIR } from '@repo/proto';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: '0.0.0.0:50051',
        package: 'realworld.v1',
        protoPath: [
          path.join(PROTO_DIR, 'realworld/v1/auth.proto'),
          path.join(PROTO_DIR, 'realworld/v1/user.proto'),
          path.join(PROTO_DIR, 'realworld/v1/article.proto'),
          path.join(PROTO_DIR, 'realworld/v1/comment.proto'),
        ],
        loader: {
          includeDirs: [PROTO_DIR, PROTO_VENDOR_DIR],
          keepCase: false,
          longs: Number,
          enums: String,
          defaults: true,
          oneofs: true,
          arrays: true,
          objects: true,
        },
      },
    },
  );

  // PoC schema management: sync the DB to the entity definitions on boot, no migration files.
  const orm = app.get(MikroORM);
  await orm.schema.update();

  await app.listen();
  console.log('gRPC server listening on 0.0.0.0:50051');
}
bootstrap();
