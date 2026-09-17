'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminGuard } from '@/lib/admin';
import type { AdminProfileRow } from '@/lib/admin';
import { supabase } from '@/lib/registry';
import { Shield, Clock, User, FileText, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  marketplace_approved: 'Approved Listing',
  marketplace_flagged: 'Flagged Listing',
  marketplace_removed: 'Removed Listing',
  marketplace_pending: 'Pending Listing',
  reset_password: 'Password Reset',
  transfer_data: 'Data Transfer',
  user_activated: 'User Activated',
  user_deactivated: 'User Deactivated',
  user_suspended: 'User Suspended',
  user_deleted: 'User Deleted',
  user_verified: 'User Verified',
};

export default function AuditLogsPage() {
  const [adminProfile, setAdminProfile] = useState<AdminProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const profile = await adminGuard();
      if (!profile) return;
      setAdminProfile(profile);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/admin/audit-logs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);

          const adminIds = [...new Set((data.logs || []).map((l: AuditLog) => l.admin_id))];
          if (adminIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', adminIds);
            const names: Record<string, string> = {};
            (profiles || []).forEach((p: { id: string; full_name?: string; email?: string }) => {
              names[p.id] = p.full_name || p.email?.split('@')[0] || 'Admin';
            });
            setAdminNames(names);
          }
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const label = ACTION_LABELS[log.action] || log.action;
    const adminName = adminNames[log.admin_id] || '';
    return label.toLowerCase().includes(q) || adminName.toLowerCase().includes(q) || (log.target_type || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">Loading audit logs...</p>
      </div>
    );
  }

  if (!adminProfile) return null;

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-card-foreground tracking-tight leading-none">
              Audit <span className="text-amber-400">Logs</span>
            </h1>
            <p className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest uppercase mt-1">Activity Trail for Admin Actions</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
            <FileText size={14} />
            {filteredLogs.length} entries
          </div>
        </div>

        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs p-4 mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"><Search size={16} /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, admin, or target..."
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-xs bg-muted/25 focus:bg-card focus:border-amber-500 transition-all font-semibold outline-none text-card-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-card-foreground">Admin Activity</h2>
            <span className="text-[9px] font-mono text-muted-foreground font-bold uppercase tracking-wider">{filteredLogs.length} of {logs.length} records</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground font-semibold">No audit logs found.</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Admin actions will appear here once recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredLogs.map((log) => (
                <div key={log.id} className="px-4 sm:px-5 py-3.5 hover:bg-muted/25 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-card-foreground">
                          <span className="text-amber-400">{adminNames[log.admin_id] || 'Admin'}</span>
                          {' '}
                          <span className="text-muted-foreground">{ACTION_LABELS[log.action] || log.action}</span>
                        </p>
                        {log.target_type && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Target: {log.target_type}{log.target_id ? ` (${log.target_id.slice(0, 8)}...)` : ''}
                          </p>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                            {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground/60 font-mono whitespace-nowrap shrink-0">
                      {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[9px] font-mono text-muted-foreground tracking-widest uppercase">
          Audit logs are retained for security and compliance
        </p>
      </div>
    </div>
  );
}
