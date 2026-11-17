import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueRecepcionUuidCfdi1782000000005
  implements MigrationInterface
{
  name = 'UniqueRecepcionUuidCfdi1782000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_recepcion_uuidcfdi"
       ON "recepciones" ("uuidCfdi")
       WHERE "uuidCfdi" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_recepcion_uuidcfdi"`);
  }
}
