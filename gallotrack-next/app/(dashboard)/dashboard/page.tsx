'use client';
import { DashboardPageWrapper } from '../wrappers';
import AdminDashboardPage from './admin-page';
import { useAuth } from '@/lib/contexts/auth-context';

export default function DashboardRoute() {
  const auth = useAuth();

  if (auth.isAdmin) {
    return <AdminDashboardPage />;
  }

  return <DashboardPageWrapper />;
}
