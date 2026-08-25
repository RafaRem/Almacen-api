import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportesService } from './reportes.service';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { DocumentoCliente } from '../uploads/entities/documento-cliente.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';

const mockQueryBuilder = {
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getManyAndCount: jest.fn(),
};

const mockRepository = {
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
  find: jest.fn(),
  findOne: jest.fn(),
};

describe('ReportesService', () => {
  let service: ReportesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: getRepositoryToken(Producto), useValue: mockRepository },
        { provide: getRepositoryToken(Lote), useValue: mockRepository },
        { provide: getRepositoryToken(DocumentoCliente), useValue: mockRepository },
        { provide: getRepositoryToken(Venta), useValue: mockRepository },
        { provide: getRepositoryToken(DetalleVenta), useValue: mockRepository },
        { provide: getRepositoryToken(Cliente), useValue: mockRepository },
        { provide: getRepositoryToken(InventarioAlmacen), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
  });

  describe('getVentasMensuales()', () => {
    it('muestra "Cliente General" para ventas sin cliente', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          cliente_nombre: 'Cliente General',
          mes: 8,
          total_ventas: '1200.00',
          cantidad_ventas: '3',
        },
      ]);

      const result = await service.getVentasMensuales({ year: 2026 });

      expect(result).toHaveLength(1);
      expect(result[0].cliente_nombre).toBe('Cliente General');
      expect(result[0].total_ventas).toBe('1200.00');
    });

    it('agrupa ventas de clientes reales por nombre completo', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          cliente_nombre: 'Juan Perez',
          mes: 3,
          total_ventas: '500.00',
          cantidad_ventas: '1',
        },
      ]);

      const result = await service.getVentasMensuales({ year: 2026 });

      expect(result[0].cliente_nombre).toBe('Juan Perez');
    });
  });

  describe('getVentasPorCliente()', () => {
    it('acepta "Cliente General" y filtra ventas sin cliente', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getVentasPorCliente({
        clienteNombre: 'Cliente General',
      });

      const call = mockQueryBuilder.andWhere.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('cliente.id IS NULL'),
      );
      expect(call).toBeDefined();
    });

    it('no filtra mostrador para un cliente real', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getVentasPorCliente({
        clienteNombre: 'Juan',
      });

      const nullCall = mockQueryBuilder.andWhere.mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('cliente.id IS NULL'),
      );
      expect(nullCall).toBeUndefined();
    });
  });

  describe('getResumenClientes()', () => {
    const findClienteCall = (params: any) =>
      mockQueryBuilder.andWhere.mock.calls.find((c: any[]) => c[1]?.esMostrador !== undefined)?.[1];

    it('acepta "VENTA MOSTRADOR" como término de mostrador (case-insensitive)', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getResumenClientes({
        fechaFrom: '2026-01-01',
        fechaTo: '2026-12-31',
        clienteNombre: 'VENTA MOSTRADOR',
      });

      expect(findClienteCall(mockQueryBuilder.andWhere.mock.calls)).toEqual({ nombre: '%venta mostrador%', esMostrador: true });
    });

    it('acepta "mostrador" y "cliente general" como mostrador', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getResumenClientes({
        fechaFrom: '2026-01-01',
        fechaTo: '2026-12-31',
        clienteNombre: 'cliente general',
      });

      expect(findClienteCall(mockQueryBuilder.andWhere.mock.calls)).toEqual({ nombre: '%cliente general%', esMostrador: true });
    });

    it('no marca esMostrador para un cliente real', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getResumenClientes({
        fechaFrom: '2026-01-01',
        fechaTo: '2026-12-31',
        clienteNombre: 'Juan',
      });

      expect(findClienteCall(mockQueryBuilder.andWhere.mock.calls)).toEqual({ nombre: '%juan%', esMostrador: false });
    });

    it('asigna Cliente General y RFC genérico a filas sin cliente', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          cliente_id: null,
          cliente_nombre: null,
          rfc: null,
          categoria_nombre: null,
          cantidad_compras: '5',
          total_vendido: '2500.00',
          ticket_promedio: '500.00',
        },
      ]);
      mockQueryBuilder.getRawOne.mockResolvedValue({ ultima_compra: null });

      const result = await service.getResumenClientes({
        fechaFrom: '2026-01-01',
        fechaTo: '2026-12-31',
      });

      const mostradorRow = result.data.find((r: any) => r.clienteId === '00000000-0000-0000-0000-000000000000');
      expect(mostradorRow).toBeDefined();
      expect(mostradorRow.clienteNombre).toBe('Cliente General');
      expect(mostradorRow.rfc).toBe('XAXX010101000');
      expect(mostradorRow.categoriaNombre).toBe('Cliente General');
    });
  });

  describe('getKardexDetalleProducto()', () => {
    const productoMock = {
      id: 'prod-1',
      nombre: 'Producto X',
      laboratorio: { nombre: 'Lab' },
      stockMinimo: 10,
      stockMaximo: 100,
    };

    const detalleMock = (folio: number, cantidad: number, fecha: string) => ({
      id: `det-${folio}`,
      cantidad,
      precioUnitario: 10,
      costoUnitario: 5,
      descuentoLinea: 0,
      subtotal: cantidad * 10,
      venta: { folio, createdAt: new Date(fecha), cliente: null },
      lote: { numeroLote: 'L-1' },
    });

    it('calcula stockInicial y running balance (300 → 297 → 287)', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(productoMock);
      mockQueryBuilder.getMany
        .mockResolvedValueOnce([{ cantidadActual: 287 }])
        .mockResolvedValueOnce([
          detalleMock(1, 3, '2026-07-10T12:00:00Z'),
          detalleMock(2, 10, '2026-08-05T12:00:00Z'),
        ]);

      const result = await service.getKardexDetalleProducto(
        'prod-1',
        '2026-07-01',
        '2026-08-20',
      );

      expect(result.stockInicial).toBe(300);
      expect(result.trazabilidad).toHaveLength(2);
      expect(result.trazabilidad[0]).toMatchObject({
        folioVenta: 1,
        cantidad: 3,
        cantidadInicial: 300,
        restante: 297,
      });
      expect(result.trazabilidad[1]).toMatchObject({
        folioVenta: 2,
        cantidad: 10,
        cantidadInicial: 297,
        restante: 287,
      });
    });

    it('sin ventas en el período, stockInicial = stockActual', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(productoMock);
      mockQueryBuilder.getMany
        .mockResolvedValueOnce([{ cantidadActual: 50 }])
        .mockResolvedValueOnce([]);

      const result = await service.getKardexDetalleProducto('prod-1');

      expect(result.stockInicial).toBe(50);
      expect(result.trazabilidad).toEqual([]);
    });

    it('devuelve preciosPorLote con sus precios y costos', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(productoMock);
      mockQueryBuilder.getMany
        .mockResolvedValueOnce([
          { cantidadActual: 5, precioVenta: 100, precioUnitarioLote: 80, lote: { numeroLote: 'L-1' } },
          { cantidadActual: 3, precioVenta: 110, precioUnitarioLote: 85, lote: { numeroLote: 'L-2' } },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getKardexDetalleProducto('prod-1');

      expect(result.preciosPorLote).toHaveLength(2);
      expect(result.preciosPorLote[0]).toEqual({
        numeroLote: 'L-1',
        precioVenta: 100,
        precioUnitarioLote: 80,
      });
      expect(result.preciosPorLote[1]).toEqual({
        numeroLote: 'L-2',
        precioVenta: 110,
        precioUnitarioLote: 85,
      });
    });
  });

  describe('getKardexInventario()', () => {
    it('agrupa por producto con stockInicial, vendido y n° de ventas', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          {
            producto_id: 'p1',
            producto_nombre: 'Producto A',
            total_cantidad_vendida: '13',
            cantidad_ventas: '4',
          },
        ])
        .mockResolvedValueOnce([
          { producto_id: 'p1', stock_actual: '287' },
        ]);

      const result = await service.getKardexInventario({
        fechaFrom: '2026-07-01',
        fechaTo: '2026-08-20',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        productoId: 'p1',
        nombreProducto: 'Producto A',
        stockInicial: 300,
        stockActual: 287,
        totalCantidadVendida: 13,
        cantidadVentas: 4,
      });
    });

    it('usa stock 0 cuando el producto no tiene inventario', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          {
            producto_id: 'p2',
            producto_nombre: 'Producto B',
            total_cantidad_vendida: '5',
            cantidad_ventas: '2',
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getKardexInventario({});

      expect(result[0].stockInicial).toBe(5);
      expect(result[0].stockActual).toBe(0);
    });

    it('retorna [] cuando no hay ventas en el período', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]);

      const result = await service.getKardexInventario({
        fechaFrom: '2026-01-01',
        fechaTo: '2026-01-31',
      });

      expect(result).toEqual([]);
    });
  });
});