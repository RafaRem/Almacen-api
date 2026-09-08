import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddFormaPagoToAbono1781000000009 implements MigrationInterface {
  name = 'AddFormaPagoToAbono1781000000009'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'abono',
      new TableColumn({
        name: 'forma_pago',
        type: 'varchar',
        length: '10',
        isNullable: true,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('abono', 'forma_pago')
  }
}
