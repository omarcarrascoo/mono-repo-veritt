import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  
  // Enable CORS for web access
  // Allow all origins in development, can be restricted via CORS_ORIGINS env var
  const corsOptions = {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  };
  app.enableCors(corsOptions);
  
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 Veritt Backend corriendo en: http://localhost:${process.env.PORT || 3000}/api/v1`);
  console.log(`🌐 CORS enabled: ${process.env.CORS_ORIGINS || 'All origins allowed (development mode)'}`);
}
bootstrap();