import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from 'prisma/config';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: 'prisma/catalog-schema.prisma',
  datasource: {
    url: process.env.CATALOG_DATABASE_URL ?? '',
  },
});
