export async function getActiveVariantId(supabase, userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from("plan_variants")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return data?.id || null;
}

/** Scope training_* rows to the active plan variant, or legacy null variant_id. */
export function applyTrainingVariantFilter(query, activeVariantId) {
  if (activeVariantId) {
    return query.or(`variant_id.eq.${activeVariantId},variant_id.is.null`);
  }
  return query.is("variant_id", null);
}
