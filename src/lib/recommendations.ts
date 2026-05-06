// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Machine {
  id: string;
  name: string;
  type: 'Tracer' | 'Integrator' | 'Renderer';
  matrix: 'Matrix 1' | 'Matrix 2' | 'Any';
  isAvailable: boolean;
  instances?: number;
  supportsMulticam?: boolean;
  linkedMachineIds?: string[];
  resolution?: string | string[];
}

interface System {
  id: string;
  name: string;
  videoMatrix: string;
  resolution?: string | string[];
  isAvailable: boolean;
  machineIds?: string[];
  mainMachineIds?: string[];
  backupMachineIds?: string[];
  spareMachineIds?: string[];
  isSynthetic?: boolean;
}

interface ResourceReq {
  cameras: number;
  pgms: number;
  outputs: number;
}

interface RecSystem {
  id: string;
  name: string;
  videoMatrix: string;
  warnings: string[];
  machineIds?: string[];
  selectedMachines?: { id: string; name: string; type: string }[];
  isMerged?: boolean;
  conflictEventName?: string;
  level?: number; // 1=native, 2=same-matrix expansion, 3=creative redundancy, 4=cross-matrix, 5=mcr2 synthetic
}

interface PickResult {
  picked: Machine[];
  remainingPool: Machine[];
  crossMatrixWarnings: string[];
  success: boolean;
}

interface Gallery {
  mainConfig?: ResourceReq;
  backupConfig?: ResourceReq;
  hasBackup?: boolean;
  resolution?: string[];
  videoMatrix?: string;
  redundantMatrix?: boolean;
}

interface Event {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  galleries?: { systemId: string }[];
  sessions?: { startDate: string; endDate: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const isUHDRenderer = (name: string): boolean =>
  /(31|32|37|38)\b/.test(name) || name.toLowerCase().includes('uhd');

const getInstances = (m: Machine, resList: string[]): number => {
  if (resList.includes('UHD') && isUHDRenderer(m.name)) return 1;
  return m.instances || 1;
};

const canDoMulticam = (m: Machine): boolean =>
  m.type !== 'Integrator' || m.supportsMulticam !== false;

const isHeavyTracer = (m: Machine): boolean =>
  /(?:^|[^0-9])(13|14|16)(?![0-9])/.test(m.name);

const isHeavyIntegrator = (m: Machine): boolean =>
  /(?:^|[^0-9])17(?![0-9])/.test(m.name);

const isHeavyRenderer = (m: Machine): boolean =>
  /(?:^|[^0-9])2(?![0-9])/.test(m.name);

const isIntegrator25 = (m: Machine): boolean =>
  m.type === 'Integrator' && /\b25\b/.test(m.name);

const isSys6 = (s: System): boolean =>
  s.name.toLowerCase().includes('system 6') || s.name.toLowerCase().includes('sistema 6');

const isSys1 = (s: System): boolean =>
  s.name.toLowerCase().includes('system 1') || s.name.toLowerCase().includes('sistema 1');

const oppositeMatrix = (matrix: string): string =>
  matrix === 'Matrix 1' ? 'Matrix 2' : 'Matrix 1';

/**
 * Groups borrowed machines by their home system using a greedy bin-packing approach:
 * exhausts one system's machines before opening another, minimising the number of
 * systems involved. Returns an ordered list of { system, machines } pairs plus any
 * machines that couldn't be attributed to a known system.
 */
const groupBorrowedBySystem = (
  borrowed: Machine[],
  availableSystems: System[]
): {
  groups: Array<{ system: System; machines: Machine[] }>;
  unattributed: Machine[];
  systemNames: string[];
} => {
  const remaining = [...borrowed];
  const groups: Array<{ system: System; machines: Machine[] }> = [];

  // Sort systems by how many borrowed machines they own — largest overlap first
  // so we consume the biggest cohesive blocks before smaller ones.
  const ranked = availableSystems
    .map(sys => ({
      sys,
      overlap: remaining.filter(m => (sys.machineIds ?? []).includes(m.id)).length,
    }))
    .filter(x => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);

  for (const { sys } of ranked) {
    const mine = remaining.filter(m => (sys.machineIds ?? []).includes(m.id));
    if (mine.length === 0) continue;
    groups.push({ system: sys, machines: mine });
    mine.forEach(m => remaining.splice(remaining.indexOf(m), 1));
  }

  const systemNames = groups.map(g => g.system.name);

  return { groups, unattributed: remaining, systemNames };
};

/**
 * Builds a human-readable breakdown of borrowed machines grouped by system.
 * Example output:
 *   "da Sistema 2: T24, I25 — da Sistema 3: R31"
 */
const describeBorrowed = (
  borrowed: Machine[],
  availableSystems: System[]
): { label: string; systemNames: string[] } => {
  if (borrowed.length === 0) return { label: '', systemNames: [] };

  const { groups, unattributed, systemNames } = groupBorrowedBySystem(borrowed, availableSystems);

  const parts: string[] = groups.map(
    g => `da ${g.system.name}: ${g.machines.map(m => m.name).join(', ')}`
  );
  if (unattributed.length > 0) {
    parts.push(`non attribuiti: ${unattributed.map(m => m.name).join(', ')}`);
  }

  return { label: parts.join(' — '), systemNames };
};

/**
 * Checks whether a machine is occupied by a concurrent event (machine-level check).
 */
const isMachineConflicted = (
  machineId: string,
  startMs: number,
  endMs: number,
  allEvents: Event[],
  currentEventId?: string,
  allMachines?: Machine[],
  allSystems?: System[]
): boolean => {
  if (!allEvents || !allMachines || !allSystems) return false;
  return allEvents.some(e => {
    if (currentEventId && e.id === currentEventId) return false;
    const eStart = new Date(e.startDate).getTime();
    const eEnd = new Date(e.endDate).getTime();
    if (!(startMs < eEnd && endMs > eStart)) return false;
    // Check if this event uses a system that contains this machine
    return Array.isArray(e.galleries) && e.galleries.some(g => {
      const sys = allSystems.find(s => s.id === g.systemId);
      return sys && (sys.machineIds || []).includes(machineId);
    });
  });
};

/**
 * Resolves machines for a system, separating Main and Backup pools,
 * applying heavy-machine filtering for light setups (Sys1 logic).
 */
const resolveSystemMachines = (
  system: System,
  availableMachines: Machine[],
  mainReq: ResourceReq,
  bckReq: ResourceReq | null,
  resList: string[],
  redundantMatrix: boolean
): { sysMainMs: Machine[]; sysBckMs: Machine[] } => {
  const unassignedToMain = (system.machineIds || []).filter(id =>
    !(system.mainMachineIds || []).includes(id) &&
    !(system.backupMachineIds || []).includes(id) &&
    !(system.spareMachineIds || []).includes(id)
  );

  let sysMainMs = availableMachines.filter(m =>
    (system.mainMachineIds || []).includes(m.id) || unassignedToMain.includes(m.id)
  );
  let sysBckMs = redundantMatrix
    ? []
    : availableMachines.filter(m => (system.backupMachineIds || []).includes(m.id));

  const needsHeavy = mainReq.pgms >= 2 || mainReq.cameras >= 6;

  if (isSys1(system) && !needsHeavy) {
    const filterHeavy = (machines: Machine[], req: ResourceReq | null, isBck: boolean): Machine[] => {
      const lightT = machines.filter(m => m.type === 'Tracer' && !isHeavyTracer(m));
      const heavyT = machines.filter(m => m.type === 'Tracer' && isHeavyTracer(m));
      const lightI = machines.filter(m => m.type === 'Integrator' && !isHeavyIntegrator(m));
      const heavyI = machines.filter(m => m.type === 'Integrator' && isHeavyIntegrator(m));
      const lightR = machines.filter(m => m.type === 'Renderer' && !isHeavyRenderer(m));
      const heavyR = machines.filter(m => m.type === 'Renderer' && isHeavyRenderer(m));
      const others = machines.filter(m => !['Tracer', 'Integrator', 'Renderer'].includes(m.type));

      const cameras = req?.cameras ?? 0;
      const pgms = req?.pgms ?? 0;
      const outputs = req?.outputs ?? 0;

      const defT = Math.max(0, cameras - lightT.length);
      const defI = Math.max(0, pgms - lightI.length);
      const lightRCount = lightR.reduce((acc, m) => acc + getInstances(m, resList), 0);
      const defR = Math.max(0, outputs - lightRCount);

      return [
        ...others,
        ...lightT, ...heavyT.slice(0, defT),
        ...lightI, ...heavyI.slice(0, defI),
        ...lightR, ...heavyR.slice(0, defR),
      ];
    };

    sysMainMs = filterHeavy(sysMainMs, mainReq, false);
    sysBckMs = filterHeavy(sysBckMs, bckReq, true);
  }

  return { sysMainMs, sysBckMs };
};

/**
 * Pure pick function — no side effects.
 * Returns picked machines, remaining pool, cross-matrix warnings, and success flag.
 */
const pickMachines = (
  type: 'Tracer' | 'Integrator' | 'Renderer',
  count: number,
  role: 'Main' | 'Bck',
  pool: Machine[],
  baseSystem: System,
  resList: string[],
  options?: {
    requireCondition?: (m: Machine) => boolean;
    preferCondition?: (m: Machine) => boolean;
    matrixConstraint?: 'same' | 'opposite' | 'prefer-same' | 'prefer-opposite' | 'any';
    availableSystems?: System[];
    alreadyBorrowed?: Machine[];
    baseSystemMachines?: Machine[];
    redundantMatrix?: boolean;
  }
): PickResult => {
  if (count <= 0) return { picked: [], remainingPool: pool, crossMatrixWarnings: [], success: true };

  const { requireCondition, preferCondition, matrixConstraint = 'any', availableSystems = [], alreadyBorrowed = [], baseSystemMachines = [], redundantMatrix = false } = options ?? {};

  const expectedMatrix =
    role === 'Main'
      ? baseSystem.videoMatrix
      : redundantMatrix
        ? oppositeMatrix(baseSystem.videoMatrix)
        : baseSystem.videoMatrix;

  let candidates = pool.filter(m => m.type === type);
  if (requireCondition) candidates = candidates.filter(requireCondition);

  // Apply hard matrix constraint
  if (matrixConstraint === 'same') {
    candidates = candidates.filter(m => {
      if (m.matrix === expectedMatrix || m.matrix === 'Any') return true;
      // Allow if it belongs to a system we have already borrowed from (cohesive expansion)
      const thisSystem = availableSystems.find(s => (s.machineIds || []).includes(m.id));
      if (thisSystem && alreadyBorrowed.some(b => (thisSystem.machineIds || []).includes(b.id))) return true;
      return false;
    });
  } else if (matrixConstraint === 'opposite') {
    const opp = expectedMatrix === 'Matrix 1' ? 'Matrix 2' : 'Matrix 1';
    candidates = candidates.filter(m => m.matrix === opp || m.matrix === 'Any');
  }

  const getLinkedAffinity = (m: Machine, currentlyPicked: Machine[]) => {
    if (!m.linkedMachineIds || m.linkedMachineIds.length === 0) return 0;
    const allCurrentIds = new Set([
      ...alreadyBorrowed.map(x => x.id),
      ...baseSystemMachines.map(x => x.id),
      ...currentlyPicked.map(x => x.id),
    ]);
    let score = 0;
    for (const id of m.linkedMachineIds) {
      if (allCurrentIds.has(id)) score += 1;
    }
    return score;
  };

  // Group by home system for cohesive blocks
  const sysCandidates = availableSystems
    .filter(s => s.id !== baseSystem.id)
    .map(sys => {
      const sysMachines = candidates.filter(c => (sys.machineIds || []).includes(c.id));
      const spareCount = sysMachines.filter(c => (sys.spareMachineIds || []).includes(c.id)).length;
      
      // Calculate affinity based on how many machines we ALREADY borrowed from this system
      const affinity = alreadyBorrowed.filter(b => (sys.machineIds || []).includes(b.id)).length;

      // Calculate linked affinity for the whole system block (sum of individual linked affinities to existing picks)
      const linkedAffinityCount = sysMachines.reduce((acc, m) => acc + getLinkedAffinity(m, []), 0);

      return { sys, sysMachines, count: sysMachines.length, spareCount, affinity, linkedAffinityCount, matrix: sys.videoMatrix };
    })
    .filter(s => s.count > 0)
    .sort((a, b) => {
      // 0. Linked Affinity (highest priority if there's a hard hardware link!)
      if (b.linkedAffinityCount !== a.linkedAffinityCount) return b.linkedAffinityCount - a.linkedAffinityCount;

      // 1. Prioritize systems we already have an ATTACHMENT / AFFINITY with
      if (b.affinity !== a.affinity) return b.affinity - a.affinity;
      
      // 2. Spare machines
      if (b.spareCount !== a.spareCount) return b.spareCount - a.spareCount;
      
      // 3. Count
      if (b.count !== a.count) return b.count - a.count;
      
      // 4. Prefer same matrix
      const aSame = a.matrix === expectedMatrix;
      const bSame = b.matrix === expectedMatrix;
      if (aSame && !bSame) return -1;
      if (!aSame && bSame) return 1;
      return 0;
    });

  const picked: Machine[] = [];
  let remaining = [...candidates];
  let needed = count;

  // Pick from cohesive blocks first (spares first within each block)
  for (const sysC of sysCandidates) {
    if (needed <= 0) break;
    const usable = sysC.sysMachines
      .filter(m => remaining.some(c => c.id === m.id))
      .sort((a, b) => {
        const linkA = getLinkedAffinity(a, picked);
        const linkB = getLinkedAffinity(b, picked);
        if (linkB !== linkA) return linkB - linkA;

        // 1. Prefer native role match
        const aMatchRole = role === 'Main' ? (sysC.sys.mainMachineIds || []).includes(a.id) : (sysC.sys.backupMachineIds || []).includes(a.id);
        const bMatchRole = role === 'Main' ? (sysC.sys.mainMachineIds || []).includes(b.id) : (sysC.sys.backupMachineIds || []).includes(b.id);
        if (aMatchRole && !bMatchRole) return -1;
        if (!aMatchRole && bMatchRole) return 1;

        // 2. Prefer expected matrix match
        const aSameMatrix = a.matrix === expectedMatrix || a.matrix === 'Any';
        const bSameMatrix = b.matrix === expectedMatrix || b.matrix === 'Any';
        if (aSameMatrix && !bSameMatrix) return -1;
        if (!aSameMatrix && bSameMatrix) return 1;

        // 3. Spares
        const aSpare = (sysC.sys.spareMachineIds || []).includes(a.id);
        const bSpare = (sysC.sys.spareMachineIds || []).includes(b.id);
        if (aSpare && !bSpare) return -1;
        if (!aSpare && bSpare) return 1;

        return 0;
      });

    for (const m of usable) {
      if (needed <= 0) break;
      picked.push(m);
      remaining = remaining.filter(c => c.id !== m.id);
      needed -= type === 'Renderer' ? getInstances(m, resList) : 1;
    }
  }

  // Loose pick from remaining candidates
  if (needed > 0) {
    remaining.sort((a, b) => {
      const linkA = getLinkedAffinity(a, picked);
      const linkB = getLinkedAffinity(b, picked);
      if (linkB !== linkA) return linkB - linkA;

      // 1. Prefer native role match across available systems (STRONGEST preference to avoid mixing Main and Bck)
      const systemA = availableSystems.find(s => (s.machineIds || []).includes(a.id));
      const systemB = availableSystems.find(s => (s.machineIds || []).includes(b.id));

      const aNativeRole = systemA ? (role === 'Main' ? (systemA.mainMachineIds || []).includes(a.id) : (systemA.backupMachineIds || []).includes(a.id)) : false;
      const bNativeRole = systemB ? (role === 'Main' ? (systemB.mainMachineIds || []).includes(b.id) : (systemB.backupMachineIds || []).includes(b.id)) : false;

      if (aNativeRole && !bNativeRole) return -1;
      if (!aNativeRole && bNativeRole) return 1;

      // 2. Prefer expected matrix match
      const aSame = a.matrix === expectedMatrix || a.matrix === 'Any';
      const bSame = b.matrix === expectedMatrix || b.matrix === 'Any';
      if (aSame && !bSame) return -1;
      if (!aSame && bSame) return 1;

      // 3. Affinity across available systems (for cohesive expansion within the loose pick fallback)
      const affA = systemA ? alreadyBorrowed.filter(x => (systemA.machineIds || []).includes(x.id)).length : 0;
      const affB = systemB ? alreadyBorrowed.filter(x => (systemB.machineIds || []).includes(x.id)).length : 0;
      if (affB !== affA) return affB - affA;

      // 4. Spares
      const aSpare = availableSystems.some(s => (s.spareMachineIds || []).includes(a.id));
      const bSpare = availableSystems.some(s => (s.spareMachineIds || []).includes(b.id));
      if (aSpare && !bSpare) return -1;
      if (!aSpare && bSpare) return 1;

      if (preferCondition) {
        const pA = preferCondition(a);
        const pB = preferCondition(b);
        if (pA && !pB) return -1;
        if (!pA && pB) return 1;
      }

      return 0;
    });

    for (const m of remaining) {
      if (needed <= 0) break;
      picked.push(m);
      needed -= type === 'Renderer' ? getInstances(m, resList) : 1;
    }
  }

  const crossMatrixWarnings: string[] = [];
  const crossPicked = picked.filter(m => m.matrix !== expectedMatrix && m.matrix !== 'Any');
  if (crossPicked.length > 0) {
    crossMatrixWarnings.push(
      `Occupa Tieline (Espansione per ${role} ${type} su matrice opposta: ${crossPicked.map(m => m.name).join(', ')})`
    );
  }

  const finalPool = pool.filter(p => !picked.find(s => s.id === p.id));

  return {
    picked,
    remainingPool: finalPool,
    crossMatrixWarnings,
    success: needed <= 0,
  };
};

/**
 * Checks if an event overlaps with the current event date range and uses the given system.
 */
const findConflictingEvent = (
  systemId: string,
  startMs: number,
  endMs: number,
  allEvents: Event[],
  currentEventId?: string,
  currentSessions?: { startDate: string; endDate: string }[]
): Event | undefined => {
  return allEvents?.find(e => {
    if (currentEventId && e.id === currentEventId) return false;
    
    // Convert current checking times to a list of blocks
    const currentBlocks = (currentSessions && currentSessions.length > 0) 
      ? currentSessions.map(s => ({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() }))
      : [{ start: startMs, end: endMs }];

    // Convert target event times to a list of blocks
    const targetBlocks = (e.sessions && e.sessions.length > 0)
      ? e.sessions.map(s => ({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() }))
      : [{ start: new Date(e.startDate).getTime(), end: new Date(e.endDate).getTime() }];

    // Check if any block overlaps
    let overlaps = false;
    for (const cur of currentBlocks) {
      for (const tgt of targetBlocks) {
        if (cur.start < tgt.end && cur.end > tgt.start) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) break;
    }
    
    if (!overlaps) return false;
    return Array.isArray(e.galleries) && e.galleries.some(g => g.systemId === systemId);
  });
};

/**
 * Counts available resources in a machine list.
 */
const countResources = (machines: Machine[], resList: string[]) => ({
  tracers: machines.filter(m => m.type === 'Tracer' && m.isAvailable).length,
  integrators: machines.filter(m => m.type === 'Integrator' && m.isAvailable).length,
  renderers: machines
    .filter(m => m.type === 'Renderer' && m.isAvailable)
    .reduce((acc, m) => acc + getInstances(m, resList), 0),
});

const meetsReq = (counts: ReturnType<typeof countResources>, req: ResourceReq): boolean =>
  counts.tracers >= req.cameras &&
  counts.integrators >= req.pgms &&
  counts.renderers >= req.outputs;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

const getRecommendedSystems = (
  gallery: Gallery,
  availableMachines: Machine[],
  availableSystems: System[],
  formData: { startDate: string; endDate: string; sessions?: { startDate: string; endDate: string }[] },
  allEvents?: Event[],
  event?: { id: string }
): RecSystem[] => {
  const mainReq: ResourceReq = gallery.mainConfig ?? { cameras: 0, pgms: 0, outputs: 0 };
  const bckReq: ResourceReq | null = gallery.hasBackup ? (gallery.backupConfig ?? null) : null;
  const resList: string[] = Array.isArray(gallery.resolution) && gallery.resolution.length > 0
    ? gallery.resolution
    : ['HD'];

  if (mainReq.cameras === 0 && mainReq.pgms === 0 && mainReq.outputs === 0) return [];

  const startMs = new Date(formData.startDate).getTime();
  const endMs = new Date(formData.endDate).getTime();

  const isMainMulticam = mainReq.cameras > 1;
  const isBckMulticam = bckReq ? bckReq.cameras > 1 : false;

  // Machines belonging to unavailable systems — never borrow these
  const unavailableMachineIds = new Set<string>();
  availableSystems.forEach(sys => {
    if (!sys.isAvailable) {
      [...(sys.mainMachineIds ?? []), ...(sys.backupMachineIds ?? []), ...(sys.machineIds ?? [])]
        .forEach(id => unavailableMachineIds.add(id));
    }
  });

  // MCR1 backup integrators — forbidden for multicam main
  const mcr1BckIntegratorIds = new Set<string>();
  availableSystems
    .filter(s => s.videoMatrix === 'Matrix 1')
    .forEach(s => {
      (s.backupMachineIds ?? []).forEach(id => {
        const m = availableMachines.find(x => x.id === id);
        if (m?.type === 'Integrator') mcr1BckIntegratorIds.add(id);
      });
    });

  const sys6System = availableSystems.find(isSys6);

  // ── Build synthetic MCR2 system ──────────────────────────────────────────
  const isMCR2Multicam =
    (gallery.videoMatrix === 'Any' || gallery.videoMatrix === 'Matrix 2') && mainReq.cameras > 1;

  let systemsToEvaluate: System[] = [...availableSystems];

  if (isMCR2Multicam) {
    const sys1MCR2 = availableSystems.find(
      s => s.videoMatrix === 'Matrix 2' &&
        (s.name.toLowerCase().includes('atgi') || s.name.toLowerCase().includes('sys 1') ||
          s.name.toLowerCase().includes('system 1') || s.name.toLowerCase().includes('sistema 1'))
    );
    const sys2MCR2 = availableSystems.find(
      s => s.videoMatrix === 'Matrix 2' &&
        (s.name.toLowerCase().includes('tgi') || s.name.toLowerCase().includes('sys 2') ||
          s.name.toLowerCase().includes('system 2') || s.name.toLowerCase().includes('sistema 2'))
    );

    if (sys1MCR2 && sys2MCR2) {
      systemsToEvaluate.push({
        id: 'synthetic-mcr2-multi',
        name: 'Merged MCR2 (Sys 1 + Sys 2)',
        videoMatrix: 'Matrix 2',
        resolution: sys1MCR2.resolution,
        isAvailable: true,
        isSynthetic: true,
        machineIds: [...new Set([...(sys1MCR2.machineIds ?? []), ...(sys2MCR2.machineIds ?? [])])],
        mainMachineIds: [...new Set([...(sys1MCR2.mainMachineIds ?? []), ...(sys2MCR2.mainMachineIds ?? [])])],
        backupMachineIds: [...new Set([...(sys1MCR2.backupMachineIds ?? []), ...(sys2MCR2.backupMachineIds ?? [])])],
      });
    }
  }

  const results: RecSystem[] = [];

  // ── Evaluate each system ─────────────────────────────────────────────────
  for (const system of systemsToEvaluate) {
    if (!system.isAvailable && !system.isSynthetic) continue;

    // Resolution check
    const sysRes = Array.isArray(system.resolution) ? system.resolution : [system.resolution ?? 'HD'];
    if (!resList.every(r => sysRes.includes(r))) continue;

    // Matrix filter
    if (gallery.videoMatrix && gallery.videoMatrix !== 'Any' && system.videoMatrix !== gallery.videoMatrix) continue;

    const { sysMainMs, sysBckMs } = resolveSystemMachines(
      system, availableMachines, mainReq, bckReq, resList, gallery.redundantMatrix ?? false
    );

    // MCR2 Multicam: must have Integrator 25
    if (system.videoMatrix === 'Matrix 2' && isMainMulticam) {
      const allSysMs = [...sysMainMs, ...sysBckMs];
      if (!allSysMs.some(isIntegrator25)) continue;
    }

    // Filter multicam-incapable machines from backup if needed
    const filteredBckMs = isBckMulticam ? sysBckMs.filter(canDoMulticam) : sysBckMs;

    const mainCounts = countResources(sysMainMs, resList);
    const bckCounts = countResources(filteredBckMs, resList);

    const hasEnoughMain = meetsReq(mainCounts, mainReq);
    const hasEnoughBck = bckReq ? meetsReq(bckCounts, bckReq) : true;

    // ── LEVEL 1: Native match ──────────────────────────────────────────────
    if (hasEnoughMain && hasEnoughBck && !system.isSynthetic) {
      const warnings: string[] = [];

      // Tieline warnings for native cross-matrix machines
      const expectedMainMatrix = system.videoMatrix;
      const expectedBckMatrix = gallery.redundantMatrix ? oppositeMatrix(system.videoMatrix) : system.videoMatrix;
      const crossMain = sysMainMs.filter(m => m.matrix !== expectedMainMatrix && m.matrix !== 'Any');
      const crossBck = filteredBckMs.filter(m => m.matrix !== expectedBckMatrix && m.matrix !== 'Any');
      if (crossMain.length > 0)
        warnings.push(`Occupa Tieline (Main distribuito su matrice opposta: ${crossMain.map(m => m.name).join(', ')})`);
      if (crossBck.length > 0)
        warnings.push(`Occupa Tieline (Backup distribuito su matrice opposta: ${crossBck.map(m => m.name).join(', ')})`);

      // Spare renderer shared with Sys6
      if (!isSys1(system) && sys6System && sys6System.id !== system.id) {
        const uniqueMainRend = sysMainMs
          .filter(m => m.type === 'Renderer' && m.isAvailable && !(sys6System.machineIds ?? []).includes(m.id))
          .reduce((acc, m) => acc + getInstances(m, resList), 0);
        const uniqueBckRend = filteredBckMs
          .filter(m => m.type === 'Renderer' && m.isAvailable && !(sys6System.machineIds ?? []).includes(m.id))
          .reduce((acc, m) => acc + getInstances(m, resList), 0);
        if (
          (mainReq.outputs > 0 && uniqueMainRend < mainReq.outputs) ||
          (bckReq && bckReq.outputs > 0 && uniqueBckRend < bckReq.outputs)
        ) {
          warnings.push('Uses spare Renderer shared with System 6. Verificare disponibilità.');
        }
      }

      const conflictingEvent = allEvents
        ? findConflictingEvent(system.id, startMs, endMs, allEvents, event?.id, formData.sessions)
        : undefined;

      if (conflictingEvent) {
        warnings.push(`Attenzione: Sovrapposizione con ${conflictingEvent.title} che utilizza questo sistema.`);
        warnings.push(`💡 Suggerimento: Sistema nativo ottimale ma in conflitto. Valuta di riassegnare "${conflictingEvent.title}".`);
      }

      results.push({
        id: system.id,
        name: system.name,
        videoMatrix: system.videoMatrix,
        warnings,
        machineIds: system.machineIds,
        conflictEventName: conflictingEvent?.title,
        level: 1,
      });

      continue; // Native match found — skip expansion for this system
    }

    // ── LEVEL 3A: Creative redundancy — another Main system as Bck ─────────
    // Triggered when: bck is required, multicam, and native bck can't handle it
    if (bckReq && isBckMulticam && !hasEnoughBck && hasEnoughMain) {
      for (const bckSystem of availableSystems) {
        if (bckSystem.id === system.id) continue;
        if (!bckSystem.isAvailable) continue;

        const bckSysRes = Array.isArray(bckSystem.resolution)
          ? bckSystem.resolution
          : [bckSystem.resolution ?? 'HD'];
        if (!resList.every(r => bckSysRes.includes(r))) continue;

        const { sysMainMs: bckSysMain } = resolveSystemMachines(
          bckSystem, availableMachines, bckReq, null, resList, false
        );
        const bckSysMainFiltered = bckSysMain.filter(canDoMulticam);
        const bckSysCounts = countResources(bckSysMainFiltered, resList);

        if (!meetsReq(bckSysCounts, bckReq)) continue;

        const conflictingMain = allEvents
          ? findConflictingEvent(system.id, startMs, endMs, allEvents, event?.id, formData.sessions)
          : undefined;
        const conflictingBck = allEvents
          ? findConflictingEvent(bckSystem.id, startMs, endMs, allEvents, event?.id, formData.sessions)
          : undefined;

        const warnings: string[] = [
          `⚡ Ridondanza Creativa 3A: Il backup nativo non supporta multicam. Utilizzo di ${bckSystem.name} come sistema di backup su segnali dispari.`,
        ];
        if (conflictingMain)
          warnings.push(`Attenzione: Main in sovrapposizione con ${conflictingMain.title}.`);
        if (conflictingBck)
          warnings.push(`Attenzione: Bck System (${bckSystem.name}) in sovrapposizione con ${conflictingBck.title}.`);

        results.push({
          id: `creative-3a-${system.id}-bck-${bckSystem.id}`,
          name: `${system.name} (Main) + ${bckSystem.name} (Bck Creativo — Segnali Dispari)`,
          videoMatrix: system.videoMatrix,
          warnings,
          machineIds: [...(system.machineIds ?? []), ...(bckSystem.machineIds ?? [])],
          isMerged: true,
          conflictEventName: conflictingMain?.title ?? conflictingBck?.title,
          level: 3,
        });
        break; // One 3A proposal per main system is enough
      }
    }

    // ── LEVEL 3B: Creative redundancy — MCR2 as full backup ───────────────
    // Triggered when: bck required, multicam, native bck can't handle it,
    // Main is on MCR1 → use MCR2 systems as backup (carpet even signals)
    if (bckReq && isBckMulticam && !hasEnoughBck && hasEnoughMain && system.videoMatrix === 'Matrix 1') {
      const mcr2Systems = availableSystems.filter(
        s => s.videoMatrix === 'Matrix 2' && s.isAvailable && s.id !== system.id
      );

      // Pool all available Matrix 2 machines as backup
      const mcr2Pool = availableMachines.filter(m =>
        m.matrix === 'Matrix 2' &&
        m.isAvailable &&
        !unavailableMachineIds.has(m.id) &&
        mcr2Systems.some(s => (s.machineIds ?? []).includes(m.id))
      ).filter(canDoMulticam);

      const mcr2Counts = countResources(mcr2Pool, resList);

      if (meetsReq(mcr2Counts, bckReq)) {
        const conflictingMain = allEvents
          ? findConflictingEvent(system.id, startMs, endMs, allEvents, event?.id, formData.sessions)
          : undefined;

        const warnings: string[] = [
          `⚡ Ridondanza Creativa 3B: Backup completo su MCR2 (segnali pari/carpet). Main su MCR1 (${system.name}), Backup su pool Matrix 2 completo.`,
          `Macchine MCR2 utilizzate come Bck: ${mcr2Pool.map(m => m.name).join(', ')}.`,
        ];
        if (conflictingMain)
          warnings.push(`Attenzione: Main in sovrapposizione con ${conflictingMain.title}.`);

        const mcr2ConflictNames = mcr2Systems
          .map(s => findConflictingEvent(s.id, startMs, endMs, allEvents ?? [], event?.id, formData.sessions))
          .filter(Boolean)
          .map(e => e!.title);
        if (mcr2ConflictNames.length > 0)
          warnings.push(`Attenzione: Sistemi MCR2 Bck in sovrapposizione con: ${mcr2ConflictNames.join(', ')}.`);

        results.push({
          id: `creative-3b-${system.id}-mcr2bck`,
          name: `${system.name} (Main MCR1) + Pool MCR2 (Bck Creativo — Segnali Pari)`,
          videoMatrix: system.videoMatrix,
          warnings,
          machineIds: [
            ...(system.machineIds ?? []),
            ...mcr2Pool.map(m => m.id),
          ],
          selectedMachines: mcr2Pool.map(m => ({ id: m.id, name: m.name, type: m.type })),
          isMerged: true,
          conflictEventName: conflictingMain?.title,
          level: 3,
        });
      }
    }

    // ── LEVELS 2 & 4: Expansion (same-matrix first, cross-matrix fallback) ─
    // Build borrow pool excluding unavailable and system's own machines
    let borrowPool = availableMachines.filter(m =>
      m.isAvailable &&
      !unavailableMachineIds.has(m.id) &&
      !(system.machineIds ?? []).includes(m.id) &&
      !(system.mainMachineIds ?? []).includes(m.id) &&
      !(system.backupMachineIds ?? []).includes(m.id)
    );

    // Protect heavy subsystem from light setups
    const needsHeavy = mainReq.pgms >= 2 || mainReq.cameras >= 6;
    if (!needsHeavy) {
      borrowPool = borrowPool.filter(m =>
        !(m.type === 'Tracer' && isHeavyTracer(m)) &&
        !(m.type === 'Integrator' && isHeavyIntegrator(m)) &&
        !(m.type === 'Renderer' && isHeavyRenderer(m))
      );
    }

    // MCR1 bck integrators off-limits for multicam main
    if (isMainMulticam) {
      borrowPool = borrowPool.filter(m => !mcr1BckIntegratorIds.has(m.id));
    }
    if (isBckMulticam) {
      borrowPool = borrowPool.filter(canDoMulticam);
    }

    // Resolution filter for renderers
    borrowPool = borrowPool.filter(m => {
      if (m.type !== 'Renderer') return true;
      const mRes = Array.isArray(m.resolution) ? m.resolution : [m.resolution ?? 'HD'];
      return resList.some(r => mRes.includes(r));
    });

    // ── Attempt same-matrix expansion first (Level 2) ──────────────────────
    const tryExpansion = (matrixConstraint: 'same' | 'any'): {
      ok: boolean;
      borrowed: Machine[];
      warnings: string[];
      hasCrossMatrix: boolean;
    } => {
      let pool = [...borrowPool];
      const borrowed: Machine[] = [];
      const allWarnings: string[] = [];
      let ok = true;
      let hasCrossMatrix = false;

      const defMain = {
        T: Math.max(0, mainReq.cameras - mainCounts.tracers),
        I: Math.max(0, mainReq.pgms - mainCounts.integrators),
        R: Math.max(0, mainReq.outputs - mainCounts.renderers),
      };
      const defBck = bckReq
        ? {
          T: Math.max(0, bckReq.cameras - bckCounts.tracers),
          I: Math.max(0, bckReq.pgms - bckCounts.integrators),
          R: Math.max(0, bckReq.outputs - bckCounts.renderers),
        }
        : { T: 0, I: 0, R: 0 };

      // MCR2 requires Integrator 25 for multicam
      let defMainI = defMain.I;
      if (system.videoMatrix === 'Matrix 2' && isMainMulticam) {
        const hasInt25 = [...sysMainMs, ...filteredBckMs].some(isIntegrator25);
        if (!hasInt25) {
          const result = pickMachines('Integrator', 1, 'Main', pool, system, resList, {
            requireCondition: isIntegrator25,
            matrixConstraint,
            availableSystems,
            baseSystemMachines: [...sysMainMs, ...filteredBckMs],
            redundantMatrix: gallery.redundantMatrix ?? false,
          });
          if (!result.success) return { ok: false, borrowed: [], warnings: [], hasCrossMatrix: false };
          borrowed.push(...result.picked);
          pool = result.remainingPool;
          allWarnings.push(...result.crossMatrixWarnings);
          if (result.crossMatrixWarnings.length > 0) hasCrossMatrix = true;
          defMainI = Math.max(0, defMainI - 1);
        }
      }

      // MCR2 multicam extra tracers (24/25)
      let defMainT = defMain.T;
      if (system.videoMatrix === 'Matrix 2' && isMainMulticam && defMain.T > 0) {
        const mcr2Tracers = pool.filter(
          m => m.type === 'Tracer' && (/\b24\b/.test(m.name) || /\b25\b/.test(m.name))
        ).sort((a, b) => a.name.localeCompare(b.name));

        let picked = 0;
        for (const m of mcr2Tracers) {
          if (picked >= defMain.T) break;
          borrowed.push(m);
          pool = pool.filter(p => p.id !== m.id);
          picked++;
          defMainT--;
        }
      }

      const picks: Array<[
        'Tracer' | 'Integrator' | 'Renderer',
        number,
        'Main' | 'Bck',
        ((m: Machine) => boolean) | undefined,
        ((m: Machine) => boolean) | undefined,
      ]> = [
        ['Tracer', defMainT, 'Main',
          undefined,
          system.videoMatrix === 'Matrix 2' ? (m => /\b(24|25)\b/.test(m.name)) : undefined],
        ['Integrator', defMainI, 'Main', undefined, undefined],
        ['Renderer', defMain.R, 'Main', undefined, undefined],
        ['Tracer', defBck.T, 'Bck', undefined, undefined],
        ['Integrator', defBck.I, 'Bck', undefined, undefined],
        ['Renderer', defBck.R, 'Bck', undefined, undefined],
      ];

      for (const [type, count, role, reqCond, prefCond] of picks) {
        if (count <= 0) continue;
        const result = pickMachines(type, count, role, pool, system, resList, {
          requireCondition: reqCond,
          preferCondition: prefCond,
          matrixConstraint,
          availableSystems,
          alreadyBorrowed: borrowed,
          baseSystemMachines: [...sysMainMs, ...filteredBckMs],
          redundantMatrix: gallery.redundantMatrix ?? false,
        });
        if (!result.success) { ok = false; break; }
        borrowed.push(...result.picked);
        pool = result.remainingPool;
        allWarnings.push(...result.crossMatrixWarnings);
        if (result.crossMatrixWarnings.length > 0) hasCrossMatrix = true;
      }

      return { ok, borrowed, warnings: allWarnings, hasCrossMatrix };
    };

    // ── Helper: build name + warnings for any expansion result ───────────────
    const buildExpansionEntry = (
      expansionResult: { ok: boolean; borrowed: Machine[]; warnings: string[]; hasCrossMatrix: boolean },
      level: number
    ) => {
      if (!expansionResult.ok) return;

      const isSyntheticMCR2 = system.isSynthetic;
      const { label: borrowDesc, systemNames: borrowedSysNames } =
        describeBorrowed(expansionResult.borrowed, availableSystems);

      // ── Name: "Sistema 1 + Sistema 2 [+ Sistema N]" ─────────────────────
      const isAtgiTgi =
        system.name.toLowerCase().includes('atgi') || system.name.toLowerCase().includes('tgi');

      let name: string;
      if (isSyntheticMCR2) {
        name = borrowedSysNames.length > 0
          ? `MCR2 (${system.name} + ${borrowedSysNames.join(' + ')})`
          : `MCR2 Espanso (${system.name})`;
      } else if (isAtgiTgi && system.videoMatrix === 'Matrix 2') {
        name = borrowedSysNames.length > 0
          ? `Merged Atgi/Tgi: ${system.name} + ${borrowedSysNames.join(' + ')}`
          : `Merged Atgi/Tgi (Base: ${system.name})`;
      } else {
        name = borrowedSysNames.length > 0
          ? `${system.name} + ${borrowedSysNames.join(' + ')}`
          : `${system.name} + Espansione`;
      }

      // ── Warnings ─────────────────────────────────────────────────────────
      const warnings: string[] = [];

      if (level <= 2) {
        if (expansionResult.hasCrossMatrix) {
          warnings.push('Hardware integrato da altri pool in modo coesivo per soddisfare la richiesta.');
          warnings.push(...expansionResult.warnings);
        } else {
          warnings.push('Hardware integrato da altri pool (stessa matrice) per soddisfare la richiesta.');
        }
      } else {
        warnings.push(
          isSyntheticMCR2
            ? 'Hardware integrato da pool Matrix 2 + Matrix 1 per soddisfare la richiesta sul sistema MCR2.'
            : 'Hardware integrato da altri pool per soddisfare la richiesta. Verificare le concomitanze.'
        );
        warnings.push(...expansionResult.warnings); // tieline warnings from pickMachines
      }

      // Detail borrowed machines grouped by system
      if (borrowDesc) {
        warnings.push(`Macchine aggiunte — ${borrowDesc}.`);
      }

      // Native deficit summary
      const missingParts: string[] = [];
      if (mainReq.cameras > mainCounts.tracers)
        missingParts.push(`${mainReq.cameras - mainCounts.tracers}x Tracers Main`);
      if (mainReq.pgms > mainCounts.integrators)
        missingParts.push(`${mainReq.pgms - mainCounts.integrators}x Integrators Main`);
      if (mainReq.outputs > mainCounts.renderers)
        missingParts.push(`${mainReq.outputs - mainCounts.renderers}x Renderers Main`);
      if (bckReq) {
        if (bckReq.cameras > bckCounts.tracers)
          missingParts.push(`${bckReq.cameras - bckCounts.tracers}x Tracers Bck`);
        if (bckReq.pgms > bckCounts.integrators)
          missingParts.push(`${bckReq.pgms - bckCounts.integrators}x Integrators Bck`);
        if (bckReq.outputs > bckCounts.renderers)
          missingParts.push(`${bckReq.outputs - bckCounts.renderers}x Renderers Bck`);
      }
      if (missingParts.length > 0)
        warnings.push(`🛠 Deficit nativo: Mancano ${missingParts.join(', ')}.`);

      // Conflict on base system
      const conflictingEvent = allEvents
        ? findConflictingEvent(system.id, startMs, endMs, allEvents, event?.id, formData.sessions)
        : undefined;
      if (conflictingEvent)
        warnings.push(`Attenzione: ${system.name} in sovrapposizione con ${conflictingEvent.title}.`);

      // Conflicts on borrowed systems
      borrowedSysNames.forEach(sysName => {
        const borrowedSys = availableSystems.find(s => s.name === sysName);
        if (!borrowedSys) return;
        const borrowedConflict = allEvents
          ? findConflictingEvent(borrowedSys.id, startMs, endMs, allEvents, event?.id, formData.sessions)
          : undefined;
        if (borrowedConflict)
          warnings.push(`Attenzione: ${sysName} in sovrapposizione con ${borrowedConflict.title}.`);
      });

      // Sys6 spare renderer warning
      if (!isSys1(system) && sys6System && sys6System.id !== system.id) {
        const uniqueMainRend = sysMainMs
          .filter(m => m.type === 'Renderer' && m.isAvailable && !(sys6System.machineIds ?? []).includes(m.id))
          .reduce((acc, m) => acc + getInstances(m, resList), 0);
        const uniqueBckRend = filteredBckMs
          .filter(m => m.type === 'Renderer' && m.isAvailable && !(sys6System.machineIds ?? []).includes(m.id))
          .reduce((acc, m) => acc + getInstances(m, resList), 0);
        if (
          (mainReq.outputs > 0 && uniqueMainRend < mainReq.outputs) ||
          (bckReq && bckReq.outputs > 0 && uniqueBckRend < bckReq.outputs)
        ) {
          warnings.push('Uses spare Renderer shared with System 6. Verificare disponibilità.');
        }
      }

      results.push({
        id: `expanded-l${level}-${isSyntheticMCR2 ? 'mcr2' : system.id}`,
        name,
        videoMatrix: system.videoMatrix,
        warnings: [...new Set(warnings)],
        isMerged: true,
        machineIds: [...(system.machineIds ?? []), ...expansionResult.borrowed.map(m => m.id)],
        selectedMachines: expansionResult.borrowed.map(m => ({ id: m.id, name: m.name, type: m.type })),
        conflictEventName: conflictingEvent?.title,
        level,
      });
    };

    // Try same-matrix first (Level 2), fall back to cross-matrix (Level 4)
    const sameMatrixResult = tryExpansion('same');
    if (sameMatrixResult.ok) {
      buildExpansionEntry(sameMatrixResult, 2);
    } else {
      const crossResult = tryExpansion('any');
      buildExpansionEntry(crossResult, crossResult.hasCrossMatrix ? 4 : 2);
    }
  }

  // ── Sort results by level, then by quality within level ─────────────────
  return results.sort((a, b) => {
    // Sys6 always last
    const aIsSys6 = isSys6({ name: a.name } as System);
    const bIsSys6 = isSys6({ name: b.name } as System);
    if (aIsSys6 && !bIsSys6) return 1;
    if (!aIsSys6 && bIsSys6) return -1;

    // Sort by level (lower = better)
    const levelA = a.level ?? 99;
    const levelB = b.level ?? 99;
    if (levelA !== levelB) return levelA - levelB;

    // Within same level: native (non-merged) before expanded
    if (a.isMerged && !b.isMerged) return 1;
    if (!a.isMerged && b.isMerged) return -1;

    // Within non-merged: smaller system first
    if (!a.isMerged && !b.isMerged) {
      const sizeA = (a.machineIds ?? []).length;
      const sizeB = (b.machineIds ?? []).length;
      return sizeA - sizeB || a.name.localeCompare(b.name);
    }

    // Within merged: fewer borrowed machines first
    const extA = a.selectedMachines?.length ?? 0;
    const extB = b.selectedMachines?.length ?? 0;
    if (extA !== extB) return extA - extB;

    return a.name.localeCompare(b.name);
  });
};

export { getRecommendedSystems };
export type { Machine, System, ResourceReq, RecSystem, Gallery, Event };
