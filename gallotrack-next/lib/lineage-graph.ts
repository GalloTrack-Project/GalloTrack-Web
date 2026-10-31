import type { FowlRecord } from './types';
import { parentRecordOf } from './lineage';
import { compareBirdCodesNatural, formatBirdCodeForDisplay } from './bird-code';

/**
 * Pedigree graph construction.
 *
 * Source of truth is the existing registry: a bird is a child of the birds
 * resolved by `parentRecordOf` (id link first, unambiguous name match as the
 * legacy fallback). Nothing here invents a relationship: unresolved parents
 * simply produce no node/edge.
 */

export type LineageDirection = 'down' | 'up' | 'both';

export interface LineageIndex {
  byId: Map<string, FowlRecord>;
  /** parentId -> children, deduped and stably sorted. */
  childrenByParent: Map<string, FowlRecord[]>;
  /** childId -> resolved parent records (null when unregistered/unknown). */
  parentsByChild: Map<string, { sire: FowlRecord | null; dam: FowlRecord | null }>;
}

export interface LineageTopologyNode {
  id: string;
  fowl: FowlRecord;
  generation: number;
  isRoot: boolean;
  /** Direct children that are not drawn (collapsed / depth cut). */
  hiddenChildren: number;
  /** Every descendant that is not drawn (cycle-safe count). */
  hiddenDescendants: number;
}

export interface LineageTopologyPair {
  key: string;
  sireId: string;
  damId: string;
  childIds: string[];
}

export interface LineageTopologySingle {
  parentId: string;
  childIds: string[];
}

export interface LineageTopology {
  rootId: string;
  direction: LineageDirection;
  nodes: LineageTopologyNode[];
  pairs: LineageTopologyPair[];
  singles: LineageTopologySingle[];
  /** Deterministic traversal order used by the layout. */
  nodeOrder: string[];
}

export interface LineageLayoutNode extends LineageTopologyNode {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
}

export interface LineageLayoutPair extends LineageTopologyPair {
  hubX: number;
  hubY: number;
  busY: number;
  sireX: number;
  damX: number;
  parentPaths: string[];
  dropPath: string;
  busPath: string;
  childPaths: string[];
  childCount: number;
}

export interface LineageLayoutSingle extends LineageTopologySingle {
  busY: number;
  parentX: number;
  parentBottom: number;
  path: string;
  busPath: string;
  childPaths: string[];
}

export interface LineageGenerationRow {
  gen: number;
  label: string;
  y: number;
  isRoot: boolean;
}

export interface LineageLayout {
  nodes: LineageLayoutNode[];
  pairs: LineageLayoutPair[];
  singles: LineageLayoutSingle[];
  generations: LineageGenerationRow[];
  width: number;
  height: number;
}

export interface LineageLayoutOptions {
  /**
   * Maximum width available for cards in one visual row, in layout units.
   * When omitted the layout keeps one row per generation (legacy behavior).
   */
  maxRowWidth?: number;
  nodeGap?: number;
  chainGap?: number;
  rowGap?: number;
  wrapGap?: number;
  paddingX?: number;
  paddingY?: number;
}

export const LINEAGE_NODE_WIDTH = 196;
export const LINEAGE_NODE_HEIGHT = 104;
const NODE_GAP = 28;
const CHAIN_GAP = 74;
const ROW_GAP = 138;
/** Vertical gap between wrapped sub-rows inside the same generation. */
const WRAP_GAP = 84;
const PAD_X = 92;
const PAD_Y = 64;
const PAIR_DROP = 30;
const PAIR_BUS = 30;
const SINGLE_DROP = 40;

const codeOf = (fowl: FowlRecord): string =>
  fowl.birth_code || fowl.chicken_code || fowl.bird_code || '';

const sortChildren = (a: FowlRecord, b: FowlRecord): number => {
  const codeA = codeOf(a);
  const codeB = codeOf(b);
  if (codeA && codeB) {
    const byCode = compareBirdCodesNatural(codeA, codeB);
    if (byCode !== 0) return byCode;
  }
  if (codeA && !codeB) return -1;
  if (!codeA && codeB) return 1;
  return a.name.localeCompare(b.name);
};

/** Build the resolved parent/child index once per registry snapshot. */
export function buildLineageIndex(fowls: FowlRecord[]): LineageIndex {
  const byId = new Map<string, FowlRecord>();
  fowls.forEach((f) => byId.set(String(f.id), f));

  const childrenByParent = new Map<string, FowlRecord[]>();
  const parentsByChild = new Map<string, { sire: FowlRecord | null; dam: FowlRecord | null }>();

  fowls.forEach((child) => {
    const sire = parentRecordOf(child, 'sire', fowls);
    const dam = parentRecordOf(child, 'dam', fowls);
    const safeSire = sire && sire.id !== child.id ? sire : null;
    const safeDam = dam && dam.id !== child.id ? dam : null;
    parentsByChild.set(String(child.id), { sire: safeSire, dam: safeDam });

    [safeSire, safeDam].forEach((parent) => {
      if (!parent) return;
      const parentId = String(parent.id);
      const bucket = childrenByParent.get(parentId) ?? [];
      if (!bucket.some((c) => c.id === child.id)) bucket.push(child);
      childrenByParent.set(parentId, bucket);
    });
  });

  childrenByParent.forEach((bucket) => bucket.sort(sortChildren));

  return { byId, childrenByParent, parentsByChild };
}

/** A good initial root: the most prolific registered parent (sires first on ties). */
export function pickDefaultRootId(fowls: FowlRecord[], index?: LineageIndex): string | null {
  if (fowls.length === 0) return null;
  const idx = index ?? buildLineageIndex(fowls);
  const maleRank = (gender?: string) =>
    ['rooster', 'cock', 'stag', 'male'].includes((gender ?? '').trim().toLowerCase()) ? 0 : 1;
  let best: { id: string; count: number; rank: number; name: string } | null = null;
  for (const [id, children] of idx.childrenByParent) {
    const fowl = idx.byId.get(id);
    if (!fowl) continue;
    const rank = maleRank(fowl.gender);
    if (
      !best ||
      children.length > best.count ||
      (children.length === best.count && rank < best.rank) ||
      (children.length === best.count && rank === best.rank && fowl.name.localeCompare(best.name) < 0)
    ) {
      best = { id, count: children.length, rank, name: fowl.name };
    }
  }
  if (best) return best.id;
  return String(fowls[0].id);
}

export interface BuildTopologyOptions {
  rootId: string;
  direction: LineageDirection;
  maxDepth: number;
  collapsed: Set<string>;
}

/**
 * Build the visible pedigree topology around a root bird.
 *
 * - `down` walks children, `up` walks parents, `both` does each from the root.
 * - Partners (the other resolved parent of a drawn child) are included in the
 *   parent generation so every drawing pair is visually complete.
 * - Collapsed nodes and the depth limit prune traversal; the pruned counts are
 *   reported on the node so the UI can show "+N".
 * - Cycles are bounded by a step guard and never recurse infinitely.
 */
export function buildLineageTopology(
  index: LineageIndex,
  options: BuildTopologyOptions
): LineageTopology | null {
  const { rootId, direction, maxDepth, collapsed } = options;
  const root = index.byId.get(rootId);
  if (!root) return null;

  const generations = new Map<string, number>();
  const order: string[] = [];
  const seenOrder = new Set<string>();
  const record = (id: string) => {
    if (seenOrder.has(id)) return;
    seenOrder.add(id);
    order.push(id);
  };

  const queue: Array<{ id: string; gen: number }> = [{ id: rootId, gen: 0 }];
  const guardLimit = Math.max(64, index.byId.size * 6);
  let steps = 0;

  while (queue.length > 0 && steps < guardLimit) {
    steps += 1;
    const next = queue.shift();
    if (!next) break;
    const { id, gen } = next;
    const current = generations.get(id);
    if (current !== undefined && current >= gen) continue;

    generations.set(id, gen);
    record(id);

    // A collapsed node hides its branch in the direction of travel.
    if (Math.abs(gen) >= maxDepth || collapsed.has(id)) continue;

    if (direction !== 'up') {
      (index.childrenByParent.get(id) ?? []).forEach((child) => {
        queue.push({ id: String(child.id), gen: gen + 1 });
      });
    }
    if (direction !== 'down') {
      const parents = index.parentsByChild.get(id);
      if (parents?.sire) queue.push({ id: String(parents.sire.id), gen: gen - 1 });
      if (parents?.dam) queue.push({ id: String(parents.dam.id), gen: gen - 1 });
    }
  }

  // Partners: when a child is in the graph but one of its parents is not (the
  // mate of a lineage bird), include that parent in the child's parent row.
  if (direction !== 'up') {
    Array.from(generations.entries()).forEach(([childId, gen]) => {
      const parents = index.parentsByChild.get(childId);
      if (!parents) return;
      const partnerGen = gen - 1;
      if (Math.abs(partnerGen) > maxDepth) return;
      [parents.sire, parents.dam].forEach((parent) => {
        if (!parent) return;
        const parentId = String(parent.id);
        if (parentId === childId || generations.has(parentId)) return;
        generations.set(parentId, partnerGen);
        record(parentId);
      });
    });
  }

  const included = (id: string) => generations.has(id);
  const generationOf = (id: string) => generations.get(id) ?? 0;

  const pairMap = new Map<string, LineageTopologyPair>();
  const singleMap = new Map<string, Set<string>>();

  generations.forEach((childGen, childId) => {
    const parents = index.parentsByChild.get(childId);
    if (!parents) return;
    const sire = parents.sire;
    const dam = parents.dam;
    const sireId = sire ? String(sire.id) : null;
    const damId = dam ? String(dam.id) : null;
    const sireOk = sireId != null && included(sireId) && generationOf(sireId) < childGen;
    const damOk = damId != null && included(damId) && generationOf(damId) < childGen;

    if (sireOk && damOk && sireId !== damId) {
      const key = `${sireId}|||${damId}`;
      const pair = pairMap.get(key) ?? {
        key,
        sireId: sireId as string,
        damId: damId as string,
        childIds: [],
      };
      if (!pair.childIds.includes(childId)) pair.childIds.push(childId);
      pairMap.set(key, pair);
      return;
    }
    const parentId = sireOk ? sireId : damOk ? damId : null;
    if (!parentId) return;
    const bucket = singleMap.get(parentId) ?? new Set<string>();
    bucket.add(childId);
    singleMap.set(parentId, bucket);
  });

  // Cycle-safe count of every descendant that is not drawn.
  const countHidden = (id: string): { children: number; descendants: number } => {
    const visited = new Set<string>([id]);
    const stack = (index.childrenByParent.get(id) ?? []).map((c) => c.id);
    let hiddenChildren = 0;
    let hiddenDescendants = 0;
    while (stack.length > 0) {
      const nextId = stack.pop();
      if (nextId == null) continue;
      const key = String(nextId);
      if (visited.has(key)) continue;
      visited.add(key);
      if (!included(key)) hiddenDescendants += 1;
      (index.childrenByParent.get(key) ?? []).forEach((grandchild) =>
        stack.push(grandchild.id)
      );
    }
    (index.childrenByParent.get(id) ?? []).forEach((child) => {
      if (!included(String(child.id))) hiddenChildren += 1;
    });
    return { children: hiddenChildren, descendants: hiddenDescendants };
  };

  const nodes: LineageTopologyNode[] = order
    .map((id) => {
      const fowl = index.byId.get(id);
      if (!fowl) return null;
      const hidden = countHidden(id);
      return {
        id,
        fowl,
        generation: generationOf(id),
        isRoot: id === rootId,
        hiddenChildren: hidden.children,
        hiddenDescendants: hidden.descendants,
      } satisfies LineageTopologyNode;
    })
    .filter((node): node is LineageTopologyNode => node !== null)
    .sort((a, b) => a.generation - b.generation || order.indexOf(a.id) - order.indexOf(b.id));

  const pairs = Array.from(pairMap.values()).map((pair) => ({
    ...pair,
    childIds: [...pair.childIds].sort(
      (a, b) =>
        order.indexOf(a) - order.indexOf(b) ||
        (index.byId.get(a)?.name ?? '').localeCompare(index.byId.get(b)?.name ?? '')
    ),
  }));

  const singles: LineageTopologySingle[] = Array.from(singleMap.entries()).map(
    ([parentId, childIds]) => ({
      parentId,
      childIds: Array.from(childIds).sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    })
  );

  return {
    rootId,
    direction,
    nodes,
    pairs,
    singles,
    nodeOrder: order,
  };
}

/**
 * Deterministic layered layout. Partners that share a visible child are kept
 * adjacent within a generation so pair connectors stay short and readable.
 */
export function layoutLineageTopology(
  topology: LineageTopology,
  options: LineageLayoutOptions = {}
): LineageLayout {
  const nodeWidth = LINEAGE_NODE_WIDTH;
  const nodeHeight = LINEAGE_NODE_HEIGHT;
  const nodeGap = options.nodeGap ?? NODE_GAP;
  const chainGap = options.chainGap ?? CHAIN_GAP;
  const rowGap = options.rowGap ?? ROW_GAP;
  const wrapGap = options.wrapGap ?? WRAP_GAP;
  const paddingX = options.paddingX ?? PAD_X;
  const paddingY = options.paddingY ?? PAD_Y;
  const maxRowWidth = options.maxRowWidth ?? Number.POSITIVE_INFINITY;

  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
  const orderIndex = new Map(topology.nodeOrder.map((id, i) => [id, i]));
  const gens = Array.from(new Set(topology.nodes.map((n) => n.generation))).sort(
    (a, b) => a - b
  );

  const partnerAdjacency = new Map<string, Set<string>>();
  topology.pairs.forEach((pair) => {
    const sire = nodeById.get(pair.sireId);
    const dam = nodeById.get(pair.damId);
    if (!sire || !dam || sire.generation !== dam.generation) return;
    const sireSet = partnerAdjacency.get(pair.sireId) ?? new Set<string>();
    sireSet.add(pair.damId);
    partnerAdjacency.set(pair.sireId, sireSet);
    const damSet = partnerAdjacency.get(pair.damId) ?? new Set<string>();
    damSet.add(pair.sireId);
    partnerAdjacency.set(pair.damId, damSet);
  });

  const chainWidth = (chain: string[]) =>
    chain.length * nodeWidth + Math.max(0, chain.length - 1) * nodeGap;

  // Build partner-aware chains for each generation.
  const chainsByGen = new Map<number, string[][]>();
  gens.forEach((gen) => {
    const rowIds = topology.nodes
      .filter((n) => n.generation === gen)
      .map((n) => n.id)
      .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0));

    const visited = new Set<string>();
    const chains: string[][] = [];
    rowIds.forEach((startId) => {
      if (visited.has(startId)) return;
      const chain: string[] = [];
      const stack: string[] = [startId];
      visited.add(startId);
      while (stack.length > 0) {
        const id = stack.shift();
        if (id == null) continue;
        chain.push(id);
        const partners = Array.from(partnerAdjacency.get(id) ?? []).sort(
          (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)
        );
        partners.forEach((partner) => {
          if (visited.has(partner)) return;
          visited.add(partner);
          stack.push(partner);
        });
      }
      chains.push(chain);
    });

    chainsByGen.set(gen, chains);
  });

  // Split chains only at points that do not separate a partner pair.
  const splitChains = (chains: string[][]): string[][] => {
    const chunks: string[][] = [];
    chains.forEach((chain) => {
      let current: string[] = [];
      const flush = () => {
        if (current.length > 0) {
          chunks.push(current);
          current = [];
        }
      };

      chain.forEach((id) => {
        if (current.length > 0) {
          const last = current[current.length - 1];
          const partnerOfLast = partnerAdjacency.get(last)?.has(id) ?? false;
          if (!partnerOfLast && chainWidth([...current, id]) > maxRowWidth) {
            flush();
          }
        }
        current.push(id);
      });
      flush();
    });
    return chunks;
  };

  const packChunks = (
    chunks: string[][]
  ): { chunks: string[][]; width: number }[] => {
    const rows: { chunks: string[][]; width: number }[] = [];
    chunks.forEach((chunk) => {
      const width = chainWidth(chunk);
      const last = rows[rows.length - 1];
      if (last && last.width + chainGap + width <= maxRowWidth) {
        last.chunks.push(chunk);
        last.width += chainGap + width;
      } else {
        rows.push({ chunks: [chunk], width });
      }
    });
    return rows;
  };

  const genRows = new Map<number, { chunks: string[][]; width: number }[]>();
  let layoutRowWidth = 0;
  gens.forEach((gen) => {
    const rows = packChunks(splitChains(chainsByGen.get(gen) ?? []));
    genRows.set(gen, rows);
    rows.forEach((row) => {
      layoutRowWidth = Math.max(layoutRowWidth, row.width);
    });
  });

  // Vertical cursor: each generation consumes all of its wrapped sub-rows.
  const rowStartY = new Map<number, number>();
  let cursorY = paddingY;
  gens.forEach((gen) => {
    const rows = genRows.get(gen) ?? [];
    rowStartY.set(gen, cursorY);
    cursorY +=
      rows.length * nodeHeight +
      Math.max(0, rows.length - 1) * wrapGap +
      rowGap;
  });

  const positions = new Map<string, { x: number; y: number; centerX: number }>();
  gens.forEach((gen) => {
    const rows = genRows.get(gen) ?? [];
    const startY = rowStartY.get(gen) ?? paddingY;

    rows.forEach((row, rowIndex) => {
      const y = startY + rowIndex * (nodeHeight + wrapGap);
      let cursor = paddingX + (layoutRowWidth - row.width) / 2;

      row.chunks.forEach((chunk) => {
        chunk.forEach((id, idx) => {
          const x = cursor + idx * (nodeWidth + nodeGap);
          positions.set(id, {
            x,
            y,
            centerX: x + nodeWidth / 2,
          });
        });
        cursor += chainWidth(chunk) + chainGap;
      });
    });
  });

  const nodes: LineageLayoutNode[] = topology.nodes.map((node) => {
    const pos = positions.get(node.id) ?? {
      x: paddingX,
      y: rowStartY.get(node.generation) ?? paddingY,
      centerX: paddingX + nodeWidth / 2,
    };
    return {
      ...node,
      x: pos.x,
      y: pos.y,
      centerX: pos.centerX,
      width: nodeWidth,
      height: nodeHeight,
    };
  });
  const laidOutById = new Map(nodes.map((n) => [n.id, n]));

  const pairs: LineageLayoutPair[] = topology.pairs
    .map((pair) => {
      const sire = laidOutById.get(pair.sireId);
      const dam = laidOutById.get(pair.damId);
      const children = pair.childIds
        .map((id) => laidOutById.get(id))
        .filter((n): n is LineageLayoutNode => Boolean(n));
      if (!sire || !dam || children.length === 0) return null;

      const parentBottom = Math.max(sire.y + sire.height, dam.y + dam.height);
      const hubY = parentBottom + PAIR_DROP;
      const busY = hubY + PAIR_BUS;
      const hubX = (sire.centerX + dam.centerX) / 2;
      const childXs = children.map((child) => child.centerX);
      const minChildX = Math.min(...childXs);
      const maxChildX = Math.max(...childXs);

      return {
        ...pair,
        hubX,
        hubY,
        busY,
        sireX: sire.centerX,
        damX: dam.centerX,
        parentPaths: [
          `M ${sire.centerX} ${sire.y + sire.height} V ${hubY} H ${hubX}`,
          `M ${dam.centerX} ${dam.y + dam.height} V ${hubY} H ${hubX}`,
        ],
        dropPath: `M ${hubX} ${hubY} V ${busY}`,
        busPath:
          minChildX === maxChildX
            ? `M ${minChildX} ${busY} V ${children[0].y}`
            : `M ${minChildX} ${busY} H ${maxChildX}`,
        childPaths: children.map((child) => `M ${child.centerX} ${busY} V ${child.y}`),
        childCount: children.length,
      } satisfies LineageLayoutPair;
    })
    .filter((pair): pair is LineageLayoutPair => pair !== null);

  const singles: LineageLayoutSingle[] = topology.singles
    .map((single) => {
      const parent = laidOutById.get(single.parentId);
      const children = single.childIds
        .map((id) => laidOutById.get(id))
        .filter((n): n is LineageLayoutNode => Boolean(n));
      if (!parent || children.length === 0) return null;
      const parentBottom = parent.y + parent.height;
      const busY = parentBottom + SINGLE_DROP;
      const childXs = children.map((child) => child.centerX);
      const minChildX = Math.min(...childXs);
      const maxChildX = Math.max(...childXs);
      return {
        ...single,
        busY,
        parentX: parent.centerX,
        parentBottom,
        path: `M ${parent.centerX} ${parentBottom} V ${busY}`,
        busPath:
          minChildX === maxChildX
            ? `M ${minChildX} ${busY} V ${children[0].y}`
            : `M ${minChildX} ${busY} H ${maxChildX}`,
        childPaths: children.map((child) => `M ${child.centerX} ${busY} V ${child.y}`),
      } satisfies LineageLayoutSingle;
    })
    .filter((single): single is LineageLayoutSingle => single !== null);

  const maxX = Math.max(
    ...nodes.map((node) => node.x + node.width),
    paddingX + nodeWidth
  );
  const maxY = Math.max(
    ...nodes.map((node) => node.y + node.height),
    paddingY + nodeHeight
  );

  const rootNode = nodes.find((node) => node.isRoot);
  const generations: LineageGenerationRow[] = gens.map((gen, idx) => ({
    gen,
    label: `Generation ${idx + 1}`,
    y: rowStartY.get(gen) ?? paddingY,
    isRoot: rootNode?.generation === gen,
  }));

  return {
    nodes,
    pairs,
    singles,
    generations,
    width: maxX + paddingX,
    height: maxY + paddingY,
  };
}

/** Code shown on a node; falls back to the resolved code map. */
export function lineageBirdCode(fowl: FowlRecord, codes?: Map<string, string>): string {
  const raw =
    fowl.bird_code ||
    fowl.chicken_code ||
    fowl.birth_code ||
    codes?.get(String(fowl.id)) ||
    '';
  return formatBirdCodeForDisplay(raw);
}
