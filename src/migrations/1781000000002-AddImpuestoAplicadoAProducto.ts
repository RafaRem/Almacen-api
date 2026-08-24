import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddImpuestoAplicadoAProducto1781000000002
  implements MigrationInterface
{
  name = 'AddImpuestoAplicadoAProducto1781000000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'productos',
      new TableColumn({
        name: 'impuestoAplicado',
        type: 'varchar',
        length: '2',
        default: '"00"',
        isNullable: true,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('productos', 'impuestoAplicado')
  }
}