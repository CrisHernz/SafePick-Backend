import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { SecretsService } from "./config/secrets.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Security: Helmet for HTTP security headers (more permissive in development)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    })
  );

  // ✅ Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // ✅ CORS configuration (restrictive)
  const secretsService = app.get(SecretsService);
  const allowedOrigins = secretsService.getAllowedOrigins();

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Total-Count", "X-Page-Count"],
    maxAge: 3600,
  });

  // ✅ Additional security headers
  app.use((req, res, next) => {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );
    res.removeHeader("X-Powered-By");
    res.setHeader("Server", "SafePick/1.0");
    next();
  });

  const port = process.env.PORT || 3001;
  const host = process.env.HOST || "0.0.0.0";
  const env = process.env.NODE_ENV || "development";

  await app.listen(port, host);
  console.log(`✅ SafePick API running on http://${host}:${port} [${env}]`);
}

bootstrap().catch((err) => {
  console.error("❌ Application failed to start:", err.message);
  process.exit(1);
});
