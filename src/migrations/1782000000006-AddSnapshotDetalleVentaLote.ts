import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSnapshotDetalleVentaLote1782000000006
  implements MigrationInterface
{
  name = 'AddSnapshotDetalleVentaLote1782000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "detalle_venta_lote"
        ADD COLUMN IF NOT EXISTS "precio_unitario" numeric(12,6) NULL,
        ADD COLUMN IF NOT EXISTS "costo_unitario" numeric(12,6) NULL,
        ADD COLUMN IF NOT EXISTS "factor_unidades" integer NULL,
        ADD COLUMN IF NOT EXISTS "iva_tasa" numeric(5,2) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "detalle_venta_lote"
        DROP COLUMN IF EXISTS "iva_tasa",
        DROP COLUMN IF EXISTS "factor_unidades",
        DROP COLUMN IF EXISTS "costo_unitario",
        DROP COLUMN IF EXISTS "precio_unitario"`,
    );
  }
}
