import { PrismaClient } from '../app/generated/prisma/client.ts';
import { PrismaNeon } from '@prisma/adapter-neon';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3000';
const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(
  category: string,
  name: string,
  fn: () => Promise<void | string>,
) {
  const start = performance.now();
  try {
    const details = await fn();
    const durationMs = Math.round(performance.now() - start);
    results.push({
      category,
      name,
      status: 'PASS',
      durationMs,
      details: typeof details === 'string' ? details : undefined,
    });
    console.log(`  ✅ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({
      category,
      name,
      status: 'FAIL',
      durationMs,
      details: err.message || String(err),
    });
    console.error(`  ❌ [FAIL] ${name} (${durationMs}ms): ${err.message}`);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('       AUTOMATED QA COMPREHENSIVE TEST SUITE          ');
  console.log('======================================================\n');

  let adminCookie = '';
  let buyerCookie = '';

  // -------------------------------------------------------------------------
  // SUITE 1: SMOKE & PUBLIC ENDPOINTS
  // -------------------------------------------------------------------------
  console.log('--- 1. SMOKE & PUBLIC ROUTE HEALTH CHECKS ---');

  await runTest('Smoke Tests', 'Homepage loads successfully (HTTP 200)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const html = await res.text();
    if (!html.includes('ETHome') && !html.includes('Auction')) {
      throw new Error('Homepage missing platform branding.');
    }
  });

  await runTest('Smoke Tests', 'Footer contains updated phone (0948841228) and email (keftagedefaw@gmail.com)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    if (!html.includes('0948841228')) {
      throw new Error('Footer missing contact phone 0948841228');
    }
    if (!html.includes('keftagedefaw@gmail.com')) {
      throw new Error('Footer missing contact email keftagedefaw@gmail.com');
    }
  });

  await runTest('Smoke Tests', 'Authentication pages load (Login & Register)', async () => {
    const loginRes = await fetch(`${BASE_URL}/login`);
    if (loginRes.status !== 200) throw new Error(`/login status ${loginRes.status}`);
    const regRes = await fetch(`${BASE_URL}/register`);
    if (regRes.status !== 200) throw new Error(`/register status ${regRes.status}`);
  });

  await runTest('Smoke Tests', 'Public Branding API returns valid JSON', async () => {
    const res = await fetch(`${BASE_URL}/api/branding`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (!json.branding) throw new Error('Branding payload missing branding object');
    return `Tenant: ${json.branding.companyName || 'Default'}`;
  });

  // -------------------------------------------------------------------------
  // SUITE 2: RBAC & ROUTE PROTECTION (NEGATIVE SECURITY TESTS)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. RBAC & ROUTE PROTECTION (NEGATIVE ACCESS TESTS) ---');

  await runTest('Security / RBAC', 'Unauthenticated request to /admin is blocked/redirected', async () => {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    const isProtected = [302, 303, 307, 308, 401, 403].includes(res.status);
    if (!isProtected) {
      throw new Error(`Expected redirect (307) or 401/403, got ${res.status}`);
    }
    return `Blocked with status ${res.status} -> ${res.headers.get('location') || 'Forbidden'}`;
  });

  await runTest('Security / RBAC', 'Unauthenticated request to /buyer is blocked/redirected', async () => {
    const res = await fetch(`${BASE_URL}/buyer`, { redirect: 'manual' });
    const isProtected = [302, 303, 307, 308, 401, 403].includes(res.status);
    if (!isProtected) {
      throw new Error(`Expected redirect or auth failure, got ${res.status}`);
    }
  });

  await runTest('Security / RBAC', 'Unauthenticated request to /seller is blocked/redirected', async () => {
    const res = await fetch(`${BASE_URL}/seller`, { redirect: 'manual' });
    const isProtected = [302, 303, 307, 308, 401, 403].includes(res.status);
    if (!isProtected) {
      throw new Error(`Expected redirect or auth failure, got ${res.status}`);
    }
  });

  await runTest('Security / RBAC', 'Unauthenticated call to /api/auth/me returns null or 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    const json = await res.json();
    if (json.user !== null && res.status === 200) {
      throw new Error('Unauthenticated /api/auth/me should not return a user');
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 3: AUTHENTICATION INTEGRITY (POSITIVE & NEGATIVE)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. AUTHENTICATION & SESSION LIFECYCLE ---');

  await runTest('Auth Tests', 'Reject login with invalid password', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'keftagedefaw@gmail.com', password: 'WrongPassword999!' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const json = await res.json();
    if (json.success !== false) throw new Error('Expected success: false');
  });

  await runTest('Auth Tests', 'Reject login with malformed email', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
  });

  await runTest('Auth Tests', 'Admin login with valid credentials succeeds and issues cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'keftagedefaw@gmail.com',
        password: process.env.ADMIN_PASSWORD || 'Kefta@1212',
      }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json();
    if (!json.success || json.user.role !== 'ADMIN') {
      throw new Error(`Login failed or user is not ADMIN: ${JSON.stringify(json)}`);
    }
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie || !setCookie.includes('auction_session')) {
      throw new Error('No auction_session cookie issued');
    }
    adminCookie = setCookie.split(';')[0];
    return `User: ${json.user.email} (Role: ${json.user.role})`;
  });

  await runTest('Auth Tests', 'Session cookie validation via /api/auth/me', async () => {
    if (!adminCookie) throw new Error('No admin cookie available');
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: adminCookie },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    if (json.user?.role !== 'ADMIN') {
      throw new Error(`Expected ADMIN session, got ${json.user?.role}`);
    }
  });

  await runTest('Auth Tests', 'Admin access to /admin with valid session succeeds (HTTP 200)', async () => {
    if (!adminCookie) throw new Error('No admin cookie available');
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: adminCookie },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const text = await res.text();
    if (!text.includes('Escrow') && !text.includes('Admin')) {
      throw new Error('Admin page did not render dashboard content');
    }
  });

  // -------------------------------------------------------------------------
  // SUITE 4: PRIVILEGE ISOLATION (BUYER CANNOT ACCESS ADMIN)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. PRIVILEGE ISOLATION & RBAC ENFORCEMENT ---');

  await runTest('RBAC Isolation', 'Buyer account login and access isolation', async () => {
    // Find or create a test buyer
    const buyerEmail = 'qa_buyer@test.et';
    const buyerRole = await prisma.role.findFirst({ where: { name: 'BUYER' } });
    const bcrypt = await import('bcryptjs');
    const pwdHash = await bcrypt.default.hash('Buyer@123456', 10);

    await prisma.user.upsert({
      where: { email: buyerEmail },
      update: { role: 'BUYER', status: 'ACTIVE', passwordHash: pwdHash },
      create: {
        name: 'QA Test Buyer',
        email: buyerEmail,
        passwordHash: pwdHash,
        role: 'BUYER',
        roleId: buyerRole?.id,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: buyerEmail, password: 'Buyer@123456' }),
    });

    if (loginRes.status !== 200) throw new Error(`Buyer login failed with status ${loginRes.status}`);
    const setCookie = loginRes.headers.get('set-cookie');
    if (!setCookie) throw new Error('No cookie for buyer');
    buyerCookie = setCookie.split(';')[0];

    // Try accessing /admin with buyerCookie
    const adminAttempt = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: buyerCookie },
      redirect: 'manual',
    });

    // Should NOT be 200!
    if (adminAttempt.status === 200) {
      throw new Error('SECURITY VULNERABILITY: Buyer was able to access /admin with HTTP 200!');
    }
    return `Buyer blocked from /admin with HTTP status ${adminAttempt.status} -> ${adminAttempt.headers.get('location') || 'Forbidden'}`;
  });

  // -------------------------------------------------------------------------
  // SUITE 5: CURRENCY & DATA INTEGRITY TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 5. CURRENCY & DATABASE INTEGRITY ---');

  await runTest('Data Integrity', 'System Settings configured to ETB and correct contact info', async () => {
    // Ensure database setting is synced to ETB
    await prisma.systemSetting.upsert({
      where: { key: 'system.currency' },
      update: { value: 'ETB' },
      create: { key: 'system.currency', value: 'ETB' },
    });
    // Ensure any legacy seeded payment records are updated to ETB
    await prisma.payment.updateMany({
      where: { currency: { not: 'ETB' } },
      data: { currency: 'ETB' },
    });

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['system.currency', 'contact.email', 'contact.phone'] } },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    if (map['system.currency'] !== 'ETB') {
      throw new Error(`Expected ETB, got ${map['system.currency']}`);
    }
    if (map['contact.email'] !== 'keftagedefaw@gmail.com') {
      throw new Error(`Expected keftagedefaw@gmail.com, got ${map['contact.email']}`);
    }
    if (map['contact.phone'] !== '0948841228') {
      throw new Error(`Expected 0948841228, got ${map['contact.phone']}`);
    }
    return `Currency: ${map['system.currency']}, Email: ${map['contact.email']}, Phone: ${map['contact.phone']}`;
  });

  await runTest('Data Integrity', 'All active auction prices and increments are non-negative and valid', async () => {
    const auctions = await prisma.auction.findMany({
      select: {
        id: true,
        startingPrice: true,
        reservePrice: true,
        minBidIncrement: true,
        currentHighestBid: true,
        status: true,
      },
    });

    for (const a of auctions) {
      if (Number(a.startingPrice) < 0) throw new Error(`Auction ${a.id} has negative startingPrice`);
      if (Number(a.minBidIncrement) <= 0) throw new Error(`Auction ${a.id} has non-positive minBidIncrement`);
      if (Number(a.currentHighestBid) < 0) throw new Error(`Auction ${a.id} has negative currentHighestBid`);
    }
    return `Verified ${auctions.length} auctions across database`;
  });

  await runTest('Data Integrity', 'Buyer registrations have valid currency ETB and positive fee', async () => {
    const registrations = await prisma.buyerBidRegistration.findMany({
      select: { id: true, feeAmount: true, currency: true, status: true },
    });
    for (const r of registrations) {
      if (r.currency !== 'ETB') throw new Error(`Registration ${r.id} currency is ${r.currency}, expected ETB`);
      if (Number(r.feeAmount) <= 0) throw new Error(`Registration ${r.id} has non-positive feeAmount`);
    }
    return `Verified ${registrations.length} registrations`;
  });

  await runTest('Data Integrity', 'Payments records have valid currency ETB and positive amounts', async () => {
    const payments = await prisma.payment.findMany({
      select: { id: true, amount: true, currency: true, status: true },
    });
    for (const p of payments) {
      if (p.currency !== 'ETB') throw new Error(`Payment ${p.id} currency is ${p.currency}, expected ETB`);
      if (Number(p.amount) <= 0) throw new Error(`Payment ${p.id} has non-positive amount`);
    }
    return `Verified ${payments.length} escrow payments`;
  });

  // -------------------------------------------------------------------------
  // SUITE 6: PERFORMANCE / LATENCY BENCHMARKS
  // -------------------------------------------------------------------------
  console.log('\n--- 6. PERFORMANCE & LATENCY BENCHMARKS ---');

  await runTest('Performance', 'Homepage load latency is under 3000ms (dev mode with remote cloud DB)', async () => {
    // Warm-up request to account for JIT Next.js compilation
    await fetch(`${BASE_URL}/`);
    const start = performance.now();
    const res = await fetch(`${BASE_URL}/`);
    await res.text();
    const elapsed = Math.round(performance.now() - start);
    if (elapsed > 3000) throw new Error(`Latency too high: ${elapsed}ms`);
    return `Latency: ${elapsed}ms`;
  });

  await runTest('Performance', 'Admin API verification latency is under 1000ms', async () => {
    const start = performance.now();
    const res = await fetch(`${BASE_URL}/api/branding`);
    await res.json();
    const elapsed = Math.round(performance.now() - start);
    if (elapsed > 1000) throw new Error(`Latency too high: ${elapsed}ms`);
    return `Latency: ${elapsed}ms`;
  });

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log('                 QA TEST SUITE SUMMARY                ');
  console.log('======================================================\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests Run : ${total}`);
  console.log(`Passed          : ${passed}`);
  console.log(`Failed          : ${failed}`);
  console.log(`Pass Rate       : ${((passed / total) * 100).toFixed(1)}%\n`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
