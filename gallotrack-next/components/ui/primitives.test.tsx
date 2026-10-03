import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from './Badge';
import { Breadcrumbs } from './Breadcrumbs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { SearchInput } from './SearchInput';
import { Skeleton } from './Skeleton';
import { SkipLink } from './SkipLink';
import { Spinner } from './Spinner';
import { StatCard } from './StatCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';
import { Tooltip } from './Tooltip';

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge>Layer flock</Badge>);
    expect(screen.getByText('Layer flock')).toBeInTheDocument();
  });

  it.each([
    ['success', 'text-success'],
    ['warning', 'text-warning'],
    ['danger', 'text-danger'],
    ['info', 'text-info'],
    ['neutral', 'text-muted-foreground'],
  ] as const)('applies the %s token colour', (variant, expected) => {
    render(<Badge variant={variant}>x</Badge>);
    expect(screen.getByText('x')).toHaveClass(expected);
  });

  it('hides the decorative status dot from assistive tech', () => {
    const { container } = render(<Badge dot>Active</Badge>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});

describe('Breadcrumbs', () => {
  const items = [
    { label: 'Flocks', href: '/flocks' },
    { label: 'Batch 12' },
  ];

  it('renders a labelled breadcrumb landmark', () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('links every step but the last', () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByRole('link', { name: 'Flocks' })).toHaveAttribute('href', '/flocks');
    expect(screen.getByText('Batch 12')).not.toHaveAttribute('href');
  });

  it('marks the final step as the current page', () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByText('Batch 12')).toHaveAttribute('aria-current', 'page');
  });

  it('renders nothing for an empty trail', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Card', () => {
  it('composes header, title, description, content and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Egg production</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>chart</CardContent>
        <CardFooter>footer</CardFooter>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Egg production' })).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('chart')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(<EmptyState title="No flocks yet" description="Add one to get started" action={<button>Add</button>} />);
    expect(screen.getByText('No flocks yet')).toBeInTheDocument();
    expect(screen.getByText('Add one to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('uses a compact pad when asked', () => {
    const { container } = render(<EmptyState title="Nothing" compact />);
    expect(container.firstElementChild?.className).toContain('py-8');
  });
});

describe('PageHeader', () => {
  it('renders exactly one top-level heading', () => {
    render(<PageHeader title="Dashboard" description="Overview" />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });

  it('renders the actions slot', () => {
    render(<PageHeader title="Dashboard" actions={<button>Export</button>} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  it('is a labelled searchbox', () => {
    render(<SearchInput aria-label="Search flocks" value="" onChange={() => {}} />);
    expect(screen.getByRole('searchbox', { name: 'Search flocks' })).toBeInTheDocument();
  });

  it('shows the clear button only when there is a value and a handler', () => {
    const { rerender } = render(<SearchInput aria-label="Search" value="" onChange={() => {}} onClear={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    rerender(<SearchInput aria-label="Search" value="broiler" onChange={() => {}} onClear={() => {}} />);
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
  });

  it('invokes onClear', () => {
    const onClear = vi.fn();
    render(<SearchInput aria-label="Search" value="broiler" onChange={() => {}} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('Skeleton', () => {
  it('is hidden from assistive tech', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkipLink', () => {
  it('points at the main content region by default', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
  });

  it('accepts a custom target and label', () => {
    render(<SkipLink href="#results">Skip to results</SkipLink>);
    expect(screen.getByRole('link', { name: 'Skip to results' })).toHaveAttribute('href', '#results');
  });
});

describe('Spinner', () => {
  it('is decorative by default', () => {
    const { container } = render(<Spinner />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('becomes a labelled status region when given a label', () => {
    render(<Spinner label="Loading flocks" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading flocks');
  });
});

describe('StatCard', () => {
  it('renders label, value and hint', () => {
    render(<StatCard label="Eggs today" value={1284} hint="Across 3 flocks" />);
    expect(screen.getByText('Eggs today')).toBeInTheDocument();
    expect(screen.getByText('1284')).toBeInTheDocument();
    expect(screen.getByText('Across 3 flocks')).toBeInTheDocument();
  });

  it.each([
    ['positive', 'text-success'],
    ['negative', 'text-danger'],
    ['neutral', 'text-muted-foreground'],
  ] as const)('colours a %s delta with tokens', (tone, expected) => {
    render(<StatCard label="Eggs" value={10} delta={{ value: '+4%', tone }} />);
    expect(screen.getByText('+4%')).toHaveClass(expected);
  });

  it('defaults the delta tone to neutral', () => {
    render(<StatCard label="Eggs" value={10} delta={{ value: '+4%' }} />);
    expect(screen.getByText('+4%')).toHaveClass('text-muted-foreground');
  });
});

describe('Table', () => {
  it('scopes header cells to their column', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Batch 12</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole('columnheader', { name: 'Flock' })).toHaveAttribute('scope', 'col');
    expect(screen.getByRole('cell', { name: 'Batch 12' })).toBeInTheDocument();
  });
});

describe('Tooltip', () => {
  it('is hidden until hover and wired through aria-describedby', () => {
    render(
      <Tooltip content="Lays eggs daily">
        <button type="button">Layer</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Layer' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');

    fireEvent.mouseEnter(trigger.parentElement as Element);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Lays eggs daily');
    expect(trigger).toHaveAttribute('aria-describedby');
  });

  it('hides again on mouse leave', () => {
    render(
      <Tooltip content="Lays eggs daily">
        <button type="button">Layer</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Layer' });
    fireEvent.mouseEnter(trigger.parentElement as Element);
    fireEvent.mouseLeave(trigger.parentElement as Element);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides on Escape', () => {
    render(
      <Tooltip content="Lays eggs daily">
        <button type="button">Layer</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Layer' });
    const wrapper = trigger.parentElement as Element;
    fireEvent.mouseEnter(wrapper);
    fireEvent.keyDown(wrapper, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
