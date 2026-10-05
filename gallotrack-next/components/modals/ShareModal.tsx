'use client';
import React, { useEffect, useState } from 'react';
import { Share2, Copy, Check, Link2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useUI } from '@/lib/contexts/ui-context';
import { createShareLink, findShareLink, revokeShareLink } from '@/lib/services/media-service';
import { toastMessage } from '@/lib/toast-bus';

type ShareTarget = { type: 'match' | 'fowl'; id: number; label: string };

export default function ShareModal() {
  const ui = useUI();
  const { shareTarget, setShareTarget } = ui;
  if (!shareTarget) return null;
  return (
    <ShareInner
      key={`${shareTarget.type}-${shareTarget.id}`}
      target={shareTarget}
      onClose={() => setShareTarget(null)}
    />
  );
}

function ShareInner({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [linkId, setLinkId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    findShareLink(target.type, target.id).then((existing) => {
      if (cancelled || !existing) return;
      setLinkId(existing.id);
      setToken(existing.token);
    });
    return () => { cancelled = true; };
  }, [target.type, target.id]);

  const url = token ? `${window.location.origin}/share/${token}` : '';

  const handleCreate = async () => {
    setLoading(true);
    const result = await createShareLink(target.type, target.id);
    if (result.error || !result.token) {
      toastMessage(result.error || 'Failed to create share link.', 'error');
    } else {
      setToken(result.token);
      const refreshed = await findShareLink(target.type, target.id);
      setLinkId(refreshed?.id ?? null);
      toastMessage('View-only share link created.', 'success');
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastMessage('Could not copy link manually.', 'warning');
    }
  };

  const handleRevoke = async () => {
    if (linkId === null) return;
    setLoading(true);
    const result = await revokeShareLink(linkId);
    if (result.error) {
      toastMessage(result.error, 'error');
    } else {
      setToken(null);
      setLinkId(null);
      toastMessage('Share link revoked. Anyone holding the link loses access.', 'success');
    }
    setLoading(false);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Share ${target.type === 'match' ? 'Match Record' : 'Chicken Profile'}`}
      description={target.label}
      icon={<Share2 className="w-5 h-5" />}
      iconClassName="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-success dark:text-emerald-400"
      className="max-w-md"
    >
      <p className="text-sm text-muted-foreground leading-relaxed">
        Anyone with this link can view the record — they cannot edit, and they do not get an account
        in your farm.
      </p>

      {token ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-input-border bg-slate-50 dark:bg-muted/50 px-3 py-2.5">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono font-bold text-foreground break-all">{url}</span>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 bg-success hover:bg-success/90 text-white font-semibold px-4 py-2.5 rounded-sm text-sm transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-card-foreground border border-border font-semibold px-4 py-2.5 rounded-sm text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Revoke
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-success hover:bg-success/90 text-white font-semibold px-4 py-3 rounded-sm text-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Create View-Only Link
        </button>
      )}
    </Modal>
  );
}
