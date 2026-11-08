import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFacturaGlobal1781000000013 implements MigrationInterface {
  name = 'CreateFacturaGlobal1781000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS factura_global_folio_seq START 1`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "factura_global" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "periodicidad" varchar(2) NOT NULL,
        "variante" varchar(50) NOT NULL DEFAULT 'publicoGeneral',
        "serie" varchar(10),
        "folio" int,
        "fecha_inicio" date NOT NULL,
        "fecha_fin" date NOT NULL,
        "mes" varchar(2) NOT NULL,
        "anio" int NOT NULL,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "impuestos" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "uuid" varchar(36),
        "facturapi_id" varchar(64),
        "xml_path" varchar(500),
        "pdf_path" varchar(500),
        "estado" varchar(20) NOT NULL DEFAULT 'BORRADOR',
        "fecha_timbrado" timestamp,
        "cancelacion_motivo" varchar(2),
        "fecha_cancelacion" timestamp,
        "usuario_id" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_factura_global" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "factura_global_detalle" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "factura_global_id" uuid NOT NULL,
        "venta_id" uuid NOT NULL,
        "folio" int NOT NULL,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "iva" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_factura_global_detalle" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fg_detalle_factura" FOREIGN KEY ("factura_global_id")
          REFERENCES "factura_global"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fg_detalle_venta" FOREIGN KEY ("venta_id")
          REFERENCES "ventas"("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_fg_detalle_venta_activa"
        ON "factura_global_detalle" ("venta_id") WHERE "activo"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fg_detalle_factura"
        ON "factura_global_detalle" ("factura_global_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_fg_fechas"
        ON "factura_global" ("fecha_inicio", "fecha_fin")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "factura_global_detalle"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "factura_global"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "factura_global_folio_seq"`);
  }
}
