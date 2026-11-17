import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAliasToProductoPresentaciones1782000000003
  implements MigrationInterface
{
  name = 'AddAliasToProductoPresentaciones1782000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "producto_presentaciones" ADD COLUMN "alias" character varying(80) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "producto_presentaciones" DROP COLUMN "alias"`,
    );
  }
}
