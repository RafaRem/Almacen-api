import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { databaseEntities } from './database.config';

config();

const useSsl = process.env.DATABASE_SSL === 'true';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5433', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'almacen_db',
  timezone: 'America/Mexico_City',
  uuidExtension: 'pgcrypto',
  entities: databaseEntities,
  migrations: ['src/migrations/*.ts'],
  ssl: useSsl
    ? {
        rejectUnauthorized:
          process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
      }
    : undefined,
  synchronize: false,
} as any;

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
