/**
 * @deprecated The Marketplace API has been deprecated and is no longer supported.
 * All endpoints return HTTP 410 Gone.
 */
import { NextResponse } from 'next/server';

const DEPRECATED = NextResponse.json(
  { error: 'Marketplace has been deprecated and is no longer available.' },
  { status: 410 },
);

export async function GET() { return DEPRECATED; }
export async function POST() { return DEPRECATED; }
