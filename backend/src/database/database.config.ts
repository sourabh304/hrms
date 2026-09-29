import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DbType } from '../config/configuration.js';

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const type = config.get<DbType>('db.type');
  const shared = {
    autoLoadEntities: true,
    synchronize: config.get<boolean>('db.synchronize'),
    logging: config.get<boolean>('db.logging'),
  };

  if (type === 'postgres') {
    return { type: 'postgres', url: config.get<string>('db.url'), ...shared };
  }

  const database = config.get<string>('db.sqlitePath')!;
  mkdirSync(dirname(database), { recursive: true });
  return { type: 'better-sqlite3', database, ...shared };
}
