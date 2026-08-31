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
import { CuentasCobrarService } from '../cuentas-cobrar/cuentas-cobrar.service';
import { CreditosService } from '../creditos/creditos.service';
import { MetodoPago } from '../common/enums/metodo-pago.enum';
import { DescuentoTipo } from '../common/enums/descuento-tipo.enum';
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

const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockDetallesQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
};

const mockDetallesRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  manager: mockManager,
  createQueryBuilder: jest.fn().mockReturnValue(mockDetallesQueryBuilder),
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

const mockCuentasCobrarService = {
  create: jest.fn(),
  findByCliente: jest.fn(),
};

const mockCreditosService = {
  getDisponible: jest.fn().mockResolvedValue(10000),
  usarCredito: jest.fn(),
};

const mockInventarioAlmacenQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
};



const mockInventarioAlmacenRepository = {
  createQueryBuilder: jest
    .fn()
    .mockReturnValue(mockInventarioAlmacenQueryBuilder),
  find: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
  query: jest.fn().mockResolvedValue([]),
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
        {
          provide: 'DescuentoVentaDetalleRepository',
          useValue: mockDescuentosVentaDetalleRepository,
        },
        {
          provide: 'InventarioAlmacenRepository',
          useValue: mockInventarioAlmacenRepository,
        },
        { provide: ProductosService, useValue: mockProductosService },
        { provide: DescuentosService, useValue: mockDescuentosService },
        {
          provide: InventarioAlmacenService,
          useValue: mockInventarioAlmacenService,
        },
        {
          provide: MovimientosAlmacenService,
          useValue: mockMovimientosAlmacenService,
        },
        {
          provide: ConfiguracionesService,
          useValue: mockConfiguracionesService,
        },
        { provide: ClientesService, useValue: mockClientesService },
        { provide: LotesService, useValue: mockLotesService },
        { provide: CuentasCobrarService, useValue: mockCuentasCobrarService },
        { provide: CreditosService, useValue: mockCreditosService },
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
    mockDetallesRepository.createQueryBuilder.mockReturnValue(
      mockDetallesQueryBuilder,
    );
    mockDetallesQueryBuilder.select.mockReturnThis();
    mockDetallesQueryBuilder.where.mockReturnThis();
    mockDetallesQueryBuilder.andWhere.mockReturnThis();
    mockDetallesQueryBuilder.getMany.mockResolvedValue([]);
    mockInventarioAlmacenRepository.createQueryBuilder.mockReturnValue(
      mockInventarioAlmacenQueryBuilder,
    );
    mockInventarioAlmacenQueryBuilder.select.mockReturnThis();
    mockInventarioAlmacenQueryBuilder.where.mockReturnThis();
    mockInventarioAlmacenQueryBuilder.andWhere.mockReturnThis();
    mockInventarioAlmacenQueryBuilder.getMany.mockResolvedValue([]);
    mockInventarioAlmacenRepository.find.mockResolvedValue([]);
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
      expect(service.convertirFormaPagoAMetodoPago('01')).toBe(
        MetodoPago.EFECTIVO,
      );
    });
    it('should convert 04 to MetodoPago.TARJETA', () => {
      expect(service.convertirFormaPagoAMetodoPago('04')).toBe(
        MetodoPago.TARJETA,
      );
    });
    it('should convert 03 to MetodoPago.TRANSFERENCIA', () => {
      expect(service.convertirFormaPagoAMetodoPago('03')).toBe(
        MetodoPago.TRANSFERENCIA,
      );
    });
    it('should default unknown to MetodoPago.TARJETA', () => {
      expect(service.convertirFormaPagoAMetodoPago('99')).toBe(
        MetodoPago.TARJETA,
      );
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
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply date filters', async () => {
      await service.findAll(0, 10, {
        fechaFrom: '2024-01-01',
        fechaTo: '2024-12-31',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE(venta.createdAt) >= :fechaFrom',
        { fechaFrom: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE(venta.createdAt) <= :fechaTo',
        { fechaTo: '2024-12-31' },
      );
    });

    it('should apply clienteId filter', async () => {
      await service.findAll(0, 20, { clienteId: 'cliente-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venta.clienteId = :clienteId',
        { clienteId: 'cliente-1' },
      );
    });

    it('should apply usuarioId filter', async () => {
      await service.findAll(0, 20, { usuarioId: 'user-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venta.usuarioId = :usuarioId',
        { usuarioId: 'user-1' },
      );
    });

    it('should use default pagination when not specified', async () => {
      await service.findAll();
      expect(mockQueryBuilder.skip).not.toHaveBeenCalled();
      expect(mockQueryBuilder.take).not.toHaveBeenCalled();
    });

    it('should apply statusId filter as number', async () => {
      await service.findAll(0, 20, { statusId: '1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venta.statusId = :statusId',
        { statusId: 1 },
      );
    });
  });

  describe('computeUtilidadVentas()', () => {
    beforeEach(() => {
      mockDetallesQueryBuilder.getMany.mockReset();
      mockInventarioAlmacenQueryBuilder.getMany.mockReset();
    });

    it('should compute utilidadBruta using precioVenta from inventario_almacen', async () => {
      const detallesData = [
        {
          ventaId: 'venta-1',
          loteId: 'lote-1',
          productoId: 'prod-1',
          cantidad: 5,
          precioUnitario: 208.8,
          costoUnitario: 160,
          descuentoLinea: 0,
          subtotal: 939.6,
        },
      ];

      mockDetallesQueryBuilder.getMany.mockResolvedValue(detallesData);

      const data = [{ id: 'venta-1', folio: 1 }] as any[];
      await (service as any).computeUtilidadVentas(data);

      expect(data[0].utilidad).toBe(244);
      expect(data[0].utilidadBruta).toBe(244);
    });

    it('should handle multiple detalles for same venta', async () => {
      const detallesData = [
        {
          ventaId: 'venta-1',
          loteId: 'lote-1',
          productoId: 'prod-1',
          cantidad: 5,
          precioUnitario: 208.8,
          costoUnitario: 160,
          descuentoLinea: 0,
          subtotal: 939.6,
        },
        {
          ventaId: 'venta-1',
          loteId: 'lote-2',
          productoId: 'prod-2',
          cantidad: 3,
          precioUnitario: 100,
          costoUnitario: 120,
          descuentoLinea: 0,
          subtotal: 300,
        },
      ];

      mockDetallesQueryBuilder.getMany.mockResolvedValue(detallesData);

      const data = [{ id: 'venta-1', folio: 1 }] as any[];
      await (service as any).computeUtilidadVentas(data);

      expect(data[0].utilidad).toBe(184);
      expect(data[0].utilidadBruta).toBe(184);
    });

    it('should handle multiple ventas', async () => {
      const detallesData = [
        {
          ventaId: 'venta-1',
          loteId: 'lote-1',
          productoId: 'prod-1',
          cantidad: 5,
          precioUnitario: 208.8,
          costoUnitario: 160,
          descuentoLinea: 0,
          subtotal: 939.6,
        },
        {
          ventaId: 'venta-2',
          loteId: 'lote-2',
          productoId: 'prod-2',
          cantidad: 2,
          precioUnitario: 300,
          costoUnitario: 200,
          descuentoLinea: 0,
          subtotal: 600,
        },
      ];

      mockDetallesQueryBuilder.getMany.mockResolvedValue(detallesData);

      const data = [
        { id: 'venta-1', folio: 1 },
        { id: 'venta-2', folio: 2 },
      ] as any[];
      await (service as any).computeUtilidadVentas(data);

      expect(data[0].utilidad).toBe(244);
      expect(data[1].utilidad).toBe(200);
    });

    it('should handle empty data array', async () => {
      const data: any[] = [];

      await (service as any).computeUtilidadVentas(data);
      expect(mockDetallesQueryBuilder.getMany).not.toHaveBeenCalled();
    });

    it('should compute utilidad simplificada', async () => {
      const detallesData = [
        {
          ventaId: 'venta-1',
          loteId: 'lote-1',
          productoId: 'prod-1',
          cantidad: 1,
          precioUnitario: 116,
          costoUnitario: 120,
          descuentoLinea: 0,
          subtotal: 116,
        },
      ];

      mockDetallesQueryBuilder.getMany.mockResolvedValue(detallesData);

      const data = [{ id: 'venta-1', folio: 1 }] as any[];
      await (service as any).computeUtilidadVentas(data);

      expect(data[0].utilidad).toBe(-4);
      expect(data[0].utilidadBruta).toBe(-4);
    });

    it('should subtract descuentoLinea from utilidadBruta for utilidad real', async () => {
      const detallesData = [
        {
          ventaId: 'venta-1',
          loteId: 'lote-1',
          productoId: 'prod-1',
          cantidad: 1,
          precioUnitario: 100,
          costoUnitario: 80,
          descuentoLinea: 10,
          subtotal: 90,
        },
      ];

      mockDetallesQueryBuilder.getMany.mockResolvedValue(detallesData);

      const data = [{ id: 'venta-1', folio: 1 }] as any[];
      await (service as any).computeUtilidadVentas(data);

      expect(data[0].utilidad).toBe(10);
      expect(data[0].utilidadBruta).toBe(20);
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
      mockDescuentosVentaDetalleRepository.find.mockResolvedValue(
        mockDescuentos,
      );
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
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
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
        'venta.folio = :folio',
        { folio: 42 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'venta.usuarioId = :userId',
        { userId: 'user-1' },
      );
    });

    it('should apply date range filters', async () => {
      await service.findByFolioAndUserId(
        42,
        'user-1',
        '2024-01-01',
        '2024-12-31',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE(venta.createdAt) >= :fechaFrom',
        { fechaFrom: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE(venta.createdAt) <= :fechaTo',
        { fechaTo: '2024-12-31' },
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
      mockVentasRepository.findOne = async () => ({
        ...baseVenta,
        detalles: baseVenta.detalles.map((d) => ({
          ...d,
          lotesUtilizados: d.lotesUtilizados.map((l) => ({ ...l })),
        })),
      });
      mockDataSource.transaction = jest.fn((cb) => cb(mockManager));
      mockManager.save = jest.fn();
      mockManager.create = jest.fn().mockReturnValue({});
      mockManager.findOne = jest.fn();
      mockClientesService.findOne = jest.fn();
      mockInventarioAlmacenService.findByProductoId = jest.fn();
      mockInventarioAlmacenService.agregarStock = jest.fn();
      mockProductosService.findOne = jest.fn();
      mockDescuentosService.calcularDescuentosAcumulables = jest.fn();
    });

    it('should cancel and revert stock', async () => {
      const result = await service.cancel('venta-1', 'user-1', 'Test cancel');

      expect(mockInventarioAlmacenService.agregarStock).toHaveBeenCalledTimes(
        2,
      );
      expect(mockInventarioAlmacenService.agregarStock).toHaveBeenCalledWith(
        'prod-1',
        'lote-1',
        2,
        3,
        undefined,
        undefined,
        mockManager,
      );
      expect(mockManager.create).toHaveBeenCalledTimes(2);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent venta', async () => {
      mockVentasRepository.findOne = async () => null;
      await expect(service.cancel('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already cancelled venta', async () => {
      mockVentasRepository.findOne = async () => ({
        ...baseVenta,
        statusId: 2,
      });
      await expect(service.cancel('venta-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use SYSTEM user when usuarioId not provided', async () => {
      await service.cancel('venta-1');
      const movimiento = mockManager.create.mock.calls[0][1];
      expect(movimiento.userId).toBe('SYSTEM');
    });

    it('should skip zero-cantidad lotes', async () => {
      const ventaWithZeroLotes = {
        ...baseVenta,
        detalles: [
          {
            ...baseVenta.detalles[0],
            lotesUtilizados: [
              { loteId: 'lote-1', cantidad: 0, lote: { id: 'lote-1' } },
            ],
          },
        ],
      };
      mockVentasRepository.findOne = async () => ventaWithZeroLotes;

      await service.cancel('venta-1');
      expect(mockInventarioAlmacenService.agregarStock).not.toHaveBeenCalled();
    });

    it('should fallback to detalle.loteId when lotesUtilizados empty', async () => {
      const ventaWithoutLotesUtilizados = {
        ...baseVenta,
        detalles: [
          {
            ...baseVenta.detalles[0],
            lotesUtilizados: [],
          },
        ],
      };
      mockVentasRepository.findOne = async () => ventaWithoutLotesUtilizados;

      await service.cancel('venta-1');
      expect(mockInventarioAlmacenService.agregarStock).toHaveBeenCalledTimes(
        1,
      );
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
        if (id === 'prod-1')
          return Promise.resolve({
            precioUnitarioLote: 45,
            precioVenta: 61.2,
            almacenTipo: 2,
          });
        if (id === 'prod-2')
          return Promise.resolve({
            precioUnitarioLote: 183.65,
            precioVenta: 250.6,
            almacenTipo: 2,
          });
        return null;
      });

      mockProductosService.findOne.mockResolvedValue({
        id: 'prod-1',
        nombre: 'Producto Test',
      });

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
      const result = await service.previewDescuento(
        [productos[0]],
        'cliente-1',
      );
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

  describe('create()', () => {
    const usuarioId = 'user-1';
    const baseProducto = {
      id: 'prod-1',
      nombre: 'Paracetamol',
      laboratorioId: 'lab-1',
    };
    const baseInventario = {
      precioUnitarioLote: 45,
      precioVenta: 61.2,
      almacenTipo: 2,
      lote: { fechaCaducidad: null },
    };
    const baseResultadoFEPU = {
      success: true,
      lotsUsed: [
        { loteId: 'lote-1', numeroLote: 'L001', cantidad: 5, precio: 45 },
      ],
    };
    const savedDetalle = {
      id: 'det-1',
      ventaId: 'venta-1',
      productoId: 'prod-1',
      cantidad: 5,
      precioUnitario: 45,
      descuentoLinea: 0,
      subtotal: 306,
      importeBruto: 306,
    };
    const savedVenta = {
      id: 'venta-1',
      folio: 1001,
      clienteId: null,
      usuarioId,
      subtotal: 306,
      descuentoAplicado: 0,
      iva: 48.96,
      total: 354.96,
      metodoPago: MetodoPago.EFECTIVO,
    };

    beforeEach(() => {
      mockVentasRepository.create.mockImplementation((data: any) => ({
        ...savedVenta,
        ...data,
      }));
      mockVentasRepository.query.mockResolvedValue([{ folio: 1001 }]);
      mockProductosService.findOne.mockResolvedValue(baseProducto);
      mockInventarioAlmacenService.getStockTotal.mockResolvedValue(50);
      mockInventarioAlmacenService.findByProductoId.mockResolvedValue(
        baseInventario,
      );
      mockInventarioAlmacenService.reducirStockFIFO.mockResolvedValue(
        baseResultadoFEPU,
      );
      mockDescuentosService.calcularDescuentosAcumulables.mockResolvedValue({
        descuentoProducto: null,
        descuentoCategoria: null,
        descuentoTotal: 0,
        precioOriginal: 306,
        precioFinal: 306,
        porcentajeEfectivo: 0,
        excedeLimite: false,
        descuentosAplicables: [],
      });
      mockConfiguracionesService.getIvaGlobal.mockResolvedValue(16);
      mockDataSource.transaction.mockImplementation((cb: any) =>
        cb(mockManager),
      );
      mockManager.save.mockImplementation((entity: any, data: any) => {
        if (Array.isArray(data))
          return Promise.resolve(
            data.map((d: any) => ({
              ...d,
              id: d.id || 'det-' + Math.random(),
            })),
          );
        if (data?.folio) return Promise.resolve(data);
        if (data?.formaPago)
          return Promise.resolve({ ...data, id: 'pago-' + Math.random() });
        if (data?.detalleVentaId)
          return Promise.resolve({ ...data, id: 'dl-' + Math.random() });
        if (data?.productoId)
          return Promise.resolve({ ...data, id: 'det-' + Math.random() });
        return Promise.resolve({ id: 'new-id' });
      });
      mockManager.find.mockResolvedValue([
        { ...savedDetalle, producto: baseProducto, lote: { id: 'lote-1' } },
      ]);
      mockDetallesRepository.manager.create.mockReturnValue({});
    });

    it('should create a basic sale with single product and EFECTIVO', async () => {
      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 5 }],
        metodoPago: MetodoPago.EFECTIVO,
      };
      const result = await service.create(dto as any, usuarioId);

      expect(result).toBeDefined();
      expect(result.folio).toBe(1001);
      expect(result.total).toBe(354.96);
      expect(
        mockInventarioAlmacenService.reducirStockFIFO,
      ).toHaveBeenCalledWith('prod-1', 5, 2, usuarioId, undefined, mockManager);
    });

    it('should create a sale with multiple products', async () => {
      const dto = {
        productos: [
          { productoId: 'prod-1', cantidad: 3 },
          { productoId: 'prod-2', cantidad: 2 },
        ],
        metodoPago: MetodoPago.EFECTIVO,
      };

      mockInventarioAlmacenService.findByProductoId
        .mockResolvedValueOnce({ ...baseInventario, precioVenta: 61.2 })
        .mockResolvedValueOnce({ ...baseInventario, precioVenta: 100 });

      mockInventarioAlmacenService.reducirStockFIFO
        .mockResolvedValueOnce({
          success: true,
          lotsUsed: [
            { loteId: 'lote-1', numeroLote: 'L001', cantidad: 3, precio: 45 },
          ],
        })
        .mockResolvedValueOnce({
          success: true,
          lotsUsed: [
            { loteId: 'lote-2', numeroLote: 'L002', cantidad: 2, precio: 80 },
          ],
        });

      const result = await service.create(dto as any, usuarioId);

      expect(result).toBeDefined();
      expect(
        mockInventarioAlmacenService.reducirStockFIFO,
      ).toHaveBeenCalledTimes(2);
    });

    it('should create a sale with multi-payment (pagos array)', async () => {
      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 5 }],
        pagos: [
          { formaPago: '01', monto: 200 },
          { formaPago: '04', monto: 154.96 },
        ],
      };
      const result = await service.create(dto as any, usuarioId);

      expect(result).toBeDefined();
    });

    it('should throw error when productos is empty', async () => {
      const dto = { productos: [], metodoPago: MetodoPago.EFECTIVO };
      await expect(service.create(dto as any, usuarioId)).rejects.toThrow(
        'La venta debe tener al menos un producto',
      );
    });

    it('should throw error when productos have duplicates', async () => {
      const dto = {
        productos: [
          { productoId: 'prod-1', cantidad: 3 },
          { productoId: 'prod-1', cantidad: 2 },
        ],
        metodoPago: MetodoPago.EFECTIVO,
      };
      await expect(service.create(dto as any, usuarioId)).rejects.toThrow(
        'No puede haber productos duplicados en la venta',
      );
    });

    it('should throw error when cantidad <= 0', async () => {
      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 0 }],
        metodoPago: MetodoPago.EFECTIVO,
      };
      await expect(service.create(dto as any, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when product not found', async () => {
      mockProductosService.findOne.mockResolvedValue(null);

      const dto = {
        productos: [{ productoId: 'nonexistent', cantidad: 1 }],
        metodoPago: MetodoPago.EFECTIVO,
      };
      await expect(service.create(dto as any, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when stock insufficient', async () => {
      mockInventarioAlmacenService.reducirStockFIFO.mockResolvedValue({
        success: false,
        message: 'Stock insuficiente',
        lotsUsed: [],
      });

      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 10 }],
        metodoPago: MetodoPago.EFECTIVO,
      };
      await expect(service.create(dto as any, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when no precioVenta', async () => {
      mockInventarioAlmacenService.findByProductoId.mockResolvedValue({
        ...baseInventario,
        precioVenta: null,
      });

      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 1 }],
        metodoPago: MetodoPago.EFECTIVO,
      };
      await expect(service.create(dto as any, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when pagos sum < total', async () => {
      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 5 }],
        pagos: [{ formaPago: '01', monto: 10 }],
      };
      await expect(service.create(dto as any, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when no metodoPago specified', async () => {
      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 5 }],
      };
      await expect(service.create(dto as any, usuarioId)).rejects.toThrow(
        'Debe especificar método de pago',
      );
    });

    it('should apply product and category discounts', async () => {
      mockDescuentosService.calcularDescuentosAcumulables.mockResolvedValue({
        descuentoProducto: {
          descuentoId: 'desc-1',
          tipo: DescuentoTipo.VOLUMEN,
          porcentaje: 10,
          monto: 30.6,
          precioConDescuento: 275.4,
          motivo: 'Descuento por volumen',
        },
        descuentoCategoria: {
          descuentoId: null,
          tipo: DescuentoTipo.CATEGORIA,
          porcentaje: 15,
          monto: 41.31,
          motivo: 'Descuento por categoría',
        },
        descuentoTotal: 71.91,
        precioOriginal: 306,
        precioFinal: 234.09,
        porcentajeEfectivo: 23.5,
        excedeLimite: false,
      });

      mockClientesService.findOne.mockResolvedValue({
        id: 'cliente-1',
        nombre: 'Test Client',
        categoriaClienteId: 'cat-5',
      });

      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 5 }],
        clienteId: 'cliente-1',
        metodoPago: MetodoPago.EFECTIVO,
        descuentosPreview: {
          descuentoAplicado: 0,
          total: 0,
          descuentoPorProducto: [],
        },
      };

      await service.create(dto as any, usuarioId);

      expect(
        mockDescuentosService.calcularDescuentosAcumulables,
      ).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ descuentoAplicado: expect.any(Number) }),
      );
    });

    it('should support multi-lote product', async () => {
      mockInventarioAlmacenService.reducirStockFIFO.mockResolvedValue({
        success: true,
        lotsUsed: [
          { loteId: 'lote-1', numeroLote: 'L001', cantidad: 3, precio: 45 },
          { loteId: 'lote-2', numeroLote: 'L002', cantidad: 2, precio: 45 },
        ],
      });

      const dto = {
        productos: [{ productoId: 'prod-1', cantidad: 5 }],
        metodoPago: MetodoPago.EFECTIVO,
      };
      const result = await service.create(dto as any, usuarioId);

      expect(result).toBeDefined();
      expect(mockDetallesRepository.manager.create).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent sales with stock race condition', async () => {
      let stock = 5;
      mockInventarioAlmacenService.getStockTotal.mockImplementation(
        async () => stock,
      );
      mockInventarioAlmacenService.reducirStockFIFO.mockImplementation(
        async (productoId, cantidad) => {
          if (cantidad > stock) {
            return {
              success: false,
              message: 'Stock insuficiente',
              lotsUsed: [],
            };
          }
          stock -= cantidad;
          return {
            success: true,
            message: 'OK',
            lotsUsed: [
              { loteId: 'lote-1', numeroLote: 'L001', cantidad, precio: 45 },
            ],
          };
        },
      );

      const dto1 = {
        productos: [{ productoId: 'prod-1', cantidad: 5 }],
        metodoPago: MetodoPago.EFECTIVO,
      };
      const dto2 = {
        productos: [{ productoId: 'prod-1', cantidad: 3 }],
        metodoPago: MetodoPago.EFECTIVO,
      };

      const results = await Promise.allSettled([
        service.create(dto1 as any, usuarioId),
        service.create(dto2 as any, usuarioId),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].reason).toBeInstanceOf(BadRequestException);
    });

    it('should assign unique folios on concurrent sales', async () => {
      let nextFolio = 1001;
      mockVentasRepository.query.mockImplementation(async () => {
        const folio = nextFolio++;
        return [{ folio }];
      });

      const dto1 = {
        productos: [{ productoId: 'prod-1', cantidad: 2 }],
        metodoPago: MetodoPago.EFECTIVO,
      };
      const dto2 = {
        productos: [{ productoId: 'prod-1', cantidad: 3 }],
        metodoPago: MetodoPago.EFECTIVO,
      };

      const results = await Promise.allSettled([
        service.create(dto1 as any, usuarioId),
        service.create(dto2 as any, usuarioId),
      ]);

      const fulfilled = results.filter(
        (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled',
      );

      expect(fulfilled.length).toBe(2);
      expect(fulfilled[0].value.folio).not.toBe(fulfilled[1].value.folio);
    });
  });
});
