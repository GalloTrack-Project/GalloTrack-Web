import { describe, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { expectNoSeriousA11yViolations } from './axe';
import { Badge } from './Badge';
import { Breadcrumbs } from './Breadcrumbs';
import { Button } from './Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { EmptyState } from './EmptyState';
import { FormField } from './FormField';
import { Input } from './Input';
import { Modal } from './Modal';
import { PageHeader } from './PageHeader';
import { Pagination } from './Pagination';
import { SearchInput } from './SearchInput';
import { SkipLink } from './SkipLink';
import { StatCard } from './StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Tabs } from './Tabs';
import { ToastProvider, useToast } from './Toast';
import { Tooltip } from './Tooltip';

/**
 * Gate 6 (Std §08) — the automated axe pass over the primitives.
 * Each case renders a primitive in a representative state, including the
 * interactive states that are easiest to get wrong (open dialog, live toast,
 * expanded tooltip, associated form field).
 */
describe('axe: primitives have no serious or critical violations', () => {
  it('Button — all variants', async () => {
    const { container } = render(
      <div>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="link">Link</Button>
        <Button size="icon" aria-label="Icon only" />
        <Button loading>Loading</Button>
      </div>,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('FormField — associated label, description and error', async () => {
    const { container } = render(
      <FormField label="Flock name" id="flock" description="Shown on reports" required>
        {(field) => <Input {...field} />}
      </FormField>,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('FormField — error state', async () => {
    const { container } = render(
      <FormField label="Flock name" id="flock" error="Required">
        {(field) => <Input {...field} />}
      </FormField>,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('SearchInput', async () => {
    const { container } = render(
      <SearchInput
        aria-label="Search flocks"
        value="broiler"
        onChange={() => {}}
        onClear={() => {}}
      />,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('Modal — open, with title, description and footer', async () => {
    const { container } = render(
      <Modal
        open
        onClose={() => {}}
        title="Delete flock"
        description="This cannot be undone"
        footer={<Button variant="danger">Confirm</Button>}
      >
        <p>Body copy</p>
      </Modal>,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('Toast — polite and assertive', async () => {
    function Consumer() {
      const { toast } = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            toast({ title: 'Flock saved' });
            toast({ title: 'Save failed', variant: 'danger' });
          }}
        >
          fire
        </button>
      );
    }
    const { container } = render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'fire' }));
    await expectNoSeriousA11yViolations(container);
  });

  it('Tabs', async () => {
    const { container } = render(
      <Tabs
        aria-label="Flock sections"
        items={[
          { value: 'overview', label: 'Overview', content: <p>Overview panel</p> },
          { value: 'eggs', label: 'Eggs', content: <p>Eggs panel</p> },
        ]}
      />,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('Pagination', async () => {
    const { container } = render(<Pagination page={10} pageCount={20} onPageChange={() => {}} />);
    await expectNoSeriousA11yViolations(container);
  });

  it('Table — with column scopes', async () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flock</TableHead>
            <TableHead>Wins</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Batch 12</TableCell>
            <TableCell>4</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('Tooltip — expanded', async () => {
    const { container } = render(
      <Tooltip content="Lays eggs daily">
        <button type="button">Layer</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Layer' }).parentElement as Element);
    await expectNoSeriousA11yViolations(container);
  });

  it('surfaces — Card, StatCard, Badge, EmptyState, PageHeader', async () => {
    const { container } = render(
      <div>
        <PageHeader title="Dashboard" description="Overview" />
        <Card>
          <CardHeader>
            <CardTitle>Egg production</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="success" dot>
              Healthy
            </Badge>
          </CardContent>
        </Card>
        <StatCard label="Eggs today" value={1284} delta={{ value: '+4%', tone: 'positive' }} />
        <EmptyState title="No flocks yet" description="Add one to get started" />
      </div>,
    );
    await expectNoSeriousA11yViolations(container);
  });

  it('navigation — Breadcrumbs and SkipLink', async () => {
    const { container } = render(
      <div>
        <SkipLink />
        <Breadcrumbs items={[{ label: 'Flocks', href: '/flocks' }, { label: 'Batch 12' }]} />
      </div>,
    );
    await expectNoSeriousA11yViolations(container);
  });
});
