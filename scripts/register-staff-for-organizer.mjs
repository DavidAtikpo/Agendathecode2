/**
 * Rattache un intervenant (formateur / assessor / auditeur) à un organisateur
 * pour qu'il apparaisse dans « Intervenants créés » (StaffRegistration + staffCreatedById).
 *
 * Usage (depuis le dossier agenda/, avec DATABASE_URL de production) :
 *   node scripts/register-staff-for-organizer.mjs <staffUserId> <organizerId>
 *   node scripts/register-staff-for-organizer.mjs <staffUserId> <organizerId> --dry-run
 *   node scripts/register-staff-for-organizer.mjs <staffUserId> <organizerId> --force
 *
 * Exemple :
 *   node scripts/register-staff-for-organizer.mjs cmrufdby1000004jvtuildu9k cmnx2347t000004l2u8b1xew4
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const STAFF_ROLES = new Set(['formateur', 'assessor', 'auditeur']);
const ORGANIZER_ROLES = new Set(['organizer', 'admin']);

function usage() {
  console.error(`
Usage:
  node scripts/register-staff-for-organizer.mjs <staffUserId> <organizerId> [options]

Options:
  --dry-run   Affiche ce qui serait fait sans écrire en base
  --force     Réassigne même si un autre organisateur est déjà enregistré
`);
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  const positional = argv.filter(a => !a.startsWith('--'));
  const [staffUserId, organizerId] = positional;

  if (!staffUserId || !organizerId) usage();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL manquant (.env ou variable d’environnement).');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const [staff, organizer, existingReg] = await Promise.all([
      prisma.user.findUnique({
        where: { id: staffUserId },
        select: { id: true, email: true, name: true, role: true, staffCreatedById: true },
      }),
      prisma.user.findUnique({
        where: { id: organizerId },
        select: { id: true, email: true, name: true, role: true },
      }),
      prisma.staffRegistration.findUnique({
        where: { staffUserId },
        select: { createdById: true, createdAt: true },
      }),
    ]);

    if (!staff) {
      console.error(`Intervenant introuvable: ${staffUserId}`);
      process.exit(1);
    }
    if (!STAFF_ROLES.has(staff.role)) {
      console.error(
        `L'utilisateur ${staff.email} a le rôle « ${staff.role} », pas formateur/assessor/auditeur.`,
      );
      process.exit(1);
    }
    if (!organizer) {
      console.error(`Organisateur introuvable: ${organizerId}`);
      process.exit(1);
    }
    if (!ORGANIZER_ROLES.has(organizer.role)) {
      console.error(
        `L'utilisateur ${organizer.email} a le rôle « ${organizer.role} », pas organizer/admin.`,
      );
      process.exit(1);
    }

    if (existingReg && existingReg.createdById !== organizerId && !force) {
      const other = await prisma.user.findUnique({
        where: { id: existingReg.createdById },
        select: { email: true, name: true },
      });
      console.error(
        `Déjà enregistré pour un autre organisateur (${other?.email ?? existingReg.createdById}). Utilisez --force pour réassigner.`,
      );
      process.exit(1);
    }

    console.log('Intervenant:', staff.name, `<${staff.email}>`, `(${staff.role})`);
    console.log('Organisateur:', organizer.name, `<${organizer.email}>`);
    console.log('staffCreatedById actuel:', staff.staffCreatedById ?? '(null)');
    console.log('StaffRegistration actuelle:', existingReg ? existingReg.createdById : '(aucune)');

    if (dryRun) {
      console.log('\n[--dry-run] Aucune modification en base.');
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: staffUserId },
        data: { staffCreatedById: organizerId },
      }),
      prisma.staffRegistration.upsert({
        where: { staffUserId },
        create: { staffUserId, createdById: organizerId },
        update: { createdById: organizerId },
      }),
    ]);

    console.log('\nOK — enregistrement effectué. L’organisateur devrait voir cet intervenant après rechargement.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
