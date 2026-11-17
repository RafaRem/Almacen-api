import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFiscalSnapshotVentaFactura1782000000004
  implements MigrationInterface
{
  name = 'AddFiscalSnapshotVentaFactura1782000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "detalle_venta"
        ADD COLUMN IF NOT EXISTS "presentacion_alias" character varying(80) NULL,
        ADD COLUMN IF NOT EXISTS "tipo_presentacion" character varying(20) NULL,
        ADD COLUMN IF NOT EXISTS "clave_unidad" character varying(20) NULL,
        ADD COLUMN IF NOT EXISTS "unidad" character varying(20) NULL,
        ADD COLUMN IF NOT EXISTS "iva_tasa" numeric(5,2) NULL,
        ADD COLUMN IF NOT EXISTS "iva_importe" numeric(12,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "factura_detalles"
        ADD COLUMN IF NOT EXISTS "factor_unidades" integer NULL,
        ADD COLUMN IF NOT EXISTS "cantidad_base" integer NULL,
        ADD COLUMN IF NOT EXISTS "tipo_presentacion" character varying(20) NULL,
        ADD COLUMN IF NOT EXISTS "presentacion_alias" character varying(80) NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_factura_venta_activa"
       ON "facturas" ("ventaid")
       WHERE "ventaid" IS NOT NULL AND "statusId" IN (1, 2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_factura_venta_activa"`);
    await queryRunner.query(
      `ALTER TABLE "factura_detalles"
        DROP COLUMN IF EXISTS "presentacion_alias",
        DROP COLUMN IF EXISTS "tipo_presentacion",
        DROP COLUMN IF EXISTS "cantidad_base",
        DROP COLUMN IF EXISTS "factor_unidades"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta"
        DROP COLUMN IF EXISTS "iva_importe",
        DROP COLUMN IF EXISTS "iva_tasa",
        DROP COLUMN IF EXISTS "unidad",
        DROP COLUMN IF EXISTS "clave_unidad",
        DROP COLUMN IF EXISTS "tipo_presentacion",
        DROP COLUMN IF EXISTS "presentacion_alias"`,
    );
  }
}
