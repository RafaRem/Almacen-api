import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClaseToClienteAndClasesPermitidasToProducto1781000000010 implements MigrationInterface {
  name = 'AddClaseToClienteAndClasesPermitidasToProducto1781000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add clase column to clientes table
    await queryRunner.query(`
      ALTER TABLE "cliente" 
      ADD COLUMN "clase" VARCHAR(10) DEFAULT 'B' NULL
    `);

    // Set default 'B' (General) for existing clientes without clase
    await queryRunner.query(`
      UPDATE "cliente" SET "clase" = 'B' WHERE "clase" IS NULL
    `);

    // Add clases_permitidas column to productos table
    await queryRunner.query(`
      ALTER TABLE "productos" 
      ADD COLUMN "clases_permitidas" TEXT[] NULL
    `);

    // Note: productos with NULL clases_permitidas are available to all (General behavior)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "productos" DROP COLUMN "clases_permitidas"
    `);
    await queryRunner.query(`
      ALTER TABLE "cliente" DROP COLUMN "clase"
    `);
  }
}
