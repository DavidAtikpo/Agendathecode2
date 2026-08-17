import 'dotenv/config';
import pg from 'pg';

const emails = [
  'dubonservice78@gmail.com',
  'gbegnonkokou0@gmail.com',
  'agapemission2014@gmail.com',
  'ta@cides.tf',
  'mirandarivera.40208@gmail.com',
  'marcinrosa@poczta.fm',
  'rosamarcin1984@gmail.com',
  'niconitro@hotmail.co.uk',
];

const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const r = await p.query(
    `SELECT u.email, u.role::text AS role, u.name,
            (SELECT count(*)::int FROM agenda."SessionAssignment" sa WHERE sa."userId"=u.id) AS assignments,
            (SELECT string_agg(DISTINCT sa.role::text, ',') FROM agenda."SessionAssignment" sa WHERE sa."userId"=u.id) AS assign_roles
     FROM agenda."User" u
     WHERE lower(u.email) = ANY($1::text[])
     ORDER BY u.email`,
    [emails.map(e => e.toLowerCase())],
  );
  console.log(JSON.stringify(r.rows, null, 2));

  const roleCounts = await p.query(
    `SELECT role::text, count(*)::int AS n FROM agenda."User" GROUP BY role ORDER BY n DESC`,
  );
  console.log('ROLE COUNTS:', roleCounts.rows);
} finally {
  await p.end();
}
