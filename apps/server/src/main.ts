import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  app.enableCors({ origin: true });
  app.setGlobalPrefix('api');
  const doc = new DocumentBuilder().setTitle('Army 3D API').setVersion('0.1').addBearerAuth().build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Army 3D server: http://localhost:${port}/api  ·  docs /api/docs  ·  ws /ws`, 'Bootstrap');
}
bootstrap();
