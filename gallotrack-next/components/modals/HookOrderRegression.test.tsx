import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import FowlDetailsModal from './FowlDetailsModal';
import EditFowlModal from './EditFowlModal';
import BloodlineBreakdown from '@/components/BloodlineBreakdown';
import PedigreeTree, { CompactNodeCard } from '@/components/PedigreeTree';
import ParentSelector from './ParentSelector';
import { UIProvider } from '@/lib/contexts/ui-context';
import { FowlProviderWrapper } from '@/lib/contexts/fowl-context';
import type { FowlRecord } from '@/lib/types';
import type { BloodlineComposition } from '@/lib/bloodline-composition';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/profiling',
  useSearchParams: () => new URLSearchParams('tab=males'),
}));

vi.mock('@/lib/services/fowl-service', () => ({
  fetchStatusHistory: vi.fn().mockResolvedValue([]),
  fetchFowls: vi.fn().mockResolvedValue([]),
  fetchMatchHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'mock-user' } }),
}));

vi.mock('@/lib/context', () => ({
  useGaloTrack: () => ({
    generateBloodlineReport: () => ({
      strainType: 'purebred',
      primaryStrain: 'Sweater',
      purityPct: 100,
      hybridVigor: { label: 'A', score: 95 },
      relatedness: null,
      crossPattern: null,
    }),
  }),
}));

const mockBird1: FowlRecord = {
  id: 101,
  name: 'Champion Stag',
  breed: 'Sweater',
  gender: 'Rooster',
  status: 'Active',
  sire: 'Sire King',
  dam: 'Dam Queen',
  birthdate: '2025-01-15',
  bird_code: '1A',
  wing_band: 'WB-101',
  bloodline_pct: 100,
  breeding_role: 'none',
} as FowlRecord;

const mockBird2: FowlRecord = {
  id: 102,
  name: 'Lightning Hen',
  breed: 'Hatch',
  gender: 'Hen',
  status: 'Active',
  sire: 'Thunder Sire',
  dam: 'Storm Dam',
  birthdate: '2025-02-20',
  bird_code: '2B',
  wing_band: 'WB-102',
  bloodline_pct: 100,
  breeding_role: 'material',
} as FowlRecord;

const mockFowls: FowlRecord[] = [mockBird1, mockBird2];

function TestWrapper({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('dark');
  return (
    <UIProvider theme={theme} setTheme={setTheme}>
      <FowlProviderWrapper>{children}</FowlProviderWrapper>
    </UIProvider>
  );
}

describe('Hook Order Regression Tests (React Error 310 Prevention)', () => {
  it('FowlDetailsModal survives null -> bird -> null -> another bird transitions without hook-order error', () => {
    function TestContainer() {
      const [selected, setSelected] = useState<FowlRecord | null>(null);
      return (
        <div>
          <button data-testid="select-none" onClick={() => setSelected(null)}>
            Clear
          </button>
          <button data-testid="select-bird1" onClick={() => setSelected(mockBird1)}>
            Bird 1
          </button>
          <button data-testid="select-bird2" onClick={() => setSelected(mockBird2)}>
            Bird 2
          </button>
          <FowlDetailsModal
            selectedFowlForDetails={selected}
            setSelectedFowlForDetails={setSelected}
            matchHistory={[]}
            fowls={mockFowls}
            getAgeParts={() => null}
            getAgeLabel={() => '1y'}
            getAgeExact={() => '1y 2m'}
            getAgeMetrics={() => '14m'}
            generationOf={() => 1}
            generationInfo={() => ({ short: 'F1', label: 'First Gen', desc: '', tone: '' })}
            bloodlineOf={() => 100}
            getSiblingRelations={() => []}
            getMilestoneInfo={() => null}
            getArchiveBadgeStyle={() => ({ bg: '', text: '', border: '', label: '' })}
            pairingAnalytics={
              { all: new Map(), activePairs: 0, topPairs: [], underperformingPairs: [] } as any
            }
          />
        </div>
      );
    }

    render(
      <TestWrapper>
        <TestContainer />
      </TestWrapper>,
    );

    // Initial state: selectedFowlForDetails is null
    expect(screen.queryByText(/Champion Stag/i)).not.toBeInTheDocument();

    // Transition 1: null -> bird1
    act(() => {
      screen.getByTestId('select-bird1').click();
    });
    expect(screen.getByText(/Champion Stag/i)).toBeInTheDocument();

    // Transition 2: bird1 -> null
    act(() => {
      screen.getByTestId('select-none').click();
    });
    expect(screen.queryByText(/Champion Stag/i)).not.toBeInTheDocument();

    // Transition 3: null -> bird2
    act(() => {
      screen.getByTestId('select-bird2').click();
    });
    expect(screen.getByText(/Lightning Hen/i)).toBeInTheDocument();
  });

  it('EditFowlModal survives closed (null) -> open (bird) -> closed (null) transitions without hook-order error', () => {
    function TestContainer() {
      const [editing, setEditing] = useState<FowlRecord | null>(null);
      return (
        <div>
          <button data-testid="open-edit" onClick={() => setEditing(mockBird1)}>
            Open
          </button>
          <button data-testid="close-edit" onClick={() => setEditing(null)}>
            Close
          </button>
          <EditFowlModal
            editingFowl={editing}
            setEditingFowl={setEditing}
            fowls={mockFowls}
            editName={editing?.name || ''}
            setEditName={vi.fn()}
            editBreed={editing?.breed || ''}
            setEditBreed={vi.fn()}
            editGender={editing?.gender || 'Rooster'}
            setEditGender={vi.fn()}
            editGrowthStage="Stag"
            setEditGrowthStage={vi.fn()}
            editSire=""
            setEditSire={vi.fn()}
            editDam=""
            setEditDam={vi.fn()}
            editBirthdate="2025-01-15"
            setEditBirthdate={vi.fn()}
            editAge="12"
            setEditAge={vi.fn()}
            editWeight="2.0"
            setEditWeight={vi.fn()}
            editHeight="30"
            setEditHeight={vi.fn()}
            editBirdCode="1A"
            setEditBirdCode={vi.fn()}
            editWingBand="WB-101"
            setEditWingBand={vi.fn()}
            editColorCategory=""
            setEditColorCategory={vi.fn()}
            editColor=""
            setEditColor={vi.fn()}
            editBehaviorTrait=""
            setEditBehaviorTrait={vi.fn()}
            editEyeVariant=""
            setEditEyeVariant={vi.fn()}
            editLegColor=""
            setEditLegColor={vi.fn()}
            setEditSirePct={vi.fn()}
            setEditDamPct={vi.fn()}
            handleUpdateFowl={vi.fn()}
            loading={false}
            customStrainNames={new Set()}
            deleteCustomStrain={vi.fn().mockResolvedValue(undefined)}
            customLegColorNames={new Set()}
            deleteCustomLegColor={vi.fn().mockResolvedValue(undefined)}
            handleEditBirthdateChange={vi.fn()}
            handleEditAgeChange={vi.fn()}
            autoComputeGrowthStage={vi.fn().mockReturnValue('Stag')}
            getAgeParts={() => null}
            getAgeLabel={() => '1y'}
            getAgeMetrics={() => '12m'}
            generationOf={() => 1}
            generationPurity={() => 100}
            availableStrains={[]}
            availableLegColors={[]}
          />
        </div>
      );
    }

    render(
      <TestWrapper>
        <TestContainer />
      </TestWrapper>,
    );

    // Initial state: editingFowl is null
    expect(screen.queryByText(/Edit Node Registry/i)).not.toBeInTheDocument();

    // Transition 1: null -> bird1 (open)
    act(() => {
      screen.getByTestId('open-edit').click();
    });
    expect(screen.getByText(/Edit Node Registry/i)).toBeInTheDocument();

    // Transition 2: bird1 -> null (closed)
    act(() => {
      screen.getByTestId('close-edit').click();
    });
    expect(screen.queryByText(/Edit Node Registry/i)).not.toBeInTheDocument();
  });

  it('BloodlineBreakdown survives unresolved (null) -> resolved transitions without hook-order error', () => {
    const validComp: BloodlineComposition = {
      Sweater: 100,
    };

    function TestContainer() {
      const [comp, setComp] = useState<BloodlineComposition | null>(null);
      return (
        <div>
          <button data-testid="resolve-comp" onClick={() => setComp(validComp)}>
            Resolve
          </button>
          <button data-testid="unresolve-comp" onClick={() => setComp(null)}>
            Unresolve
          </button>
          <BloodlineBreakdown composition={comp} fowl={mockBird1} fowls={mockFowls} />
        </div>
      );
    }

    render(<TestContainer />);

    // Initial: composition is null (unresolved)
    expect(screen.queryByText(/Breakdown/i)).not.toBeInTheDocument();

    // Transition: null -> resolved
    act(() => {
      screen.getByTestId('resolve-comp').click();
    });
    expect(screen.getByText(/Breakdown/i)).toBeInTheDocument();

    // Transition: resolved -> null
    act(() => {
      screen.getByTestId('unresolve-comp').click();
    });
    expect(screen.queryByText(/Breakdown/i)).not.toBeInTheDocument();
  });

  it('PedigreeTree CompactNodeCard survives toggling isMerged without hook-order error', () => {
    function TestContainer() {
      const [isMerged, setIsMerged] = useState(false);
      const node = isMerged
        ? {
            id: 'g1-merged-1',
            gen: 1,
            startRow: 1,
            rowSpan: 2,
            fowl: null,
            name: 'Foundation stock',
            isMerged: true,
            role: 'unknown' as const,
          }
        : {
            id: 'g0-subject-1',
            gen: 0,
            startRow: 1,
            rowSpan: 2,
            fowl: mockBird1,
            name: mockBird1.name,
            isMerged: false,
            role: 'subject' as const,
          };

      return (
        <div>
          <button data-testid="toggle-merged" onClick={() => setIsMerged((v) => !v)}>
            Toggle
          </button>
          <CompactNodeCard
            node={node}
            fowls={mockFowls}
            codes={new Map()}
            canRegisterAncestor={false}
            onRecenter={vi.fn()}
            onViewProfile={vi.fn()}
            onRegisterMerged={vi.fn()}
            onRegisterSingle={vi.fn()}
          />
        </div>
      );
    }

    render(
      <TestWrapper>
        <TestContainer />
      </TestWrapper>,
    );

    // Initial state: not merged -> shows bird name
    expect(screen.getByText('Champion Stag')).toBeInTheDocument();
    expect(screen.queryByText('Foundation stock')).not.toBeInTheDocument();

    // Toggle to merged (Foundation stock)
    act(() => {
      screen.getByTestId('toggle-merged').click();
    });
    expect(screen.getByText('Foundation stock')).toBeInTheDocument();
    expect(screen.queryByText('Champion Stag')).not.toBeInTheDocument();

    // Toggle back to not merged (bird)
    act(() => {
      screen.getByTestId('toggle-merged').click();
    });
    expect(screen.getByText('Champion Stag')).toBeInTheDocument();
    expect(screen.queryByText('Foundation stock')).not.toBeInTheDocument();
  });

  it('ParentSelector mounts safely both inside and outside FowlProvider without throwing', () => {
    // 1. Outside provider
    const { unmount } = render(
      <ParentSelector value="" onChange={vi.fn()} fowls={mockFowls} preferredGender="Male" />,
    );
    expect(screen.getByPlaceholderText(/Type a name or pick from registry/i)).toBeInTheDocument();
    unmount();

    // 2. Inside provider
    render(
      <TestWrapper>
        <ParentSelector
          value="Champion Stag"
          onChange={vi.fn()}
          fowls={mockFowls}
          preferredGender="Male"
        />
      </TestWrapper>,
    );
    expect(screen.getByDisplayValue('Champion Stag')).toBeInTheDocument();
  });
});
