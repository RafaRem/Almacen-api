import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex, TableForeignKey } from 'typeorm'

export class CreateAbono1781000000005 implements MigrationInterface {
  name = 'CreateAbono1781000000005'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'abono',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cuenta_cobrar_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'monto',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'excedente',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'fecha',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'observaciones',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    )

    // Index
    await queryRunner.createIndex(
      'abono',
      new TableIndex({
        name: 'idx_abono_cuenta',
        columnNames: ['cuenta_cobrar_id'],
      }),
    )

    // Foreign key
    await queryRunner.createForeignKey(
      'abono',
      new TableForeignKey({
        name: 'fk_abono_cuenta',
        columnNames: ['cuenta_cobrar_id'],
        referencedTableName: 'cuenta_por_cobrar',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createForeignKey(
      'abono',
      new TableForeignKey({
        name: 'fk_abono_usuario',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('abono', 'fk_abono_usuario')
    await queryRunner.dropForeignKey('abono', 'fk_abono_cuenta')
    await queryRunner.dropIndex('abono', 'idx_abono_cuenta')
    await queryRunner.dropTable('abono')
  }
}
