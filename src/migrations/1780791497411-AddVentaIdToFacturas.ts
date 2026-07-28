import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVentaIdToFacturas1780791497411 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "facturas" ADD COLUMN "ventaid" uuid NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "facturas" DROP COLUMN "ventaid"`,
    );
  }
}
