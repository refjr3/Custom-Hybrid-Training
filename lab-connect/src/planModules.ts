import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

async function importFromRepo<T>(relativePath: string): Promise<T> {
  const href = pathToFileURL(join(REPO_ROOT, relativePath)).href;
  return import(href) as Promise<T>;
}

type PlanModules = {
  getActiveVariantId: (supabase: unknown, userId: string) => Promise<string | null>;
  applyTrainingVariantFilter: (query: unknown, activeVariantId: string | null) => unknown;
  matchSessionsToActivities: (
    supabase: unknown,
    userId: string,
    weeks: unknown[]
  ) => Promise<Map<string, Record<string, unknown>>>;
  getCompletionState: (
    day: Record<string, unknown>,
    matches: Map<string, Record<string, unknown>>
  ) => { complete: boolean; source?: string };
};

let modulesPromise: Promise<PlanModules> | null = null;

export function loadPlanModules(): Promise<PlanModules> {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      importFromRepo<{
        getActiveVariantId: PlanModules["getActiveVariantId"];
        applyTrainingVariantFilter: PlanModules["applyTrainingVariantFilter"];
      }>("api/lib/getActiveVariant.js"),
      importFromRepo<{
        matchSessionsToActivities: PlanModules["matchSessionsToActivities"];
        getCompletionState: PlanModules["getCompletionState"];
      }>("src/features/plan/lib/sessionActivityMatcher.js"),
    ]).then(([variantMod, matcherMod]) => ({
      getActiveVariantId: variantMod.getActiveVariantId,
      applyTrainingVariantFilter: variantMod.applyTrainingVariantFilter,
      matchSessionsToActivities: matcherMod.matchSessionsToActivities,
      getCompletionState: matcherMod.getCompletionState,
    }));
  }
  return modulesPromise;
}
