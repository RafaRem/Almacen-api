import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCorteCaja1781000000011 implements MigrationInterface {
  name = 'CreateCorteCaja1781000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear enum para status del corte de caja
    await queryRunner.query(`
      CREATE TYPE "public"."corte_caja_status_enum" AS ENUM('ABIERTA', 'CERRADA')
    `);

    // Crear tabla corte_caja
    await queryRunner.query(`
      CREATE TABLE "corte_caja" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "fecha_apertura" TIMESTAMP NOT NULL,
        "fecha_cierre" TIMESTAMP,
        "status" "corte_caja_status_enum" NOT NULL DEFAULT 'ABIERTA',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_corte_caja" PRIMARY KEY ("id"),
        CONSTRAINT "FK_corte_caja_usuario" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Crear tabla corte_caja_venta
    await queryRunner.query(`
      CREATE TABLE "corte_caja_venta" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "corte_caja_id" uuid NOT NULL,
        "venta_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_corte_caja_venta" PRIMARY KEY ("id"),
        CONSTRAINT "FK_corte_caja_venta_corte" FOREIGN KEY ("corte_caja_id") REFERENCES "corte_caja"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_corte_caja_venta_venta" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_corte_caja_venta_venta" UNIQUE ("venta_id")
      )
    `);

    // Crear índices
    await queryRunner.query(`
      CREATE INDEX "IDX_corte_caja_usuario_id" ON "corte_caja" ("usuario_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_corte_caja_status" ON "corte_caja" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_corte_caja_fecha_apertura" ON "corte_caja" ("fecha_apertura")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_corte_caja_venta_corte_id" ON "corte_caja_venta" ("corte_caja_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_corte_caja_venta_venta_id" ON "corte_caja_venta" ("venta_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_corte_caja_venta_venta_id"`);
    await queryRunner.query(`DROP INDEX "IDX_corte_caja_venta_corte_id"`);
    await queryRunner.query(`DROP INDEX "IDX_corte_caja_fecha_apertura"`);
    await queryRunner.query(`DROP INDEX "IDX_corte_caja_status"`);
    await queryRunner.query(`DROP INDEX "IDX_corte_caja_usuario_id"`);
    await queryRunner.query(`DROP TABLE "corte_caja_venta"`);
    await queryRunner.query(`DROP TABLE "corte_caja"`);
    await queryRunner.query(`DROP TYPE "public"."corte_caja_status_enum"`);
  }
}
