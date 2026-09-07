'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketplaceRoute() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profiling');
  }, [router]);
  return null;
}
