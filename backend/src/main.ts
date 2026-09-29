import 'dotenv/config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { ACCESS_COOKIE } from './modules/auth/auth.constants.js';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get<string[]>('corsOrigin'), credentials: true });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new TypeOrmExceptionFilter());
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Segue HRMS API')
    .setDescription('Enterprise Human Capital Management platform — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(ACCESS_COOKIE)
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>('port')!;
  await app.listen(port);
  Logger.log(`Segue HRMS API ready on http://localhost:${port}/api/v1  (docs: /api/docs)`, 'Bootstrap');
}
await bootstrap();
