ALTER TABLE detalle_lote
  ADD COLUMN IF NOT EXISTS piezas_por_caja_snapshot integer NULL;

CREATE OR REPLACE FUNCTION set_detalle_lote_factor_snapshot()
RETURNS trigger AS $$
BEGIN
  IF NEW.piezas_por_caja_snapshot IS NULL THEN
    SELECT l.piezas_por_caja
      INTO NEW.piezas_por_caja_snapshot
      FROM lotes l
     WHERE l.id = NEW."loteId";
  END IF;

  IF NEW.piezas_por_caja_snapshot IS NULL OR NEW.piezas_por_caja_snapshot < 1 THEN
    NEW.piezas_por_caja_snapshot := 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_detalle_lote_factor_snapshot ON detalle_lote;
CREATE TRIGGER trg_detalle_lote_factor_snapshot
BEFORE INSERT ON detalle_lote
FOR EACH ROW
EXECUTE FUNCTION set_detalle_lote_factor_snapshot();

CREATE OR REPLACE FUNCTION protect_detalle_lote_factor_snapshot()
RETURNS trigger AS $$
BEGIN
  IF OLD.piezas_por_caja_snapshot IS NOT NULL
     AND NEW.piezas_por_caja_snapshot IS DISTINCT FROM OLD.piezas_por_caja_snapshot THEN
    RAISE EXCEPTION 'El snapshot de piezas por caja es inmutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_detalle_lote_factor_snapshot_immutable ON detalle_lote;
CREATE TRIGGER trg_detalle_lote_factor_snapshot_immutable
BEFORE UPDATE OF piezas_por_caja_snapshot ON detalle_lote
FOR EACH ROW
EXECUTE FUNCTION protect_detalle_lote_factor_snapshot();
