-- ============================================================
-- SCRIPT DE DATOS INICIALES: Modelos 3D Predeterminados
-- ============================================================
-- Este script inserta modelos 3D base para tipos de plantas comunes.
-- Las URLs son placeholders que deben reemplazarse con URLs reales de Supabase Storage.
-- 
-- IMPORTANTE: Ejecutar este script después de crear las tablas plant_models,
-- plant_model_assignments, y plant_accessory_assignments.
-- ============================================================

-- Insertar modelos 3D predeterminados (idempotente - ON CONFLICT DO NOTHING)
INSERT INTO plant_models (plant_type, name, model_3d_url, default_render_url, is_default, metadata)
VALUES
    -- Cactus
    (
        'Cactus',
        'Cactus Default',
        'PLACEHOLDER_upload_to_supabase/cactus_default.glb',
        'PLACEHOLDER_upload_to_supabase/cactus_default_render.jpg',
        TRUE,
        '{"category": "succulent", "scale": 1.0}'::jsonb
    ),
    -- Suculenta
    (
        'Suculenta',
        'Suculenta Default',
        'PLACEHOLDER_upload_to_supabase/suculenta_default.glb',
        'PLACEHOLDER_upload_to_supabase/suculenta_default_render.jpg',
        TRUE,
        '{"category": "succulent", "scale": 1.0}'::jsonb
    ),
    -- Monstera
    (
        'Monstera',
        'Monstera Default',
        'PLACEHOLDER_upload_to_supabase/monstera_default.glb',
        'PLACEHOLDER_upload_to_supabase/monstera_default_render.jpg',
        TRUE,
        '{"category": "tropical", "scale": 1.2}'::jsonb
    ),
    -- Helecho
    (
        'Helecho',
        'Helecho Default',
        'PLACEHOLDER_upload_to_supabase/helecho_default.glb',
        'PLACEHOLDER_upload_to_supabase/helecho_default_render.jpg',
        TRUE,
        '{"category": "fern", "scale": 1.1}'::jsonb
    ),
    -- Rosa
    (
        'Rosa',
        'Rosa Default',
        'PLACEHOLDER_upload_to_supabase/rosa_default.glb',
        'PLACEHOLDER_upload_to_supabase/rosa_default_render.jpg',
        TRUE,
        '{"category": "flower", "scale": 0.8}'::jsonb
    ),
    -- Planta Genérica (fallback para cualquier tipo no mapeado)
    (
        'Planta',
        'Planta Genérica',
        'PLACEHOLDER_upload_to_supabase/planta_generica.glb',
        'PLACEHOLDER_upload_to_supabase/planta_generica_render.jpg',
        TRUE,
        '{"category": "generic", "scale": 1.0}'::jsonb
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

