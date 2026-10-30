import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFacturapiFieldsToFacturas1781000000012
  implements MigrationInterface
{
  name = 'AddFacturapiFieldsToFacturas1781000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "facturas"
        ADD COLUMN IF NOT EXISTS "facturapiid" varchar(64) NULL,
        ADD COLUMN IF NOT EXISTS "cancelacionmotivo" varchar(2) NULL,
        ADD COLUMN IF NOT EXISTS "fechacancelacion" TIMESTAMP NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_facturas_facturapiid"
        ON "facturas" ("facturapiid")
        WHERE "facturapiid" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_facturas_facturapiid"`,
    );
    await queryRunner.query(`
      ALTER TABLE "facturas"
        DROP COLUMN IF EXISTS "facturapiid",
        DROP COLUMN IF EXISTS "cancelacionmotivo",
        DROP COLUMN IF EXISTS "fechacancelacion"
    `);
  }
}
