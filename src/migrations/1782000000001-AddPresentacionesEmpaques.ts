import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPresentacionesEmpaques1782000000001
  implements MigrationInterface
{
  name = 'AddPresentacionesEmpaques1782000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."empaque_estado_enum" AS ENUM('PENDIENTE_FACTOR', 'FACTOR_ASIGNADO', 'CONVIRTIENDO', 'CONVERTIDO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."producto_presentaciones_tipo_enum" AS ENUM('PIEZA', 'CAJA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."producto_presentaciones_statusid_enum" AS ENUM('1', '2')`,
    );

    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN "piezas_por_caja_default" integer NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN "empaque_estado" "public"."empaque_estado_enum" NOT NULL DEFAULT 'PENDIENTE_FACTOR'`,
    );

    await queryRunner.query(
      `ALTER TABLE "lotes" ADD COLUMN "piezas_por_caja" integer NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "lotes" ADD COLUMN "empaque_convertido" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(
      `ALTER TABLE "inventario_almacen" ADD COLUMN "precio_venta_caja" numeric(10,2) NULL`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_inventario_precio_change" ON "inventario_almacen"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_inventario_precio_insert" ON "inventario_almacen"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventario_almacen" ALTER COLUMN "precio_unitario_lote" TYPE numeric(12,6) USING "precio_unitario_lote"::numeric(12,6)`,
    );

    await queryRunner.query(
      `ALTER TABLE "detalle_venta" ADD COLUMN "presentacionid" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta" ADD COLUMN "factor_unidades" integer NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta" ADD COLUMN "cantidad_base" integer NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta" ALTER COLUMN "costounitario" TYPE numeric(12,6) USING "costounitario"::numeric(12,6)`,
    );

    await queryRunner.query(
      `ALTER TABLE "detalle_orden_compra" ADD COLUMN "presentacionid" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_orden_compra" ADD COLUMN "factor_unidades" integer NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "factura_detalles" ADD COLUMN "presentacionid" uuid NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "producto_presentaciones" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "productoid" uuid NOT NULL,
        "nombre" character varying(80) NOT NULL,
        "tipo" "public"."producto_presentaciones_tipo_enum" NOT NULL,
        "factor_unidades" integer NOT NULL,
        "codigo_barras" character varying NULL,
        "es_default" boolean NOT NULL DEFAULT false,
        "statusid" "public"."producto_presentaciones_statusid_enum" NOT NULL DEFAULT '1',
        "createdat" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedat" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_producto_presentaciones" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_producto_presentaciones_codigo_barras" UNIQUE ("codigo_barras"),
        CONSTRAINT "FK_producto_presentaciones_producto" FOREIGN KEY ("productoid") REFERENCES "productos"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_presentacion_producto_tipo" ON "producto_presentaciones" ("productoid", "tipo")`,
    );

    await queryRunner.query(
      `ALTER TABLE "detalle_venta" ADD CONSTRAINT "FK_detalle_venta_presentacion" FOREIGN KEY ("presentacionid") REFERENCES "producto_presentaciones"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_orden_compra" ADD CONSTRAINT "FK_detalle_orden_compra_presentacion" FOREIGN KEY ("presentacionid") REFERENCES "producto_presentaciones"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "factura_detalles" ADD CONSTRAINT "FK_factura_detalles_presentacion" FOREIGN KEY ("presentacionid") REFERENCES "producto_presentaciones"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "factura_detalles" DROP CONSTRAINT "FK_factura_detalles_presentacion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_orden_compra" DROP CONSTRAINT "FK_detalle_orden_compra_presentacion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta" DROP CONSTRAINT "FK_detalle_venta_presentacion"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_presentacion_producto_tipo"`);
    await queryRunner.query(`DROP TABLE "producto_presentaciones"`);

    await queryRunner.query(
      `ALTER TABLE "factura_detalles" DROP COLUMN "presentacionid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_orden_compra" DROP COLUMN "factor_unidades"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_orden_compra" DROP COLUMN "presentacionid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta" ALTER COLUMN "costounitario" TYPE numeric(10,2) USING "costounitario"::numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta" DROP COLUMN "cantidad_base"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta" DROP COLUMN "factor_unidades"`,
    );
    await queryRunner.query(
      `ALTER TABLE "detalle_venta" DROP COLUMN "presentacionid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventario_almacen" ALTER COLUMN "precio_unitario_lote" TYPE numeric(10,2) USING "precio_unitario_lote"::numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventario_almacen" DROP COLUMN "precio_venta_caja"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lotes" DROP COLUMN "empaque_convertido"`,
    );
    await queryRunner.query(`ALTER TABLE "lotes" DROP COLUMN "piezas_por_caja"`);
    await queryRunner.query(
      `ALTER TABLE "productos" DROP COLUMN "empaque_estado"`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" DROP COLUMN "piezas_por_caja_default"`,
    );

    await queryRunner.query(
      `DROP TYPE "public"."producto_presentaciones_statusid_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."producto_presentaciones_tipo_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."empaque_estado_enum"`);
  }
}
