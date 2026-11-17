CREATE UNIQUE INDEX IF NOT EXISTS uq_recepcion_uuidcfdi
  ON recepciones ("uuidCfdi")
  WHERE "uuidCfdi" IS NOT NULL;
