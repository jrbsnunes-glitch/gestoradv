import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

/** Espelha a configuração essencial de [main.ts](../src/main.ts) para testes e2e. */
export function configureE2EApp(app: INestApplication): void {
  app.use(helmet());
  app.enableCors({
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
