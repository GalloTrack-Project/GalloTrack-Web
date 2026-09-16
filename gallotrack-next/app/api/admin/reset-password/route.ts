import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/verify-admin';
import { logAdminAction } from '@/lib/api/audit-log';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  const body = await request.json();
  const { email } = body;
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid email' }, { status: 400 });
  }

  const sanitizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  if (!checkRateLimit(sanitizedEmail)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    );
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: sanitizedEmail,
  });

  if (error) {
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') || 'http://localhost:3000'}/auth/confirm`;

    const { error: resetError } = await adminClient.auth.admin.inviteUserByEmail(sanitizedEmail, {
      redirectTo: redirectUrl,
    });
    if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  await logAdminAction(adminClient, {
    adminId: result.userId,
    action: 'reset_password',
    targetType: 'user',
    details: { email: sanitizedEmail },
  });

  return NextResponse.json({ success: true });
}
