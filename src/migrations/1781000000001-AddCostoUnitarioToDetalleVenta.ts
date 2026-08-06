import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddCostoUnitarioToDetalleVenta1781000000001
  implements MigrationInterface
{
  name = 'AddCostoUnitarioToDetalleVenta1781000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'detalle_venta',
      new TableColumn({
        name: 'costounitario',
        type: 'numeric',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    )

    await queryRunner.query(`
      UPDATE detalle_venta dv
      SET costounitario = ia.precio_unitario_lote
      FROM inventario_almacen ia
      WHERE dv.productoid = ia.productoid
        AND dv.loteid = ia.loteid
        AND dv.costounitario IS NULL
        AND ia.precio_unitario_lote > 0
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('detalle_venta', 'costounitario')
  }
}
