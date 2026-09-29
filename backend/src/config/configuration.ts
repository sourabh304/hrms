export type DbType = 'sqlite' | 'postgres';

export default () => ({
  port: parseInt(process.env.PORT ?? '4400', 10),
  env: process.env.NODE_ENV ?? 'development',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  db: {
    type: (process.env.DB_TYPE ?? 'sqlite') as DbType,
    sqlitePath: process.env.DB_SQLITE_PATH ?? 'data/segue-hrms.sqlite',
    url: process.env.DATABASE_URL,
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  cookies: {
    secure: process.env.COOKIE_SECURE === 'true',
  },
  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxBytes: parseInt(process.env.MAX_UPLOAD_MB ?? '10', 10) * 1024 * 1024,
  },
});
