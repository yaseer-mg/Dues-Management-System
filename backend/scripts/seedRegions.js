// Dev/test seed for Regions feature (LOCAL ONLY - not run in production).
// Creates two sample regions with coordinators and assigns existing zones.
// Idempotent: safe to re-run.
const db = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');

async function run() {
  const role = await db('roles').where('name', 'Region Management').first();
  const pw = await hashPassword('password123');
  const zoneByName = {};
  for (const z of await db('zones')) zoneByName[z.name] = z.id;

  const plan = [
    { serial: 'RG-001', name: 'North Region', coordinator: { name: 'Zainab Yusuf', phone: '08099000001' }, zones: ['Kano Zone', 'Abuja Zone', 'Enugu Zone'] },
    { serial: 'RG-002', name: 'South Region', coordinator: { name: 'Efe Okafor', phone: '08099000002' }, zones: ['Lagos Zone', 'Port Harcourt Zone', 'Ibadan Zone'] },
  ];

  for (const p of plan) {
    let region = await db('regions').where('serial_number', p.serial).first();
    if (!region) {
      const [region_id] = await db('regions').insert({ name: p.name, serial_number: p.serial });
      region = { id: region_id };
      console.log('created region', p.serial, p.name);
    }

    let coordinator = await db('users').where('phone', p.coordinator.phone).first();
    if (!coordinator) {
      const [user_id] = await db('users').insert({
        name: p.coordinator.name,
        phone: p.coordinator.phone,
        role_id: role.id,
        region_id: region.id,
        password_hash: pw,
        status: 'ACTIVE',
      });
      coordinator = { id: user_id };
      console.log('created coordinator', p.coordinator.phone);
    }
    await db('users').where('id', coordinator.id).update({ region_id: region.id });
    await db('regions').where('id', region.id).update({ coordinator_id: coordinator.id });

    for (const zoneName of p.zones) {
      const zid = zoneByName[zoneName];
      if (zid !== undefined) {
        await db('zones').where('id', zid).update({ region_id: region.id });
      } else {
        console.warn('zone not found:', zoneName);
      }
    }
    console.log('region', p.serial, 'zones assigned; coordinator', p.coordinator.phone);
  }

  await db.destroy();
  console.log('DONE');
}

run().catch(async (e) => {
  console.error(e.message);
  await db.destroy();
  process.exit(1);
});