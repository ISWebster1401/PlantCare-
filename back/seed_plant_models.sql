-- ============================================================
-- SCRIPT DE DATOS INICIALES: Modelos 3D Predeterminados
-- ============================================================
-- Inserta solo los modelos 3D que existen realmente en Supabase Storage
-- (proyecto PlantCare-v2 / axahnwmfguujxkelmolu, generados con meshy.ai).
-- Los tipos de planta sin modelo quedan sin fila: la app muestra su
-- fallback 2D y _assign_default_model no les asigna nada.
--
-- Para agregar un modelo nuevo: subir el .glb al bucket 'plantcare'
-- (carpeta 3d_models/), agregar la fila aquí y, si el tipo es nuevo,
-- mapearlo en _normalize_plant_type (back/app/api/routes/plants.py).
--
-- IMPORTANTE: Ejecutar después de crear las tablas plant_models,
-- plant_model_assignments, y plant_accessory_assignments.
-- ============================================================

INSERT INTO plant_models (plant_type, name, model_3d_url, default_render_url, is_default, metadata)
VALUES
    (
        'Cactus',
        'Cactus Default',
        'https://axahnwmfguujxkelmolu.supabase.co/storage/v1/object/public/plantcare/3d_models/cactus_default.glb',
        NULL,
        TRUE,
        '{"category": "succulent", "scale": 1.0}'::jsonb
    ),
    (
        'Amapola',
        'Amapola de California',
        'https://axahnwmfguujxkelmolu.supabase.co/storage/v1/object/public/plantcare/3d_models/amapola_california_default.glb',
        NULL,
        TRUE,
        '{"category": "flower", "scale": 1.0}'::jsonb
    )
ON CONFLICT DO NOTHING;

-- Verificar inserción
SELECT
    plant_type,
    name,
    model_3d_url,
    is_default,
    created_at
FROM plant_models
ORDER BY plant_type;
