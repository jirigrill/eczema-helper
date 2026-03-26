import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ??
  'postgres://eczema:eczema_dev@localhost:5432/eczema_helper';

export const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});
