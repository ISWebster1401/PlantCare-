-- Script para diagnosticar problemas con asignación de modelos 3D
-- Ejecutar en la base de datos PostgreSQL

-- 1. Ver todos los modelos 3D registrados
SELECT 
    id,
    plant_type,
    name,
    is_default,
    model_3d_url,
    default_render_url,
    created_at,
    updated_at
FROM plant_models
ORDER BY plant_type, is_default DESC, created_at DESC;

-- 2. Ver modelos marcados como default por tipo
SELECT 
    plant_type,
    COUNT(*) as total_models,
    COUNT(CASE WHEN is_default = TRUE THEN 1 END) as default_models,
    STRING_AGG(
        CASE WHEN is_default = TRUE THEN name || ' (ID: ' || id || ')' END, 
        ', '
    ) as default_model_names
FROM plant_models
GROUP BY plant_type
ORDER BY plant_type;

-- 3. Ver las últimas plantas creadas y sus modelos asignados
SELECT 
    p.id as plant_id,
    p.plant_name,
    p.plant_type,
    p.created_at,
    pma.model_id as assigned_model_id,
    pm.plant_type as model_plant_type,
    pm.name as model_name,
    pm.is_default as model_is_default,
    pm.model_3d_url
FROM plants p
LEFT JOIN plant_model_assignments pma ON p.id = pma.plant_id
LEFT JOIN plant_models pm ON pma.model_id = pm.id
ORDER BY p.created_at DESC
LIMIT 20;

-- 4. Verificar si hay plantas sin modelo asignado
SELECT 
    p.id,
    p.plant_name,
    p.plant_type,
    p.created_at
FROM plants p
LEFT JOIN plant_model_assignments pma ON p.id = pma.plant_id
WHERE pma.id IS NULL
ORDER BY p.created_at DESC;

-- 5. Verificar modelos por tipo específico (Dólar y Ficus)
SELECT 
    id,
    plant_type,
    name,
    is_default,
    model_3d_url,
    created_at,
    updated_at
FROM plant_models
WHERE plant_type IN ('Dólar', 'Ficus', 'Planta')
ORDER BY plant_type, is_default DESC, created_at DESC;

-- 6. Verificar asignaciones recientes
SELECT 
    pma.id as assignment_id,
    pma.plant_id,
    p.plant_name,
    p.plant_type as plant_type_from_plant,
    pma.model_id,
    pm.plant_type as model_plant_type,
    pm.name as model_name,
    pm.is_default,
    pma.created_at
FROM plant_model_assignments pma
JOIN plants p ON pma.plant_id = p.id
LEFT JOIN plant_models pm ON pma.model_id = pm.id
ORDER BY pma.created_at DESC
LIMIT 20;
