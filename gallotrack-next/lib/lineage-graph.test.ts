import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import {
  buildLineageIndex,
  buildLineageTopology,
  layoutLineageTopology,
  lineageBirdCode,
  pickDefaultRootId,
  LINEAGE_NODE_WIDTH,
} from './lineage-graph';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

const family: FowlRecord[] = [
  bird({ id: 1, name: 'Sire 1', gender: 'Rooster', bird_code: '1' }),
  bird({ id: 2, name: 'Dam A', gender: 'Hen', bird_code: 'A' }),
  bird({ id: 3, name: 'Offspring 1A1', gender: 'Rooster', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A1' }),
  bird({ id: 4, name: 'Offspring 1A2', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A2' }),
  bird({ id: 5, name: 'Offspring 1A3', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A', bird_code: '1A3' }),
  bird({ id: 6, name: 'Dam C', gender: 'Hen', bird_code: 'C' }),
  bird({ id: 7, name: 'Grandchild', gender: 'Rooster', sire: 'Offspring 1A1', dam: 'Dam C', bird_code: '1A1C1' }),
];

describe('lineage graph — index', () => {
  it('resolves parents by id link before falling back to the name snapshot', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'Registered Sire', gender: 'Rooster' }),
      bird({
        id: 2,
        name: 'Child',
        sire: 'Renamed Sire (stale snapshot)',
        sire_id: 1,
        dam: 'Missing dam',
      }),
    ];
    const index = buildLineageIndex(fowls);
    const parents = index.parentsByChild.get('2');
    expect(parents?.sire?.id).toBe(1);
    expect(parents?.dam).toBeNull();
    expect(index.childrenByParent.get('1')?.map((f) => f.name)).toEqual(['Child']);
  });

  it('sorts children by birth code naturally', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'S' }),
      bird({ id: 2, name: 'D' }),
      bird({ id: 3, name: 'A10', sire: 'S', dam: 'D', bird_code: '1A10' }),
      bird({ id: 4, name: 'A2', sire: 'S', dam: 'D', bird_code: '1A2' }),
    ];
    const index = buildLineageIndex(fowls);
    expect(index.childrenByParent.get('1')?.map((f) => f.bird_code)).toEqual(['1A2', '1A10']);
  });
});

describe('lineage graph — topology', () => {
  const index = buildLineageIndex(family);
  const base = { rootId: '1', direction: 'down' as const, maxDepth: 4, collapsed: new Set<string>() };

  it('builds generations plus the unregistered lineage partner', () => {
    const topology = buildLineageTopology(index, base);
    expect(topology).not.toBeNull();
    const gens = Object.fromEntries(topology!.nodes.map((n) => [n.fowl.name, n.generation]));
    expect(gens).toMatchObject({
      'Sire 1': 0,
      'Dam A': 0,
      'Offspring 1A1': 1,
      'Offspring 1A2': 1,
      'Offspring 1A3': 1,
      'Dam C': 1,
      Grandchild: 2,
    });
    expect(topology!.nodes.find((n) => n.isRoot)?.fowl.name).toBe('Sire 1');
  });

  it('groups shared children under the correct breeding pair only', () => {
    const topology = buildLineageTopology(index, base)!;
    const pairKeys = topology.pairs.map((p) => `${p.sireId}|||${p.damId}`);
    expect(pairKeys).toEqual(['1|||2', '3|||6']);
    const rootPair = topology.pairs.find((p) => p.key === '1|||2');
    expect(rootPair?.childIds).toEqual(['3', '4', '5']);
    const nextPair = topology.pairs.find((p) => p.key === '3|||6');
    expect(nextPair?.childIds).toEqual(['7']);
  });

  it('limits generations and reports hidden relatives', () => {
    const topology = buildLineageTopology(index, { ...base, maxDepth: 1 })!;
    expect(topology.nodes.map((n) => n.fowl.name).sort()).toEqual([
      'Dam A',
      'Offspring 1A1',
      'Offspring 1A2',
      'Offspring 1A3',
      'Sire 1',
    ]);
    const first = topology.nodes.find((n) => n.fowl.name === 'Offspring 1A1')!;
    expect(first.hiddenChildren).toBe(1);
    expect(first.hiddenDescendants).toBe(1);
  });

  it('collapsing a branch hides only that branch and counts it', () => {
    const topology = buildLineageTopology(index, {
      ...base,
      collapsed: new Set(['3']),
    })!;
    expect(topology.nodes.some((n) => n.fowl.name === 'Grandchild')).toBe(false);
    const first = topology.nodes.find((n) => n.fowl.name === 'Offspring 1A1')!;
    expect(first.hiddenChildren).toBe(1);
    expect(first.hiddenDescendants).toBe(1);
    // The other siblings and their dam are untouched.
    expect(topology.nodes.some((n) => n.fowl.name === 'Offspring 1A2')).toBe(true);
    expect(topology.nodes.some((n) => n.fowl.name === 'Dam C')).toBe(false);
  });

  it('walks ancestors upward without inventing missing parents', () => {
    const topology = buildLineageTopology(index, {
      ...base,
      rootId: '7',
      direction: 'up',
    })!;
    const gens = Object.fromEntries(topology!.nodes.map((n) => [n.fowl.name, n.generation]));
    expect(gens).toMatchObject({
      Grandchild: 0,
      'Offspring 1A1': -1,
      'Dam C': -1,
      'Sire 1': -2,
      'Dam A': -2,
    });
    expect(topology.pairs.map((p) => p.key).sort()).toEqual(['1|||2', '3|||6']);
  });

  it('supports a full pedigree (ancestors above, descendants below)', () => {
    const topology = buildLineageTopology(index, { ...base, rootId: '3', direction: 'both' })!;
    const gens = Object.fromEntries(topology.nodes.map((n) => [n.fowl.name, n.generation]));
    expect(gens).toMatchObject({
      'Sire 1': -1,
      'Dam A': -1,
      'Offspring 1A1': 0,
      'Dam C': 0,
      Grandchild: 1,
    });
  });

  it('never connects children to an unregistered parent', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'External Sire', gender: 'Rooster' }),
      bird({ id: 5, name: 'Registered Dam', gender: 'Hen' }),
      bird({ id: 2, name: 'Child', sire: 'Not In Registry', dam: 'Registered Dam' }),
      bird({ id: 3, name: 'Grandchild', sire: 'Child' }),
    ];
    const localIndex = buildLineageIndex(fowls);
    const topology = buildLineageTopology(localIndex, {
      rootId: '5',
      direction: 'down',
      maxDepth: 3,
      collapsed: new Set(),
    })!;
    expect(topology.nodes.map((n) => n.fowl.name).sort()).toEqual(['Child', 'Grandchild', 'Registered Dam']);
    expect(topology.pairs).toHaveLength(0);
    const single = topology.singles[0];
    expect(single.parentId).toBe('5');
    expect(single.childIds).toEqual(['2']);
    expect(topology.nodes.some((n) => n.fowl.name === 'Not In Registry')).toBe(false);
  });

  it('terminates on malformed cycles and never draws a backward edge', () => {
    const fowls: FowlRecord[] = [
      bird({ id: 1, name: 'A', gender: 'Rooster', sire: 'B', dam: '' }),
      bird({ id: 2, name: 'B', gender: 'Hen', sire: 'A', dam: '' }),
      bird({ id: 3, name: 'C', gender: 'Rooster', sire: 'A', dam: 'B' }),
    ];
    const localIndex = buildLineageIndex(fowls);
    const topology = buildLineageTopology(localIndex, {
      rootId: '1',
      direction: 'both',
      maxDepth: 6,
      collapsed: new Set(),
    })!;
    expect(topology.nodes.length).toBeLessThanOrEqual(fowls.length);
    const genById = new Map(topology.nodes.map((n) => [n.id, n.generation]));
    topology.pairs.forEach((pair) => {
      pair.childIds.forEach((childId) => {
        expect(genById.get(pair.sireId)).toBeLessThan(genById.get(childId)!);
        expect(genById.get(pair.damId)).toBeLessThan(genById.get(childId)!);
      });
    });
    topology.singles.forEach((single) => {
      single.childIds.forEach((childId) => {
        expect(genById.get(single.parentId)).toBeLessThan(genById.get(childId)!);
      });
    });
  });

  it('is deterministic', () => {
    const a = buildLineageTopology(index, base);
    const b = buildLineageTopology(index, base);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});

describe('lineage graph — layout', () => {
  const index = buildLineageIndex(family);
  const topology = buildLineageTopology(index, {
    rootId: '1',
    direction: 'down',
    maxDepth: 4,
    collapsed: new Set(),
  })!;
  const layout = layoutLineageTopology(topology);

  it('places a generation on one row with no overlapping cards', () => {
    const rows = new Map<number, typeof layout.nodes>();
    layout.nodes.forEach((node) => {
      const row = rows.get(node.generation) ?? [];
      row.push(node);
      rows.set(node.generation, row);
    });
    rows.forEach((row) => {
      const sorted = [...row].sort((a, b) => a.x - b.x);
      sorted.forEach((node, i) => {
        expect(node.y).toBe(sorted[0].y);
        if (i > 0) {
          expect(node.x).toBeGreaterThanOrEqual(sorted[i - 1].x + sorted[i - 1].width);
        }
      });
    });
    expect(layout.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });

  it('keeps each breeding pair adjacent', () => {
    layout.pairs.forEach((pair) => {
      const sire = layout.nodes.find((n) => n.id === pair.sireId)!;
      const dam = layout.nodes.find((n) => n.id === pair.damId)!;
      expect(Math.abs(sire.x - dam.x)).toBe(LINEAGE_NODE_WIDTH + 28);
    });
  });

  it('connects pair hubs to the children below them', () => {
    layout.pairs.forEach((pair) => {
      const children = pair.childIds.map((id) => layout.nodes.find((n) => n.id === id)!);
      const parentNode = layout.nodes.find((n) => n.id === pair.sireId)!;
      expect(pair.hubY).toBeGreaterThan(parentNode.y + parentNode.height);
      expect(pair.busY).toBeGreaterThan(pair.hubY);
      children.forEach((child, i) => {
        expect(child.y).toBeGreaterThan(pair.busY);
        expect(pair.childPaths[i]).toBe(`M ${child.centerX} ${pair.busY} V ${child.y}`);
      });
      expect(pair.hubX).toBeGreaterThanOrEqual(Math.min(pair.sireX, pair.damX));
      expect(pair.hubX).toBeLessThanOrEqual(Math.max(pair.sireX, pair.damX));
    });
  });

  it('produces generation labels and finite bounds', () => {
    expect(layout.generations.map((g) => g.label)).toEqual([
      'Generation 1',
      'Generation 2',
      'Generation 3',
    ]);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});

describe('lineage graph — wrapped layout', () => {
  const wideFamily: FowlRecord[] = [
    bird({ id: 1, name: 'Root Sire', gender: 'Rooster' }),
    bird({ id: 2, name: 'Root Dam', gender: 'Hen' }),
    ...Array.from({ length: 8 }, (_, i) =>
      bird({
        id: 10 + i,
        name: `Child ${i + 1}`,
        sire: 'Root Sire',
        dam: 'Root Dam',
        bird_code: `1A${i + 1}`,
      })
    ),
  ];
  const wideIndex = buildLineageIndex(wideFamily);
  const wideTopology = buildLineageTopology(wideIndex, {
    rootId: '1',
    direction: 'down',
    maxDepth: 2,
    collapsed: new Set(),
  })!;
  const MAX_ROW_WIDTH = 500;
  const PADDING_X = 92;
  const wrapped = layoutLineageTopology(wideTopology, {
    maxRowWidth: MAX_ROW_WIDTH,
    paddingX: PADDING_X,
  });

  it('wraps a wide generation into extra rows and keeps every card in bounds', () => {
    const children = wrapped.nodes.filter((node) => node.generation === 1);
    expect(new Set(children.map((node) => node.y)).size).toBeGreaterThan(1);

    wrapped.nodes.forEach((node) => {
      expect(node.x).toBeGreaterThanOrEqual(PADDING_X);
      expect(node.x + node.width).toBeLessThanOrEqual(wrapped.width - PADDING_X);
    });
    expect(wrapped.width).toBeLessThanOrEqual(MAX_ROW_WIDTH + PADDING_X * 2);
  });

  it('does not overlap cards that share a wrapped sub-row', () => {
    const rows = new Map<number, typeof wrapped.nodes>();
    wrapped.nodes.forEach((node) => {
      const row = rows.get(node.y) ?? [];
      row.push(node);
      rows.set(node.y, row);
    });

    rows.forEach((row) => {
      const sorted = [...row].sort((a, b) => a.x - b.x);
      sorted.forEach((node, i) => {
        if (i > 0) {
          expect(node.x).toBeGreaterThanOrEqual(
            sorted[i - 1].x + sorted[i - 1].width
          );
        }
      });
    });
  });

  it('keeps partners adjacent and connectors aligned after wrapping', () => {
    const pair = wrapped.pairs.find((item) => item.key === '1|||2')!;
    const sire = wrapped.nodes.find((node) => node.id === pair.sireId)!;
    const dam = wrapped.nodes.find((node) => node.id === pair.damId)!;
    expect(Math.abs(sire.x - dam.x)).toBe(LINEAGE_NODE_WIDTH + 28);

    pair.childIds.forEach((id, index) => {
      const child = wrapped.nodes.find((node) => node.id === id)!;
      expect(child.y).toBeGreaterThan(pair.busY);
      expect(pair.childPaths[index]).toBe(
        `M ${child.centerX} ${pair.busY} V ${child.y}`
      );
    });
  });
});

describe('lineage graph — helpers', () => {
  it('picks the most prolific registered parent as the default root', () => {
    expect(pickDefaultRootId(family)).toBe('1');
  });

  it('formats the displayed bird code from the record or code map', () => {
    expect(lineageBirdCode(family[0])).toBe('1');
    expect(lineageBirdCode(bird({ id: 9, name: 'No code' }), new Map([['9', '4B2']]))).toBe('4B2');
  });
});
