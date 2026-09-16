import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/verify-admin';
import { logAdminAction } from '@/lib/api/audit-log';

export async function POST(request: NextRequest) {
  const result = await verifyAdmin(request);
  if (!result.ok) return result.response;

  try {
    const body = await request.json();
    const { target_email } = body;

    if (!target_email || typeof target_email !== 'string') {
      return NextResponse.json({ error: 'Missing target_email' }, { status: 400 });
    }

    const { data: targetUser, error: lookupError } = await result.adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (lookupError) {
      return NextResponse.json({ error: `Lookup failed: ${lookupError.message}` }, { status: 500 });
    }

    const target = targetUser.users?.find((u) => u.email === target_email);
    if (!target) {
      return NextResponse.json({ error: `No user found with email: ${target_email}` }, { status: 404 });
    }

    if (target.id === result.userId) {
      return NextResponse.json({ error: 'Cannot transfer to the same account' }, { status: 400 });
    }

    const { count: fowlsTransferred, error: fowlError } = await result.adminClient
      .from('fowl')
      .update({ user_id: target.id }, { count: 'exact' })
      .eq('user_id', result.userId);

    if (fowlError) {
      return NextResponse.json({ error: `Fowl transfer failed: ${fowlError.message}` }, { status: 500 });
    }

    const { count: matchesTransferred, error: matchError } = await result.adminClient
      .from('match')
      .update({ user_id: target.id }, { count: 'exact' })
      .eq('user_id', result.userId);

    if (matchError) {
      return NextResponse.json({ error: `Match transfer failed: ${matchError.message}` }, { status: 500 });
    }

    await logAdminAction(result.adminClient, {
      adminId: result.userId,
      action: 'transfer_data',
      targetType: 'user',
      targetId: target.id,
      details: {
        target_email,
        fowls_transferred: fowlsTransferred || 0,
        matches_transferred: matchesTransferred || 0,
      },
    });

    return NextResponse.json({
      success: true,
      fowls_transferred: fowlsTransferred || 0,
      matches_transferred: matchesTransferred || 0,
      target_email,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
