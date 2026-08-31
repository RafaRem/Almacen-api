import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex, TableForeignKey } from 'typeorm'

export class CreateCuentaPorCobrar1781000000004 implements MigrationInterface {
  name = 'CreateCuentaPorCobrar1781000000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Status enum: 1=PENDIENTE, 2=PAGADA, 3=VENCIDA, 4=CANCELADA
    await queryRunner.createTable(
      new Table({
        name: 'cuenta_por_cobrar',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cliente_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'venta_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'monto_original',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'monto_pendiente',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'credito_a_favor',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'id_status',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'fecha_vencimiento',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'observaciones',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    )

    // Indexes
    await queryRunner.createIndex(
      'cuenta_por_cobrar',
      new TableIndex({
        name: 'idx_cuenta_cliente',
        columnNames: ['cliente_id'],
      }),
    )

    await queryRunner.createIndex(
      'cuenta_por_cobrar',
      new TableIndex({
        name: 'idx_cuenta_status',
        columnNames: ['id_status'],
      }),
    )

    await queryRunner.createIndex(
      'cuenta_por_cobrar',
      new TableIndex({
        name: 'idx_cuenta_venta',
        columnNames: ['venta_id'],
      }),
    )

    // Foreign keys
    await queryRunner.createForeignKey(
      'cuenta_por_cobrar',
      new TableForeignKey({
        name: 'fk_cuenta_cliente',
        columnNames: ['cliente_id'],
        referencedTableName: 'cliente',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createForeignKey(
      'cuenta_por_cobrar',
      new TableForeignKey({
        name: 'fk_cuenta_venta',
        columnNames: ['venta_id'],
        referencedTableName: 'ventas',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('cuenta_por_cobrar', 'fk_cuenta_venta')
    await queryRunner.dropForeignKey('cuenta_por_cobrar', 'fk_cuenta_cliente')
    await queryRunner.dropIndex('cuenta_por_cobrar', 'idx_cuenta_venta')
    await queryRunner.dropIndex('cuenta_por_cobrar', 'idx_cuenta_status')
    await queryRunner.dropIndex('cuenta_por_cobrar', 'idx_cuenta_cliente')
    await queryRunner.dropTable('cuenta_por_cobrar')
  }
}
