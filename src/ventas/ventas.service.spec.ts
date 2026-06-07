import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { VentasService } from './ventas.service';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { PagoVenta } from './entities/pago-venta.entity';
import { DescuentoVentaDetalle } from '../descuentos/entities/descuento-venta-detalle.entity';
import { ProductosService } from '../productos/productos.service';
import { LotesService } from '../lotes/lotes.service';
import { DescuentosService } from '../descuentos/descuentos.service';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { MovimientosAlmacenService } from '../movimientos-almacen/movimientos-almacen.service';
import { ConfiguracionesService } from '../configuraciones/configuraciones.service';
import { ClientesService } from '../clientes/clientes.service';
import { MetodoPago } from '../common/enums/metodo-pago.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getOne: jest.fn(),
  select: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
};

const mockVentasRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  query: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

const mockDetallesRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockPagosRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockDescuentosVentaDetalleRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockProductosService = {
  findOne: jest.fn(),
};

const mockDescuentosService = {
  calcularDescuentosAcumulables: jest.fn(),
  previewProductDiscount: jest.fn(),
};

const mockInventarioAlmacenService = {
  findByProductoId: jest.fn(),
  reducirStockFIFO: jest.fn(),
  getStockTotal: jest.fn(),
  agregarStock: jest.fn(),
  calcularPrecioVenta: jest.fn(),
};

const mockConfiguracionesService = {
  getIvaGlobal: jest.fn().mockResolvedValue(16),
};

const mockClientesService = {
  findOne: jest.fn(),
};

const mockLotesService = {
  findOne: jest.fn(),
};

const mockMovimientosAlmacenService = {
  create: jest.fn(),
};

const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

describe('VentasService', () => {
  let service: VentasService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: 'VentaRepository', useValue: mockVentasRepository },
        { provide: 'DetalleVentaRepository', useValue: mockDetallesRepository },
        { provide: 'PagoVentaRepository', useValue: mockPagosRepository },
        { provide: 'DescuentoVentaDetalleRepository', useValue: mockDescuentosVentaDetalleRepository },
        { provide: ProductosService, useValue: mockProductosService },
        { provide: DescuentosService, useValue: mockDescuentosService },
        { provide: InventarioAlmacenService, useValue: mockInventarioAlmacenService },
        { provide: MovimientosAlmacenService, useValue: mockMovimientosAlmacenService },
        { provide: ConfiguracionesService, useValue: mockConfiguracionesService },
        { provide: ClientesService, useValue: mockClientesService },
        { provide: LotesService, useValue: mockLotesService },
      ],
    }).compile();

    service = module.get<VentasService>(VentasService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.select.mockReturnThis();
    mockVentasRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockVentasRepository.query.mockResolvedValue([]);
  });

  describe('getNextFolio()', () => {
    it('should call nextval sequence', async () => {
      mockVentasRepository.query.mockResolvedValue([{ folio: 43 }]);
      const folio = await service.getNextFolio();
      expect(folio).toBe(43);
      expect(mockVentasRepository.query).toHaveBeenCalledWith(
        `SELECT nextval('ventas_folio_seq') AS folio`,
      );
    });
  });

  describe('convertirMetodoPago()', () => {
    it('should convert MetodoPago.EFECTIVO to FormaPago.EFECTIVO', () => {
      expect(service.convertirMetodoPago(MetodoPago.EFECTIVO)).toBe('01');
    });
    it('should convert MetodoPago.TARJETA to FormaPago.TARJETA', () => {
      expect(service.convertirMetodoPago(MetodoPago.TARJETA)).toBe('04');
    });
    it('should convert MetodoPago.TRANSFERENCIA to FormaPago.TRANSFERENCIA', () => {
      expect(service.convertirMetodoPago(MetodoPago.TRANSFERENCIA)).toBe('03');
    });
    it('should convert MetodoPago.CLIENTE_CUENTA to FormaPago.EFECTIVO (fallback)', () => {
      expect(service.convertirMetodoPago(MetodoPago.CLIENTE_CUENTA)).toBe('01');
    });
  });

  describe('convertirFormaPagoAMetodoPago()', () => {
    it('should convert 01 to MetodoPago.EFECTIVO', () => {
      expect(service.convertirFormaPagoAMetodoPago('01')).toBe(MetodoPago.EFECTIVO);
    });
    it('should convert 04 to MetodoPago.TARJETA', () => {
      expect(service.convertirFormaPagoAMetodoPago('04')).toBe(MetodoPago.TARJETA);
    });
    it('should convert 03 to MetodoPago.TRANSFERENCIA', () => {
      expect(service.convertirFormaPagoAMetodoPago('03')).toBe(MetodoPago.TRANSFERENCIA);
    });
    it('should default unknown to MetodoPago.TARJETA', () => {
      expect(service.convertirFormaPagoAMetodoPago('99')).toBe(MetodoPago.TARJETA);
    });
  });

  describe('findAll()', () => {
    beforeEach(() => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [{ id: 'venta-1', folio: 1 }],
        1,
      ]);
    });

    it('should return paginated sales', async () => {
      const result = await service.findAll(0, 10);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply date filters', async () => {
      await service.findAll(0, 10, {
        fechaFrom: '2024-01-01',
        fechaTo: '2024-12-31',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE(venta.createdAt) >= :fechaFrom', { fechaFrom: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE(venta.createdAt) <= :fechaTo', { fechaTo: '2024-12-31' },
      );
    });

    it('should apply clienteId filter', async () => {
      await service.findAll(0, 20, { clienteId: 'cliente-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venta.clienteId = :clienteId', { clienteId: 'cliente-1' },
      );
    });

    it('should apply usuarioId filter', async () => {
      await service.findAll(0, 20, { usuarioId: 'user-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venta.usuarioId = :usuarioId', { usuarioId: 'user-1' },
      );
    });

    it('should use default pagination when not specified', async () => {
      await service.findAll();
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should apply statusId filter as number', async () => {
      await service.findAll(0, 20, { statusId: '1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venta.statusId = :statusId', { statusId: 1 },
      );
    });
  });

  describe('findOne()', () => {
    const mockVenta = {
      id: 'venta-1',
      folio: 42,
      subtotal: 100,
      descuentoAplicado: 10,
      iva: 16,
      total: 106,
      cliente: { id: 'c-1', nombre: 'Test' },
      usuario: { id: 'u-1', name: 'Admin' },
    };

    const mockDetalles = [
      {
        id: 'det-1',
        ventaId: 'venta-1',
        productoId: 'prod-1',
        cantidad: 5,
        precioUnitario: 20,
        descuentoLinea: 5,
        subtotal: 95,
        importeBruto: 100,
        producto: { id: 'prod-1', nombre: 'Producto' },
        lote: { id: 'lote-1', codigo: 'L001' },
      },
    ];

    const mockPagos = [{ id: 'pago-1', monto: 106, formaPago: '01' }];
    const mockDescuentos = [{ id: 'dvd-1', monto: 5, porcentaje: 10 }];

    beforeEach(() => {
      mockVentasRepository.findOne.mockResolvedValue(mockVenta);
      mockDetallesRepository.find.mockResolvedValue(mockDetalles);
      mockPagosRepository.find.mockResolvedValue(mockPagos);
      mockDescuentosVentaDetalleRepository.find.mockResolvedValue(mockDescuentos);
    });

    it('should return sale with full relations', async () => {
      const result = await service.findOne('venta-1');

      expect(result.folio).toBe(42);
      expect(result.detalles).toHaveLength(1);
      expect(result.pagos).toHaveLength(1);
      expect(result.descuentos).toHaveLength(1);
      expect(result.cliente.nombre).toBe('Test');
    });

    it('should throw NotFoundException when venta not found', async () => {
      mockVentasRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should convert numeric fields', async () => {
      const result = await service.findOne('venta-1');
      expect(typeof result.subtotal).toBe('number');
      expect(typeof result.total).toBe('number');
      expect(typeof result.detalles[0].cantidad).toBe('number');
      expect(typeof result.pagos[0].monto).toBe('number');
      expect(typeof result.descuentos[0].monto).toBe('number');
    });

    it('should find descuentos using detalle IDs', async () => {
      await service.findOne('venta-1');
      expect(mockDescuentosVentaDetalleRepository.find).toHaveBeenCalled();
    });

    it('should skip descuentos query when no detalles exist', async () => {
      mockDetallesRepository.find.mockResolvedValue([]);
      await service.findOne('venta-1');
      expect(mockDescuentosVentaDetalleRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findByFolio()', () => {
    it('should find sale by folio number', async () => {
      mockVentasRepository.findOne.mockResolvedValue({ id: 'v-1', folio: 42 });
      const result = await service.findByFolio(42);
      expect(result).not.toBeNull();
      expect(result.folio).toBe(42);
    });

    it('should return null when folio not found', async () => {
      mockVentasRepository.findOne.mockResolvedValue(null);
      const result = await service.findByFolio(999);
      expect(result).toBeNull();
    });

    it('should load relations', async () => {
      await service.findByFolio(42);
      expect(mockVentasRepository.findOne).toHaveBeenCalledWith({
        where: { folio: 42 },
        relations: ['cliente', 'usuario', 'detalles', 'pagos'],
      });
    });
  });

  describe('findByFolioAndUserId()', () => {
    beforeEach(() => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 'v-1', folio: 42 });
    });

    it('should find sale by folio and userId', async () => {
      const result = await service.findByFolioAndUserId(42, 'user-1');
      expect(result).not.toBeNull();
      expect(result.folio).toBe(42);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'venta.folio = :folio', { folio: 42 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venta.usuarioId = :userId', { userId: 'user-1' },
      );
    });

    it('should apply date range filters', async () => {
      await service.findByFolioAndUserId(42, 'user-1', '2024-01-01', '2024-12-31');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE(venta.createdAt) >= :fechaFrom', { fechaFrom: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE(venta.createdAt) <= :fechaTo', { fechaTo: '2024-12-31' },
      );
    });

    it('should return null when not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const result = await service.findByFolioAndUserId(999, 'user-x');
      expect(result).toBeNull();
    });
  });

  describe('cancel()', () => {
    const baseVenta = {
      id: 'venta-1',
      folio: 42,
      statusId: 1,
      detalles: [
        {
          id: 'det-1',
          productoId: 'prod-1',
          loteId: 'lote-1',
          cantidad: 5,
          producto: { id: 'prod-1' },
          lote: { id: 'lote-1' },
          lotesUtilizados: [
            { loteId: 'lote-1', cantidad: 3, lote: { id: 'lote-1' } },
            { loteId: 'lote-2', cantidad: 2, lote: { id: 'lote-2' } },
          ],
        },
      ],
    };

    beforeEach(() => {
      mockVentasRepository.findOne = async () => ({ ...baseVenta, detalles: baseVenta.detalles.map(d => ({ ...d, lotesUtilizados: d.lotesUtilizados.map(l => ({ ...l })) })) });
      mockDataSource.transaction = jest.fn((cb) => cb(mockManager));
      mockManager.save = jest.fn();
      mockManager.create = jest.fn().mockReturnValue({});
      mockClientesService.findOne = jest.fn();
      mockInventarioAlmacenService.findByProductoId = jest.fn();
      mockInventarioAlmacenService.agregarStock = jest.fn();
      mockProductosService.findOne = jest.fn();
      mockDescuentosService.calcularDescuentosAcumulables = jest.fn();
    });

    it('should cancel and revert stock', async () => {
      const result = await service.cancel('venta-1', 'user-1', 'Test cancel');

      expect(mockInventarioAlmacenService.agregarStock).toHaveBeenCalledTimes(2);
      expect(mockInventarioAlmacenService.agregarStock).toHaveBeenCalledWith(
        'prod-1', 'lote-1', 2, 3, undefined, undefined, mockManager,
      );
      expect(mockManager.create).toHaveBeenCalledTimes(2);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent venta', async () => {
      mockVentasRepository.findOne = async () => null;
      await expect(service.cancel('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already cancelled venta', async () => {
      mockVentasRepository.findOne = async () => ({ ...baseVenta, statusId: 2 });
      await expect(service.cancel('venta-1')).rejects.toThrow(BadRequestException);
    });

    it('should use SYSTEM user when usuarioId not provided', async () => {
      await service.cancel('venta-1');
      const movimiento = mockManager.create.mock.calls[0][1];
      expect(movimiento.userId).toBe('SYSTEM');
    });

    it('should skip zero-cantidad lotes', async () => {
      const ventaWithZeroLotes = {
        ...baseVenta,
        detalles: [{
          ...baseVenta.detalles[0],
          lotesUtilizados: [
            { loteId: 'lote-1', cantidad: 0, lote: { id: 'lote-1' } },
          ],
        }],
      };
      mockVentasRepository.findOne = async () => ventaWithZeroLotes;

      await service.cancel('venta-1');
      expect(mockInventarioAlmacenService.agregarStock).not.toHaveBeenCalled();
    });

    it('should fallback to detalle.loteId when lotesUtilizados empty', async () => {
      const ventaWithoutLotesUtilizados = {
        ...baseVenta,
        detalles: [{
          ...baseVenta.detalles[0],
          lotesUtilizados: [],
        }],
      };
      mockVentasRepository.findOne = async () => ventaWithoutLotesUtilizados;

      await service.cancel('venta-1');
      expect(mockInventarioAlmacenService.agregarStock).toHaveBeenCalledTimes(1);
    });
  });

  describe('previewDescuento()', () => {
    const productos = [
      { productoId: 'prod-1', cantidad: 5 },
      { productoId: 'prod-2', cantidad: 3 },
    ];

    beforeEach(() => {
      mockConfiguracionesService.getIvaGlobal.mockResolvedValue(16);
      mockInventarioAlmacenService.findByProductoId.mockImplementation((id) => {
        if (id === 'prod-1') return Promise.resolve({ precioUnitarioLote: 45, precioVenta: 61.2, almacenTipo: 2 });
        if (id === 'prod-2') return Promise.resolve({ precioUnitarioLote: 183.65, precioVenta: 250.6, almacenTipo: 2 });
        return null;
      });

      mockProductosService.findOne.mockResolvedValue({ id: 'prod-1', nombre: 'Producto Test' });

      mockClientesService.findOne.mockResolvedValue({
        id: 'cliente-1',
        nombre: 'Test Client',
        categoriaClienteId: 'cat-5',
      });

      mockDescuentosService.calcularDescuentosAcumulables.mockResolvedValue({
        descuentoProducto: { tipo: 'VOLUMEN', porcentaje: 10, monto: 30.6 },
        descuentoCategoria: { tipo: 'CATEGORIA', porcentaje: 15, monto: 41.31 },
        descuentoTotal: 71.91,
        precioOriginal: 306,
        precioFinal: 234.09,
        excedeLimite: false,
      });
    });

    it('should calculate discount preview for products', async () => {
      const result = await service.previewDescuento(productos, 'cliente-1');

      expect(result.descuentoPorProducto).toHaveLength(2);
      expect(result.subtotal).toBeDefined();
      expect(result.total).toBeDefined();
      expect(mockClientesService.findOne).toHaveBeenCalledWith('cliente-1');
    });

    it('should generate descuentoPorProducto entries', async () => {
      const result = await service.previewDescuento([productos[0]], 'cliente-1');
      const entry = result.descuentoPorProducto[0];
      expect(entry.productoId).toBe('prod-1');
      expect(entry.mejorDescuento).toBeDefined();
      expect(typeof entry.descuento).toBe('number');
      expect(typeof entry.descuentoProducto).toBe('number');
    });

    it('should handle productos not found in inventario', async () => {
      mockInventarioAlmacenService.findByProductoId.mockResolvedValue(null);

      const result = await service.previewDescuento(productos, 'cliente-1');
      expect(result.descuentoPorProducto).toHaveLength(2);
    });

    it('should handle missing cliente gracefully', async () => {
      mockClientesService.findOne.mockRejectedValue(new Error('Not found'));

      const result = await service.previewDescuento(productos, 'cliente-x');
      expect(result.descuentoPorProducto).toHaveLength(2);
    });

    it('should handle empty producto list', async () => {
      const result = await service.previewDescuento([], 'cliente-1');
      expect(result.descuentoPorProducto).toHaveLength(0);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should work without clienteId', async () => {
      const result = await service.previewDescuento(productos);
      expect(result.descuentoPorProducto).toHaveLength(2);
    });
  });
});
