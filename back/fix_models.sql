-- Script para corregir modelos que no están marcados como default
-- Ejecutar en la base de datos PostgreSQL

-- 1. Ver el estado actual de los modelos
SELECT 
    id,
    plant_type,
    name,
    is_default,
    created_at,
    updated_at
FROM plant_models
WHERE plant_type IN ('Dólar', 'Ficus')
ORDER BY plant_type, created_at DESC;

-- 2. Marcar el modelo más reciente de cada tipo como default
-- (Solo si no hay ningún default actualmente)
UPDATE plant_models pm1
SET is_default = TRUE, updated_at = NOW()
WHERE pm1.id IN (
    SELECT DISTINCT ON (plant_type) id
    FROM plant_models
    WHERE plant_type IN ('Dólar', 'Ficus')
      AND NOT EXISTS (
          SELECT 1 
          FROM plant_models pm2 
          WHERE pm2.plant_type = plant_models.plant_type 
            AND pm2.is_default = TRUE
      )
    ORDER BY plant_type, created_at DESC
)
RETURNING id, plant_type, name, is_default;

-- 3. Si hay múltiples defaults para el mismo tipo, dejar solo el más reciente
-- Primero, desmarcar los más antiguos
UPDATE plant_models pm1
SET is_default = FALSE, updated_at = NOW()
WHERE pm1.id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            plant_type,
            ROW_NUMBER() OVER (PARTITION BY plant_type ORDER BY created_at DESC) as rn
        FROM plant_models
        WHERE plant_type IN ('Dólar', 'Ficus') AND is_default = TRUE
    ) sub
    WHERE rn > 1
)
RETURNING id, plant_type, name, is_default;

-- 4. Verificar el resultado final
SELECT 
    plant_type,
    COUNT(*) as total,
    COUNT(CASE WHEN is_default = TRUE THEN 1 END) as defaults,
    STRING_AGG(
        CASE WHEN is_default = TRUE THEN name || ' (ID: ' || id || ')' END, 
        ', '
    ) as default_models
FROM plant_models
WHERE plant_type IN ('Dólar', 'Ficus')
GROUP BY plant_type;
