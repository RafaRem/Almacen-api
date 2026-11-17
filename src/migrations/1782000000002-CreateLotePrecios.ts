import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLotePrecios1782000000002 implements MigrationInterface {
  name = 'CreateLotePrecios1782000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lote_precios" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "productoid" uuid NOT NULL,
        "loteid" uuid NOT NULL,
        "presentacionid" uuid NOT NULL,
        "precio_venta" numeric(10,2) NOT NULL,
        "status_id" smallint NOT NULL DEFAULT 1,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lote_precios" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lote_precios_producto" FOREIGN KEY ("productoid") REFERENCES "productos"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lote_precios_lote" FOREIGN KEY ("loteid") REFERENCES "lotes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lote_precios_presentacion" FOREIGN KEY ("presentacionid") REFERENCES "producto_presentaciones"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_lote_precio_presentacion" ON "lote_precios" ("loteid", "presentacionid")`,
    );
    await queryRunner.query(`
      CREATE TABLE "lote_precio_historial" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "lote_precio_id" uuid NOT NULL,
        "precio_anterior" numeric(10,2) NULL,
        "precio_nuevo" numeric(10,2) NOT NULL,
        "usuario_id" uuid NULL,
        "motivo" character varying(250) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lote_precio_historial" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "lote_precio_historial"`);
    await queryRunner.query(`DROP INDEX "public"."uq_lote_precio_presentacion"`);
    await queryRunner.query(`DROP TABLE "lote_precios"`);
  }
}
