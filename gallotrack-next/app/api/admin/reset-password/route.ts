import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Simple in-memory rate limiter: max 5 requests per email per 15 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const { data: profile } = await userClient.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin' || profile?.is_active === false) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { email } = body;
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid email' }, { status: 400 });
  }

  // Sanitize email
  const sanitizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // Rate limit check
  if (!checkRateLimit(sanitizedEmail)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429 }
    );
  }

  const { error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: sanitizedEmail,
  });

  if (error) {
    const { error: resetError } = await admin.auth.admin.inviteUserByEmail(sanitizedEmail, { redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') || 'http://localhost:3000'}/auth/confirm` });
    if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
