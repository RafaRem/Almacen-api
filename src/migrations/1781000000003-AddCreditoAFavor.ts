import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddCreditoAFavor1781000000003 implements MigrationInterface {
  name = 'AddCreditoAFavor1781000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'creditos',
      new TableColumn({
        name: 'credito_a_favor',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
        isNullable: false,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('creditos', 'credito_a_favor')
  }
}
