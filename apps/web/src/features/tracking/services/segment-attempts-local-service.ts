import type {
  SegmentAttempt,
  SegmentLeaderboardEntry,
  SegmentAttemptStatus,
} from "@/types/domain";

const STORAGE_KEY = "apex:segment-attempts:v1";

interface SegmentAttemptsStore {
  version: 2;
  attempts: SegmentAttempt[];
  rideAttemptIds: Record<string, string[]>;
}

export interface SegmentAttemptOutcome {
  status: SegmentAttemptStatus;
  attemptId: string;
  segmentId: string;
  elapsedSec: number | null;
  estimatedRank: number | null;
  isPersonalBest: boolean;
}

interface SegmentAttemptsLocalService {
  listAttemptsByRide(rideId: string): SegmentAttempt[];
  listAttemptsBySegment(segmentId: string): SegmentAttempt[];
  saveAttemptsForRide(rideId: string, attempts: SegmentAttempt[]): SegmentAttempt[];
  listPendingAttemptsByRide(rideId: string): SegmentAttempt[];
  markAttemptsSyncState(
    rideId: string,
    attemptIds: string[],
    state: "pending" | "synced" | "failed",
    error?: string | null
  ): void;
  getRideSyncStatus(rideId: string): "synced" | "pending" | null;
  getSegmentLeaderboard(segmentId: string, currentAttemptId?: string): SegmentLeaderboardEntry[];
  getAttemptOutcome(attempt: SegmentAttempt): SegmentAttemptOutcome;
}

const emptyStore: SegmentAttemptsStore = {
  version: 2,
  attempts: [],
  rideAttemptIds: {},
};

export function createSegmentAttemptsLocalService(): SegmentAttemptsLocalService {
  return {
    listAttemptsByRide(rideId) {
      const store = readStore();
      const attemptIds = new Set(store.rideAttemptIds[rideId] ?? []);
      return store.attempts.filter((attempt) => attempt.rideId === rideId || attemptIds.has(attempt.id));
    },

    listAttemptsBySegment(segmentId) {
      const store = readStore();
      return store.attempts.filter((attempt) => attempt.segmentId === segmentId);
    },

    saveAttemptsForRide(rideId, attempts) {
      if (!attempts.length) return [];

      const store = readStore();
      const byId = new Map(store.attempts.map((attempt) => [attempt.id, attempt]));
      const bySyncKey = new Map(store.attempts.map((attempt) => [attempt.syncKey, attempt]));
      const enrichedAttempts: SegmentAttempt[] = [];

      for (const attempt of attempts) {
        const normalizedAttempt = normalizeAttemptForStore(attempt, "pending", null);
        const existing = bySyncKey.get(normalizedAttempt.syncKey) ?? byId.get(normalizedAttempt.id);
        const reconciled = reconcileAttempt(existing, normalizedAttempt);

        const outcome = calculateAttemptOutcome(Array.from(byId.values()), reconciled);
        const withOutcome: SegmentAttempt = {
          ...reconciled,
          metadata: {
            source: reconciled.metadata?.source ?? "post_ride",
            ...(reconciled.metadata ?? {}),
            estimatedRank: outcome.estimatedRank ?? undefined,
            isPersonalBest: outcome.isPersonalBest,
          },
          syncState: "pending",
          syncUpdatedAt: new Date().toISOString(),
          lastSyncError: null,
        };

        if (existing && existing.id !== withOutcome.id) {
          byId.delete(existing.id);
        }

        byId.set(withOutcome.id, withOutcome);
        bySyncKey.set(withOutcome.syncKey, withOutcome);
        enrichedAttempts.push(withOutcome);
      }

      const knownIds = new Set(store.rideAttemptIds[rideId] ?? []);
      for (const attempt of attempts) {
        knownIds.add(attempt.id);
      }

      const nextStore: SegmentAttemptsStore = {
        version: 2,
        attempts: Array.from(byId.values()),
        rideAttemptIds: {
          ...store.rideAttemptIds,
          [rideId]: Array.from(knownIds),
        },
      };

      writeStore(nextStore);
      return enrichedAttempts;
    },

    listPendingAttemptsByRide(rideId) {
      return this.listAttemptsByRide(rideId).filter((attempt) => attempt.syncState !== "synced");
    },

    markAttemptsSyncState(rideId, attemptIds, state, error = null) {
      if (!attemptIds.length) return;

      const store = readStore();
      const trackIds = new Set(store.rideAttemptIds[rideId] ?? []);
      const targetIds = new Set(attemptIds);
      const now = new Date().toISOString();

      const attempts = store.attempts.map((attempt) => {
        if (!trackIds.has(attempt.id) || !targetIds.has(attempt.id)) return attempt;
        return {
          ...attempt,
          syncState: state,
          syncUpdatedAt: now,
          lastSyncError: state === "failed" ? error : null,
        };
      });

      writeStore({
        ...store,
        attempts,
      });
    },

    getRideSyncStatus(rideId) {
      const attempts = this.listAttemptsByRide(rideId);
      if (!attempts.length) return null;

      const hasPending = attempts.some((attempt) => attempt.syncState !== "synced");
      return hasPending ? "pending" : "synced";
    },

    getSegmentLeaderboard(segmentId, currentAttemptId) {
      const store = readStore();
      return buildSegmentLeaderboard(store.attempts, segmentId, currentAttemptId);
    },

    getAttemptOutcome(attempt) {
      const store = readStore();
      return calculateAttemptOutcome(store.attempts, attempt);
    },
  };
}

function calculateAttemptOutcome(history: SegmentAttempt[], candidate: SegmentAttempt): SegmentAttemptOutcome {
  if (candidate.status !== "completed" || !candidate.elapsedSec) {
    return {
      status: candidate.status,
      attemptId: candidate.id,
      segmentId: candidate.segmentId,
      elapsedSec: candidate.elapsedSec,
      estimatedRank: null,
      isPersonalBest: false,
    };
  }

  const completedSameSegment = history.filter(
    (attempt) =>
      attempt.id !== candidate.id &&
      attempt.segmentId === candidate.segmentId &&
      attempt.status === "completed" &&
      typeof attempt.elapsedSec === "number"
  );

  const previousBest = completedSameSegment
    .filter((attempt) => attempt.riderId === candidate.riderId)
    .reduce<number | null>((best, attempt) => {
      const elapsedSec = attempt.elapsedSec;
      if (typeof elapsedSec !== "number") return best;
      if (best === null || elapsedSec < best) return elapsedSec;
      return best;
    }, null);

  const leaderboard = buildSegmentLeaderboard([...history, candidate], candidate.segmentId, candidate.id);
  const candidateEstimatedRank = calculateEstimatedRank(history, candidate);
  const currentEntry = leaderboard.find((row) => row.isCurrentAttempt);

  return {
    status: candidate.status,
    attemptId: candidate.id,
    segmentId: candidate.segmentId,
    elapsedSec: candidate.elapsedSec,
    estimatedRank: currentEntry?.rank ?? candidateEstimatedRank,
    isPersonalBest: previousBest === null || candidate.elapsedSec < previousBest,
  };
}

function calculateEstimatedRank(history: SegmentAttempt[], candidate: SegmentAttempt): number | null {
  if (candidate.status !== "completed" || typeof candidate.elapsedSec !== "number" || candidate.elapsedSec <= 0) {
    return null;
  }

  const candidateElapsed = candidate.elapsedSec;

  const otherRidersBest = buildSegmentLeaderboard(history, candidate.segmentId)
    .filter((entry) => entry.riderId !== candidate.riderId)
    .map((entry) => entry.elapsedTimeSec);

  const fasterOrEqualCount = otherRidersBest.filter((time) => time <= candidateElapsed).length;
  return fasterOrEqualCount + 1;
}

function buildSegmentLeaderboard(
  attempts: SegmentAttempt[],
  segmentId: string,
  currentAttemptId?: string
): SegmentLeaderboardEntry[] {
  const byRiderBest = new Map<string, SegmentAttempt>();

  for (const attempt of attempts) {
    if (
      attempt.segmentId !== segmentId ||
      attempt.status !== "completed" ||
      typeof attempt.elapsedSec !== "number" ||
      attempt.elapsedSec <= 0
    ) {
      continue;
    }

    const currentBest = byRiderBest.get(attempt.riderId);
    if (!currentBest) {
      byRiderBest.set(attempt.riderId, attempt);
      continue;
    }

    if (attempt.elapsedSec < (currentBest.elapsedSec ?? Number.POSITIVE_INFINITY)) {
      byRiderBest.set(attempt.riderId, attempt);
      continue;
    }

    if (attempt.elapsedSec === currentBest.elapsedSec && attempt.recordedAt < currentBest.recordedAt) {
      byRiderBest.set(attempt.riderId, attempt);
    }
  }

  return Array.from(byRiderBest.values())
    .sort((a, b) => {
      const aElapsed = a.elapsedSec ?? Number.POSITIVE_INFINITY;
      const bElapsed = b.elapsedSec ?? Number.POSITIVE_INFINITY;
      if (aElapsed !== bElapsed) return aElapsed - bElapsed;
      return a.recordedAt.localeCompare(b.recordedAt);
    })
    .map((attempt, index) => ({
      rank: index + 1,
      segmentId: attempt.segmentId,
      riderId: attempt.riderId,
      attemptId: attempt.id,
      elapsedTimeSec: attempt.elapsedSec ?? 0,
      recordedAt: attempt.recordedAt,
      isCurrentAttempt: attempt.id === currentAttemptId,
    }));
}

function readStore(): SegmentAttemptsStore {
  if (typeof window === "undefined") return emptyStore;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore;

  try {
    const parsed = JSON.parse(raw) as Partial<SegmentAttemptsStore>;
    if (!Array.isArray(parsed.attempts)) {
      return emptyStore;
    }

    const normalizedAttempts = parsed.attempts.map((attempt) => normalizeAttemptForStore(attempt));

    if (parsed.version !== 2) {
      return {
        version: 2,
        attempts: normalizedAttempts,
        rideAttemptIds:
          parsed.rideAttemptIds && typeof parsed.rideAttemptIds === "object"
            ? parsed.rideAttemptIds
            : {},
      };
    }

    return {
      version: 2,
      attempts: normalizedAttempts,
      rideAttemptIds:
        parsed.rideAttemptIds && typeof parsed.rideAttemptIds === "object"
          ? parsed.rideAttemptIds
          : {},
    };
  } catch {
    return emptyStore;
  }
}

function normalizeAttemptForStore(
  attempt: SegmentAttempt,
  syncState: SegmentAttempt["syncState"] = attempt.syncState ?? "pending",
  lastSyncError: string | null = attempt.lastSyncError ?? null
): SegmentAttempt {
  return {
    ...attempt,
    syncKey: attempt.syncKey || buildSegmentAttemptSyncKey(attempt),
    syncState,
    syncUpdatedAt: attempt.syncUpdatedAt ?? new Date().toISOString(),
    lastSyncError,
  };
}

function reconcileAttempt(existing: SegmentAttempt | undefined, incoming: SegmentAttempt): SegmentAttempt {
  if (!existing) {
    return incoming;
  }

  const winner = chooseStatusWinner(existing.status, incoming.status);
  const keepExistingAsWinner = winner === existing.status && winner !== incoming.status;
  const base = keepExistingAsWinner ? existing : incoming;
  const complement = keepExistingAsWinner ? incoming : existing;

  const existingElapsed = typeof existing.elapsedSec === "number" ? existing.elapsedSec : null;
  const incomingElapsed = typeof incoming.elapsedSec === "number" ? incoming.elapsedSec : null;

  const resolvedElapsed =
    winner === "completed"
      ? selectCompletedElapsed(existingElapsed, incomingElapsed)
      : incomingElapsed ?? existingElapsed ?? null;

  return {
    ...base,
    id: existing.id,
    syncKey: existing.syncKey,
    status: winner,
    elapsedSec: resolvedElapsed,
    startedAt: existing.startedAt <= incoming.startedAt ? existing.startedAt : incoming.startedAt,
    completedAt: incoming.completedAt ?? existing.completedAt,
    progressFinal: Math.max(existing.progressFinal ?? 0, incoming.progressFinal ?? 0),
    distanceInSegmentM: incoming.distanceInSegmentM ?? existing.distanceInSegmentM ?? null,
    reason: winner === "completed" ? null : incoming.reason ?? existing.reason,
    metadata: {
      ...(existing.metadata ?? {}),
      ...(incoming.metadata ?? {}),
      source: incoming.metadata?.source ?? existing.metadata?.source ?? "post_ride",
    },
    recordedAt: incoming.recordedAt >= existing.recordedAt ? incoming.recordedAt : existing.recordedAt,
    syncState: existing.syncState,
    syncUpdatedAt: existing.syncUpdatedAt,
    lastSyncError: complement.lastSyncError ?? existing.lastSyncError ?? null,
  };
}

function chooseStatusWinner(
  existing: SegmentAttemptStatus,
  incoming: SegmentAttemptStatus
): SegmentAttemptStatus {
  const rank: Record<SegmentAttemptStatus, number> = {
    completed: 3,
    abandoned: 2,
    invalid: 1,
  };

  return rank[incoming] >= rank[existing] ? incoming : existing;
}

function selectCompletedElapsed(existing: number | null, incoming: number | null): number | null {
  if (typeof existing !== "number") return incoming;
  if (typeof incoming !== "number") return existing;
  return Math.min(existing, incoming);
}

export function buildSegmentAttemptSyncKey(attempt: Pick<SegmentAttempt, "riderId" | "rideId" | "segmentId" | "startedAt">): string {
  return `${attempt.riderId}:${attempt.rideId}:${attempt.segmentId}:${attempt.startedAt}`;
}

function writeStore(store: SegmentAttemptsStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
