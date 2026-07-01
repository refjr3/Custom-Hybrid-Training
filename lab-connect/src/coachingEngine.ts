import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

async function importFromRepo<T>(relativePath: string): Promise<T> {
  const href = pathToFileURL(join(REPO_ROOT, relativePath)).href;
  return import(href) as Promise<T>;
}

type CoachingEngine = {
  buildAthleteStateSnapshot: (
    supabase: unknown,
    userId: string,
    asOfDate?: string | null,
    options?: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  interpretPhysiologicalStates: (
    snapshot: Record<string, unknown>
  ) => Record<string, unknown>;
  evaluateTrainingCompatibility: (
    states: Record<string, unknown>,
    snapshot: Record<string, unknown>
  ) => {
    state: "green" | "yellow" | "red";
    label: string;
    rationale: string;
    confidence: { label: string; score: number; reason: string };
    signalsConsidered: Array<{ name: string; value: unknown; status: string }>;
  };
};

let enginePromise: Promise<CoachingEngine> | null = null;

export function loadCoachingEngine(): Promise<CoachingEngine> {
  if (!enginePromise) {
    enginePromise = Promise.all([
      importFromRepo<{ buildAthleteStateSnapshot: CoachingEngine["buildAthleteStateSnapshot"] }>(
        "src/features/coaching/lib/snapshotBuilder.js"
      ),
      importFromRepo<{ interpretPhysiologicalStates: CoachingEngine["interpretPhysiologicalStates"] }>(
        "src/features/coaching/lib/physiologicalInterpreter.js"
      ),
      importFromRepo<{ evaluateTrainingCompatibility: CoachingEngine["evaluateTrainingCompatibility"] }>(
        "src/features/coaching/lib/decisionEngine.js"
      ),
    ]).then(([snapshotMod, interpreterMod, engineMod]) => ({
      buildAthleteStateSnapshot: snapshotMod.buildAthleteStateSnapshot,
      interpretPhysiologicalStates: interpreterMod.interpretPhysiologicalStates,
      evaluateTrainingCompatibility: engineMod.evaluateTrainingCompatibility,
    }));
  }
  return enginePromise;
}
