-- ============================================================
-- Migración 003: plant_id en ai_conversations
-- ============================================================
-- Las rutas de AI ya usan plant_id al insertar conversaciones;
-- esta migración asegura que la columna exista en instalaciones
-- creadas con la versión anterior de database.py.
-- ============================================================

ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_plant_id ON ai_conversations(plant_id);
