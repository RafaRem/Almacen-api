process.env.NODE_ENV = 'test';
process.env.DATABASE_HOST = process.env.DATABASE_HOST ?? 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT ?? '5432';
process.env.DATABASE_USER = process.env.DATABASE_USER ?? 'test_user';
process.env.DATABASE_PASSWORD =
  process.env.DATABASE_PASSWORD ?? 'test_password';
process.env.DATABASE_NAME = process.env.DATABASE_NAME ?? 'almacen_test';
process.env.DATABASE_SYNCHRONIZE = 'false';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
