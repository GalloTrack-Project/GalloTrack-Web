'use client';

import { useState, type ReactNode } from 'react';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Skeleton,
  SkipLink,
  Spinner,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tooltip,
  useToast,
} from '@/components/ui';

/**
 * The living spec (PR 6). Every token and primitive on one page, rendered by
 * the components themselves — so this cannot drift from the implementation the
 * way a static document can. If a swatch or a control here looks wrong, it is
 * wrong in the app too.
 */

const SURFACE_TOKENS = [
  'background',
  'card',
  'muted',
  'muted-foreground',
  'border',
  'foreground',
] as const;
const STATUS_TOKENS = [
  { token: 'primary', note: 'fills, active nav' },
  { token: 'success', note: 'pass, win' },
  { token: 'warning', note: 'caution, pending' },
  { token: 'danger', note: 'delete, loss, error' },
  { token: 'info', note: 'callouts, tips' },
] as const;
const CATEGORICAL_TOKENS = [
  { token: 'teal', note: 'survivability' },
  { token: 'pink', note: 'dam / female' },
  { token: 'violet', note: 'bloodline, style' },
  { token: 'indigo', note: 'logged, activity' },
] as const;
const TAG_TOKENS = ['ring', 'input-border', 'accent'] as const;

const TYPE_SCALE = [
  { cls: 'text-4xl font-semibold', label: '4xl / 36 — marketing only' },
  { cls: 'text-3xl font-semibold', label: '3xl / 30 — metric figure' },
  { cls: 'text-2xl font-semibold', label: '2xl / 24 — page title' },
  { cls: 'text-lg font-semibold', label: 'lg / 18 — section heading' },
  { cls: 'text-base', label: 'base / 16 — emphasis body' },
  { cls: 'text-sm', label: 'sm / 14 — body (default)' },
  { cls: 'text-sm', label: 'xs / 12 — minimum, metadata' },
];

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="border-border border-b pb-2">
        <h2 className="text-foreground text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Swatch({ token, note }: { token: string; note?: string }) {
  return (
    <div className="border-border bg-card flex items-center gap-3 rounded-sm border p-3">
      <span
        aria-hidden="true"
        className="border-border h-9 w-9 shrink-0 rounded-sm border"
        style={{ backgroundColor: `var(--${token})` }}
      />
      <div className="min-w-0">
        <p className="text-foreground truncate font-mono text-sm font-semibold">--{token}</p>
        {note ? <p className="text-muted-foreground truncate text-sm">{note}</p> : null}
      </div>
    </div>
  );
}

export default function DesignKitPage() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(3);
  const [name, setName] = useState('');

  return (
    <>
      <SkipLink />
      <div className="bg-background text-foreground min-h-screen px-4 py-10 sm:px-8">
        <div id="main-content" className="mx-auto max-w-5xl space-y-12">
          <PageHeader
            title="Design kit"
            description="The living spec. Every token and primitive below is rendered by the real component, so this page cannot drift from the app."
            actions={
              <Button
                onClick={() => toast({ title: 'Toast fired', description: 'From the design kit' })}
              >
                Fire a toast
              </Button>
            }
          />

          <Section
            title="Colour — surfaces"
            hint="Theme-aware. Flip the theme and every swatch below re-resolves."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {SURFACE_TOKENS.map((token) => (
                <Swatch key={token} token={token} />
              ))}
            </div>
          </Section>

          <Section
            title="Colour — status and categorical"
            hint="Each resolves dark in light mode and light in dark mode, and every one clears AAA (7:1) in both themes."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {[...STATUS_TOKENS, ...CATEGORICAL_TOKENS].map(({ token, note }) => (
                <Swatch key={token} token={token} note={note} />
              ))}
              {TAG_TOKENS.map((token) => (
                <Swatch key={token} token={token} />
              ))}
            </div>
          </Section>

          <Section title="Typography" hint="14px body, 12px absolute floor. Nothing smaller ships.">
            <div className="border-border bg-card space-y-2 rounded-md border p-5">
              {TYPE_SCALE.map((row) => (
                <p key={row.cls} className={row.cls}>
                  {row.label}
                </p>
              ))}
            </div>
          </Section>

          <Section
            title="Buttons"
            hint="Five variants, four sizes. sm is for dense table rows only."
          >
            <div className="border-border bg-card space-y-4 rounded-md border p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="link">Link</Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Settings">
                  <SettingsGlyph />
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Badges" hint="Tinted, token-driven, with an optional status dot.">
            <div className="border-border bg-card flex flex-wrap items-center gap-3 rounded-md border p-5">
              <Badge>Neutral</Badge>
              <Badge variant="success" dot>
                Success
              </Badge>
              <Badge variant="warning" dot>
                Warning
              </Badge>
              <Badge variant="danger" dot>
                Danger
              </Badge>
              <Badge variant="info" dot>
                Info
              </Badge>
            </div>
          </Section>

          <Section
            title="Form field"
            hint="Label, description and error bound to the control — the fix for 95 unassociated labels."
          >
            <div className="border-border bg-card grid gap-5 rounded-md border p-5 sm:grid-cols-2">
              <FormField label="Flock name" id="kit-name" description="Shown on reports" required>
                {(field) => (
                  <Input
                    {...field}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Batch 12"
                  />
                )}
              </FormField>
              <FormField label="Chicken code" id="kit-code" error="That code is already in use">
                {(field) => <Input {...field} defaultValue="GH-0042" />}
              </FormField>
              <FormField label="Search" id="kit-search">
                {(field) => (
                  <SearchInput
                    {...field}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onClear={() => setSearch('')}
                    aria-label="Search"
                  />
                )}
              </FormField>
              <div className="flex items-center gap-3 self-end">
                <Spinner label="Loading" />
                <span className="text-muted-foreground text-sm">Inline spinner</span>
              </div>
            </div>
          </Section>

          <Section title="Surfaces" hint="Card, StatCard, EmptyState and Skeleton.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Egg production</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton />
                  <Skeleton className="w-2/3" />
                </CardContent>
              </Card>
              <StatCard
                label="Eggs today"
                value={1284}
                hint="Across 3 flocks"
                delta={{ value: '+4% vs yesterday', tone: 'positive' }}
              />
              <EmptyState
                className="sm:col-span-2"
                title="No flocks yet"
                description="Add your first flock to start tracking lineage and performance."
                action={<Button>Add flock</Button>}
              />
            </div>
          </Section>

          <Section title="Navigation" hint="Tabs, pagination, breadcrumbs and a tooltip.">
            <div className="border-border bg-card space-y-6 rounded-md border p-5">
              <Breadcrumbs
                items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Design kit' }]}
              />
              <Tabs
                aria-label="Design kit sections"
                items={[
                  {
                    value: 'tokens',
                    label: 'Tokens',
                    content: <p className="text-muted-foreground text-sm">Tokens panel</p>,
                  },
                  {
                    value: 'primitives',
                    label: 'Primitives',
                    content: <p className="text-muted-foreground text-sm">Primitives panel</p>,
                  },
                  {
                    value: 'rules',
                    label: 'Rules',
                    content: <p className="text-muted-foreground text-sm">Rules panel</p>,
                  },
                ]}
              />
              <Pagination page={page} pageCount={20} onPageChange={setPage} />
              <p className="text-muted-foreground text-sm">
                Hover or focus the{' '}
                <Tooltip content="Tooltips show on hover and on keyboard focus">
                  <button
                    type="button"
                    className="text-info font-medium underline underline-offset-4"
                  >
                    underlined term
                  </button>
                </Tooltip>{' '}
                to see a tooltip.
              </p>
            </div>
          </Section>

          <Section title="Data table" hint="Scoped column headers, hover rows, token borders.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sire × Dam</TableHead>
                  <TableHead className="text-center">Fights</TableHead>
                  <TableHead className="text-center">Win rate</TableHead>
                  <TableHead className="text-center">Verdict</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    cross: 'True Hatch × Mountain Rose',
                    fights: 1,
                    rate: 100,
                    tone: 'success' as const,
                    verdict: 'Solid pairing',
                  },
                  {
                    cross: 'Titan Sweater × Crimson Belle',
                    fights: 1,
                    rate: 100,
                    tone: 'success' as const,
                    verdict: 'Solid pairing',
                  },
                  {
                    cross: 'True Hatch × Silver Princess',
                    fights: 2,
                    rate: 50,
                    tone: 'warning' as const,
                    verdict: 'Inconclusive',
                  },
                ].map((row) => (
                  <TableRow key={row.cross}>
                    <TableCell className="text-card-foreground font-medium">{row.cross}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.fights}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.tone} className="tabular-nums">
                        {row.rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{row.verdict}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section title="Dialog" hint="Role, modal flag, focus trap, focus restore and Escape.">
            <div className="border-border bg-card rounded-md border p-5">
              <Button onClick={() => setModalOpen(true)}>Open dialog</Button>
            </div>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Archive flock"
              description="This moves the flock to the archive. You can restore it later."
              footer={
                <>
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setModalOpen(false);
                      toast({ title: 'Flock archived', variant: 'warning' });
                    }}
                  >
                    Archive
                  </Button>
                </>
              }
            >
              <p className="text-muted-foreground text-sm">
                Tab stays inside this dialog, Escape closes it, and focus returns to the button you
                came from.
              </p>
            </Modal>
          </Section>

          <footer className="border-border border-t pt-6">
            <p className="text-muted-foreground text-sm">
              GalloTrack design kit — generated from{' '}
              <code className="font-mono">components/ui</code> and{' '}
              <code className="font-mono">app/globals.css</code>. Enforced by{' '}
              <code className="font-mono">npm run gate</code>.
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

function SettingsGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    </svg>
  );
}
