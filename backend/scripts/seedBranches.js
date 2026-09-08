require('dotenv').config();
const db = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');

const UNITS_PER_ZONE = 10;
const SUB_UNITS_PER_UNIT = 5;
const MEMBERS_PER_SUB_UNIT = 17;

const ZONE_PLAN = [
  'Lagos Zone',
  'Kano Zone',
  'Abuja Zone',
  'Port Harcourt Zone',
  'Ibadan Zone',
  'Enugu Zone',
];

const FIRST_NAMES = [
  'Adebayo', 'Chioma', 'Emeka', 'Fatima', 'Gloria', 'Hassan', 'Ifeoma', 'Jude',
  'Kemi', 'Lucky', 'Maryam', 'Ngozi', 'Obinna', 'Patience', 'Quadri', 'Ruth',
  'Samuel', 'Tunde', 'Uche', 'Victor', 'Wumi', 'Yakubu', 'Zainab', 'Amara',
  'Bisi', 'Chinedu', 'Damilola', 'Efe', 'Funke', 'Gboyega', 'Halima', 'Ibrahim',
  'Joy', 'Kehinde', 'Latifah', 'Musa', 'Nneka', 'Opeyemi', 'Peter', 'Ramatu',
  'Segun', 'Tobi', 'Usman', 'Veronica', 'Williams', 'Yemisi', 'Abubakar', 'Bola',
  'Chukwudi', 'Deborah', 'Eunice', 'Femi', 'Grace', 'Haruna', 'Ijeoma', 'Joseph',
  'Khadija', 'Lambert', 'Mercy', 'Noah', 'Oluwaseun', 'Paul', 'Rashidat', 'Shola',
  'Temitope', 'Ubong', 'Victoria', 'Wale', 'Yusuf', 'Aisha',
];

const LAST_NAMES = [
  'Adebayo', 'Okafor', 'Musa', 'Eze', 'Olawale', 'Okoro', 'Abubakar', 'Nwachukwu',
  'Adepoju', 'Umar', 'Chukwu', 'Balogun', 'Ike', 'Danjuma', 'Ojo', 'Njoku',
  'Suleiman', 'Adekunle', 'Obiora', 'Mohammed', 'Afolabi', 'Ogundele', 'Bello',
  'Onyeka', 'Kalu', 'Abdullahi', 'Ogunleye', 'Ebere', 'Shehu', 'Oyelaran',
  'Nnamdi', 'Yekini', 'Ajayi', 'Umeh', 'Garba', 'Osagie', 'Lawal', 'Okoye',
  'Bamidele', 'Igwe', 'Sani', 'Omodara', 'Kazeem', 'Nwankwo', 'Adeniyi',
];

const shortZone = (name) => name.replace(/ Zone$/, '');

async function ensureZones() {
  const existing = await db('zones').select('id', 'name', 'serial_number');
  const have = existing.map((z) => z.name);
  const created = [];
  let serialIdx = existing.length + 1;
  for (const name of ZONE_PLAN) {
    if (!have.includes(name)) {
      const serial = `ZN-${String(serialIdx).padStart(3, '0')}`;
      const [id] = await db('zones').insert({ name, serial_number: serial });
      created.push({ id, name, serial });
    }
    serialIdx += 1;
  }
  console.log(`zones: ${created.length} created`);
  return db('zones').select('id', 'name').orderBy('id');
}

async function ensureUnits(zones) {
  const unitSerialBase = (await db('units').count({ c: 'id' }).first()).c;
  let serialIdx = Number(unitSerialBase) + 1;
  for (const z of zones) {
    const zoneUnits = await db('units').where({ zone_id: z.id }).select('id', 'name').orderBy('id');
    const n = zoneUnits.length;
    for (let i = n; i < UNITS_PER_ZONE; i += 1) {
      const letter = String.fromCharCode(65 + i);
      const name = `${shortZone(z.name)} Unit ${letter}`;
      const serial = `UT-${String(serialIdx).padStart(3, '0')}`;
      const [id] = await db('units').insert({ zone_id: z.id, name, serial_number: serial });
      zoneUnits.push({ id, name });
      serialIdx += 1;
    }
  }
  console.log(`units ensured per zone: ${UNITS_PER_ZONE}`);
}

async function ensureSubUnits(zones) {
  const subSerialBase = (await db('sub_units').count({ c: 'id' }).first()).c;
  let serialIdx = Number(subSerialBase) + 1;
  const units = await db('units').select('id', 'name').orderBy('id');
  for (const u of units) {
    const subs = await db('sub_units').where({ unit_id: u.id }).select('id').orderBy('id');
    const n = subs.length;
    for (let i = n; i < SUB_UNITS_PER_UNIT; i += 1) {
      const name = `${u.name} Sub-${i + 1}`;
      const serial = `SU-${String(serialIdx).padStart(3, '0')}`;
      await db('sub_units').insert({ unit_id: u.id, name, serial_number: serial });
      serialIdx += 1;
    }
  }
  console.log(`sub-units ensured per unit: ${SUB_UNITS_PER_UNIT}`);
}

async function ensureMembers() {
  const subUnits = await db('sub_units').select('id').orderBy('id');
  const autoIncRow = await db.raw(
    "SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'members'"
  );
  let nextId = Number(autoIncRow[0][0].AUTO_INCREMENT);
  let phoneCounter = 1000000;
  let created = 0;
  const rows = [];

  for (const su of subUnits) {
    const cur = (await db('members').where({ sub_unit_id: su.id }).count({ c: 'id' }).first()).c;
    const need = MEMBERS_PER_SUB_UNIT - Number(cur);
    for (let i = 0; i < need; i += 1) {
      const id = nextId;
      nextId += 1;
      const firstName = FIRST_NAMES[id % FIRST_NAMES.length];
      const lastName = LAST_NAMES[id % LAST_NAMES.length];
      rows.push({
        id,
        member_code: `MEM-${String(id).padStart(6, '0')}`,
        name: `${firstName} ${lastName}`,
        phone: `0808${String(phoneCounter).padStart(7, '0')}`,
        gender: id % 2 === 0 ? 'MALE' : 'FEMALE',
        date_of_birth: new Date(1956 + ((id * 7) % 49), (id * 5) % 12 + 1, ((id * 11) % 27) + 1),
        contribution_category_id: 1,
        sub_unit_id: su.id,
        status: 'ACTIVE',
        registered_at: new Date(),
        registered_by: null,
      });
      phoneCounter += 1;
      created += 1;
      if (rows.length >= 500) {
        await db('members').insert(rows);
        rows.length = 0;
      }
    }
  }
  if (rows.length) await db('members').insert(rows);

  if (created > 0) {
    await db.raw('ALTER TABLE members AUTO_INCREMENT = ?', [nextId]);
  }
  console.log(`members created: ${created}`);
}

async function ensurePeriod() {
  const existing = await db('contribution_periods').where({ month: 1, year: 2027 }).first();
  let pid = existing && existing.id;
  if (!pid) {
    [pid] = await db('contribution_periods').insert({ month: 1, year: 2027, status: 'OPEN' });
    console.log(`new open period created: id ${pid} (Jan 2027)`);
  }
  const existingRows = await db('member_contributions').where({ contribution_period_id: pid }).count({ c: 'id' }).first();
  if (Number(existingRows.c) === 0) {
    await db.raw(
      'INSERT INTO member_contributions (member_id, contribution_period_id, expected_amount) SELECT m.id, ?, c.amount FROM members m JOIN contribution_categories c ON c.id = m.contribution_category_id WHERE m.status = ?',
      [pid, 'ACTIVE']
    );
  }
  const excl = await db.raw('SELECT COUNT(*) AS c FROM member_contributions WHERE contribution_period_id = ?', [pid]);
  console.log(`contributions for period ${pid}: ${excl[0][0].c}`);
}

async function ensureUsers() {
  const users = [
    { name: 'Kano Zone Admin', role_id: 2, zone_id: 2, unit_id: null, sub_unit_id: null, phone: '08091000000' },
    { name: 'Abuja Zone Admin', role_id: 2, zone_id: 3, unit_id: null, sub_unit_id: null, phone: '08091000001' },
  ];
  const zone3Units = await db('units').where({ zone_id: 3 }).select('id').orderBy('id');
  const zone3Subs = await db('sub_units').where({ unit_id: zone3Units[0].id }).select('id').orderBy('id');
  users.push(
    { name: 'Abuja Unit Officer', role_id: 3, zone_id: 3, unit_id: zone3Units[0].id, sub_unit_id: null, phone: '08091000002' },
    { name: 'Abuja Sub Officer', role_id: 4, zone_id: 3, unit_id: zone3Units[0].id, sub_unit_id: zone3Subs[0].id, phone: '08091000003' },
    { name: 'Abuja Collector', role_id: 5, zone_id: 3, unit_id: zone3Units[0].id, sub_unit_id: zone3Subs[0].id, phone: '08091000004' },
  );
  const hash = await hashPassword('password123');
  let created = 0;
  for (const u of users) {
    const exists = await db('users').where({ phone: u.phone }).first();
    if (!exists) {
      await db('users').insert({ ...u, password_hash: hash, status: 'ACTIVE' });
      created += 1;
    }
  }
  console.log(`test users created: ${created} (password123)`);
}

(async () => {
  const zones = await ensureZones();
  await ensureUnits(zones);
  await ensureSubUnits(zones);
  await ensureMembers();
  await ensurePeriod();
  await ensureUsers();
  const c = {
    zones: (await db('zones').count({ c: 'id' }).first()).c,
    units: (await db('units').count({ c: 'id' }).first()).c,
    subUnits: (await db('sub_units').count({ c: 'id' }).first()).c,
    members: (await db('members').count({ c: 'id' }).first()).c,
  };
  console.log('TOTALS:', JSON.stringify(c));
  process.exit(0);
})().catch((e) => {
  console.error('SEED ERROR:', e);
  process.exit(1);
});