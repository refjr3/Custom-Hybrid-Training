-- Create Rafael's existing plan as the default variant + link all his training rows
DO $$
DECLARE
  v_variant_id uuid;
BEGIN
  INSERT INTO plan_variants (user_id, variant_name, variant_source, block_length_weeks, is_active)
  VALUES (
    '5285440e-a3dd-4f29-9b09-29715f0a04fc',
    'HYROX 12-Week Block (Current)',
    'manual',
    12,
    true
  )
  RETURNING id INTO v_variant_id;

  UPDATE training_blocks SET variant_id = v_variant_id
  WHERE user_id = '5285440e-a3dd-4f29-9b09-29715f0a04fc' AND variant_id IS NULL;

  UPDATE training_weeks SET variant_id = v_variant_id
  WHERE user_id = '5285440e-a3dd-4f29-9b09-29715f0a04fc' AND variant_id IS NULL;

  UPDATE training_days SET variant_id = v_variant_id
  WHERE user_id = '5285440e-a3dd-4f29-9b09-29715f0a04fc' AND variant_id IS NULL;
END $$;
