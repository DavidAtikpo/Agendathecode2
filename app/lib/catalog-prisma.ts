import { PrismaClient } from '@prisma/catalog-client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForCatalog = globalThis as unknown as { catalogPrisma: PrismaClient | undefined };

function createCatalogClient() {
  const url = process.env.CATALOG_DATABASE_URL;
  if (!url) {
    throw new Error(
      'CATALOG_DATABASE_URL est manquant. Ajoutez-le dans .env ou .env.local (base catalogue sessions).',
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const catalogPrisma = globalForCatalog.catalogPrisma ?? createCatalogClient();

if (process.env.NODE_ENV !== 'production') {
  globalForCatalog.catalogPrisma = catalogPrisma;
}
