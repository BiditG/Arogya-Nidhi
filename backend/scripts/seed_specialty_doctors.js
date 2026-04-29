import 'dotenv/config';
import { randomUUID } from 'crypto';
import supabase from '../config/supabase.js';

const nowIso = () => new Date().toISOString();

const doctorSeeds = [
  {
    name: 'Dr. Rajesh Sharma',
    email: 'dr.sharma@example.com',
    phone: '9800000001',
    specialty: 'Cardiology',
    sub_specialty: 'Interventional Cardiology',
    qualifications: 'MBBS, MD Cardiology',
    consultation_fee: 1500,
    license_no: 'LIC-89150',
  },
  {
    name: 'Dr. Sita Karki',
    email: 'dr.karki@example.com',
    phone: '9800000002',
    specialty: 'Dermatology',
    sub_specialty: 'Cosmetic Dermatology',
    qualifications: 'MBBS, MD Dermatology',
    consultation_fee: 1200,
    license_no: 'LIC-65280',
  },
  {
    name: 'Dr. Anil Basnet',
    email: 'dr.basnet@example.com',
    phone: '9800000003',
    specialty: 'Orthopedics',
    sub_specialty: 'Spine Specialist',
    qualifications: 'MBBS, MS Orthopedics',
    consultation_fee: 1400,
    license_no: 'LIC-29483',
  },
  {
    name: 'Dr. Nisha Gautam',
    email: 'dr.gautam@example.com',
    phone: '9800000004',
    specialty: 'Neurology',
    sub_specialty: 'Stroke and Neurocritical Care',
    qualifications: 'MBBS, DM Neurology',
    consultation_fee: 1800,
    license_no: 'LIC-77541',
  },
  {
    name: 'Dr. Milan Adhikari',
    email: 'dr.adhikari@example.com',
    phone: '9800000005',
    specialty: 'General',
    sub_specialty: 'Family Medicine',
    qualifications: 'MBBS, MD Internal Medicine',
    consultation_fee: 900,
    license_no: 'LIC-18364',
  },
  {
    name: 'Dr. Priya Rai',
    email: 'dr.rai@example.com',
    phone: '9800000006',
    specialty: 'Pediatrics',
    sub_specialty: 'Neonatology',
    qualifications: 'MBBS, MD Pediatrics',
    consultation_fee: 1100,
    license_no: 'LIC-92736',
  },
];

async function upsertUser(seed) {
  const { data: existing, error: findErr } = await supabase
    .from('users')
    .select('id')
    .eq('email', seed.email)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        name: seed.name,
        role: 'doctor',
        phone: seed.phone,
        is_active: true,
        updated_at: nowIso(),
      })
      .eq('id', existing.id);

    if (updateErr) throw updateErr;
    return existing.id;
  }

  const userId = randomUUID();
  const { error: createErr } = await supabase.from('users').insert({
    id: userId,
    email: seed.email,
    role: 'doctor',
    name: seed.name,
    phone: seed.phone,
    is_active: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  if (createErr) throw createErr;
  return userId;
}

async function upsertDoctorProfile(userId, seed) {
  const { data: existing, error: findErr } = await supabase
    .from('doctor_profiles')
    .select('id,license_no')
    .eq('user_id', userId)
    .maybeSingle();

  if (findErr) throw findErr;

  // Keep existing license for existing profile rows to avoid unique collisions.
  let resolvedLicenseNo = existing?.license_no || seed.license_no;
  if (!existing?.id) {
    const { data: byLicense, error: byLicenseErr } = await supabase
      .from('doctor_profiles')
      .select('id,user_id')
      .eq('license_no', resolvedLicenseNo)
      .maybeSingle();
    if (byLicenseErr) throw byLicenseErr;
    if (byLicense?.id && byLicense?.user_id !== userId) {
      resolvedLicenseNo = `${resolvedLicenseNo}-${userId.slice(0, 6)}`;
    }
  }

  const payload = {
    user_id: userId,
    license_no: resolvedLicenseNo,
    specialty: seed.specialty,
    sub_specialty: seed.sub_specialty,
    qualifications: seed.qualifications,
    consultation_fee: seed.consultation_fee,
    is_verified: true,
    is_available: true,
    updated_at: nowIso(),
  };

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from('doctor_profiles')
      .update(payload)
      .eq('id', existing.id);

    if (updateErr) throw updateErr;
    return 'updated';
  }

  const { error: createErr } = await supabase.from('doctor_profiles').insert({
    ...payload,
    created_at: nowIso(),
  });

  if (createErr) throw createErr;
  return 'created';
}

async function run() {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Check backend/.env SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const seed of doctorSeeds) {
    try {
      const userId = await upsertUser(seed);
      const action = await upsertDoctorProfile(userId, seed);
      if (action === 'created') created += 1;
      else updated += 1;
      console.log(`${action.toUpperCase()}: ${seed.name} (${seed.specialty})`);
    } catch (err) {
      failed += 1;
      console.error(`FAILED: ${seed.name} (${seed.specialty}) -> ${err.message || err}`);
    }
  }

  const { data: profiles, error } = await supabase
    .from('doctor_profiles')
    .select('specialty,is_verified,is_available')
    .eq('is_verified', true)
    .eq('is_available', true);

  if (error) throw error;

  const coverage = (profiles || []).reduce((acc, row) => {
    const key = row.specialty || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('\\nSeed complete');
  console.log(`doctor_profiles created: ${created}, updated: ${updated}, failed: ${failed}`);
  console.log('Specialty coverage:', coverage);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message || err);
    process.exit(1);
  });
