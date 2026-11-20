import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { InventarioAlmacenService } from './inventario-almacen.service';
import { InventarioAlmacen } from './entities/inventario-almacen.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { ProductoPresentacion } from '../productos/entities/producto-presentacion.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { DetalleLote } from '../detalle-lote/entities/detalle-lote.entity';
import { PreciosLoteService } from '../precios-lote/precios-lote.service';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { BadRequestException } from '@nestjs/common';

describe('InventarioAlmacenService', () => {
  let service: InventarioAlmacenService;

  const mockInventarioRepository = {};
  const mockProductoRepository = {};
  const mockPresentacionRepository = {};
  const mockLoteRepository = {};
  const mockMovimientoRepository = {};
  const mockDataSource = {};
  const mockPreciosLoteService = {
    findByLotes: jest.fn().mockResolvedValue([]),
    getPrecio: jest.fn().mockResolvedValue(null),
    setPrecio: jest.fn().mockResolvedValue(null),
    setPrecioPorTipo: jest.fn().mockResolvedValue(null),
    clearPrecio: jest.fn().mockResolvedValue(undefined),
    clearPrecioPorTipo: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioAlmacenService,
        {
          provide: getRepositoryToken(InventarioAlmacen),
          useValue: mockInventarioRepository,
        },
        {
          provide: getRepositoryToken(Producto),
          useValue: mockProductoRepository,
        },
        { provide: getRepositoryToken(Lote), useValue: mockLoteRepository },
        {
          provide: getRepositoryToken(ProductoPresentacion),
          useValue: mockPresentacionRepository,
        },
        {
          provide: PreciosLoteService,
          useValue: mockPreciosLoteService,
        },
        {
          provide: getRepositoryToken(MovimientoAlmacen),
          useValue: mockMovimientoRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InventarioAlmacenService>(InventarioAlmacenService);
  });

  describe('updatePrecioVenta()', () => {
    const prepareUpdate = (inventario: any) => {
      (mockInventarioRepository as any).findOne = jest
        .fn()
        .mockResolvedValue(inventario);
      (mockInventarioRepository as any).save = jest
        .fn()
        .mockImplementation((value) => Promise.resolve(value));
      (mockProductoRepository as any).update = jest
        .fn()
        .mockResolvedValue({});
      (mockPresentacionRepository as any).findOne = jest
        .fn()
        .mockResolvedValue(null);
      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          if (entity === ProductoPresentacion) return mockPresentacionRepository;
          if (entity === Producto) return mockProductoRepository;
          if (entity === InventarioAlmacen) return mockInventarioRepository;
          throw new Error('Unexpected repository');
        }),
      };
      (mockDataSource as any).transaction = jest.fn((callback) =>
        callback(manager),
      );
      return manager;
    };

    it('actualiza el margen del producto desde el precio del lote', async () => {
      prepareUpdate({
        id: 'inv-1',
        productoId: 'prod-1',
        loteId: 'lote-1',
        precioUnitarioLote: 100,
        precioVenta: 100,
        lote: { numeroLote: 'L1' },
      });

      await service.updatePrecioVenta('inv-1', 125);

      expect(mockProductoRepository.update).toHaveBeenCalledWith('prod-1', {
        margenRecomendado: 25,
      });
      expect(mockPreciosLoteService.setPrecio).not.toHaveBeenCalled();
    });

    it('actualiza precios canónicos cuando existen presentaciones', async () => {
      prepareUpdate({
        id: 'inv-1',
        productoId: 'prod-1',
        loteId: 'lote-1',
        precioUnitarioLote: 100,
        precioVenta: 100,
        lote: { numeroLote: 'L1' },
      });
      (mockPresentacionRepository as any).findOne = jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve({ id: `pres-${where.tipo}`, tipo: where.tipo }),
        );

      await service.updatePrecioVenta('inv-1', 125, 1400);

      expect(mockPreciosLoteService.setPrecio).toHaveBeenCalledWith(
        expect.objectContaining({
          presentacionId: 'pres-PIEZA',
          precio: 125,
        }),
        expect.any(Object),
      );
      expect(mockPreciosLoteService.setPrecio).toHaveBeenCalledWith(
        expect.objectContaining({
          presentacionId: 'pres-CAJA',
          precio: 1400,
        }),
        expect.any(Object),
      );
    });
  });

  describe('queryLotesPorFIFO (via reducirStockFIFO)', () => {
    it('debe usar FOR UPDATE (pessimistic_write) al consultar lotes', async () => {
      const mockGetMany = jest.fn().mockResolvedValue([]);
      const mockSetLock = jest.fn().mockReturnValue({ getMany: mockGetMany });
      const mockOrderBy = jest.fn().mockReturnValue({ setLock: mockSetLock });
      const chain: any = {};
      const mockAndWhere = jest.fn(() => chain);
      chain.andWhere = mockAndWhere;
      chain.orderBy = mockOrderBy;
      const mockWhere = jest.fn(() => chain);
      const mockInnerJoin = jest.fn().mockReturnValue({ where: mockWhere });
      const mockCreateQueryBuilder = jest.fn().mockReturnValue({
        innerJoinAndSelect: mockInnerJoin,
      });

      const manager = {
        createQueryBuilder: mockCreateQueryBuilder,
        save: jest.fn(),
        create: jest.fn(),
      } as unknown as EntityManager;

      try {
        await service.reducirStockFIFO(
          'test-producto',
          1,
          AlmacenTipo.VENTAS,
          'test-user',
          { factorRequerido: 12 },
          manager,
        );
      } catch (_e) {
        // esperado: falla porque no hay inventario, pero el lock se configuró
      }

      expect(mockCreateQueryBuilder).toHaveBeenCalledWith(
        InventarioAlmacen,
        'inv',
      );
      expect(mockInnerJoin).toHaveBeenCalledWith('inv.lote', 'lote');
      expect(mockWhere).toHaveBeenCalledWith('inv.productoId = :productoId', {
        productoId: 'test-producto',
      });
      expect(mockAndWhere).toHaveBeenCalledWith(
        'inv.almacenTipo = :almacenTipo',
        { almacenTipo: AlmacenTipo.VENTAS },
      );
      expect(mockAndWhere).toHaveBeenCalledWith('inv.cantidadActual > 0');
      expect(mockAndWhere).toHaveBeenCalledWith(
        'CAST(lote.statusId AS text) = :loteActivo',
        { loteActivo: '1' },
      );
      expect(mockAndWhere).toHaveBeenCalledWith(
        'lote.piezasPorCaja = :factorRequerido',
        { factorRequerido: 12 },
      );
      expect(mockOrderBy).toHaveBeenCalledWith('lote.fechaCaducidad', 'ASC');
      expect(mockSetLock).toHaveBeenCalledWith('pessimistic_write');
    });
  });

  describe('reducirStockLotesSeleccionados', () => {
    const makeManager = (inventarios: any[]) => {
      const getMany = jest.fn().mockResolvedValue(inventarios);
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany,
      };
      const manager = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        create: jest.fn().mockImplementation((_entity, data) => ({
          ...data,
          id: 'mov-1',
        })),
        save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      } as unknown as EntityManager;
      return { manager, qb, getMany };
    };

    it('descuenta cada lote seleccionado y registra un movimiento', async () => {
      const inv1 = {
        productoId: 'p1',
        loteId: 'lote-1',
        cantidadActual: 5,
        precioVenta: 20,
        precioUnitarioLote: 10,
        lote: { numeroLote: 'L1', statusId: '1' },
      };
      const inv2 = {
        productoId: 'p1',
        loteId: 'lote-2',
        cantidadActual: 4,
        precioVenta: 25,
        precioUnitarioLote: 12,
        lote: { numeroLote: 'L2', statusId: '1' },
      };
      const { manager } = makeManager([inv1, inv2]);

      const result = await service.reducirStockLotesSeleccionados(
        'p1',
        [
          { loteId: 'lote-1', cantidad: 2 },
          { loteId: 'lote-2', cantidad: 3 },
        ],
        AlmacenTipo.VENTAS,
        'user-1',
        undefined,
        manager,
      );

      expect(result.success).toBe(true);
      expect(inv1.cantidadActual).toBe(3);
      expect(inv2.cantidadActual).toBe(1);
      expect(result.lotsUsed).toEqual([
        {
          loteId: 'lote-1',
          numeroLote: 'L1',
          cantidad: 2,
          precio: 20,
          costoUnitario: 10,
        },
        {
          loteId: 'lote-2',
          numeroLote: 'L2',
          cantidad: 3,
          precio: 25,
          costoUnitario: 12,
        },
      ]);
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'mov-1' }),
      );
    });

    it('rechaza si un lote no tiene stock suficiente', async () => {
      const inv1 = {
        productoId: 'p1',
        loteId: 'lote-1',
        cantidadActual: 1,
        precioVenta: 20,
        precioUnitarioLote: 10,
        lote: { numeroLote: 'L1', statusId: '1' },
      };
      const { manager } = makeManager([inv1]);

      await expect(
        service.reducirStockLotesSeleccionados(
          'p1',
          [{ loteId: 'lote-1', cantidad: 2 }],
          AlmacenTipo.VENTAS,
          'user-1',
          undefined,
          manager,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un lote inactivo', async () => {
      const inv1 = {
        productoId: 'p1',
        loteId: 'lote-1',
        cantidadActual: 5,
        precioVenta: 20,
        precioUnitarioLote: 10,
        lote: { numeroLote: 'L1', statusId: '0' },
      };
      const { manager } = makeManager([inv1]);

      await expect(
        service.reducirStockLotesSeleccionados(
          'p1',
          [{ loteId: 'lote-1', cantidad: 1 }],
          AlmacenTipo.VENTAS,
          'user-1',
          undefined,
          manager,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('validarLoteDestino', () => {
    const makeManager = ({
      lote = { id: 'lote-destino', statusId: '1' },
      inventarios = [] as any[],
      detalles = [] as any[],
    } = {}) => ({
      getRepository: (entity: unknown) => {
        if (entity === Lote) {
          return { findOne: jest.fn().mockResolvedValue(lote) };
        }
        if (entity === InventarioAlmacen) {
          return { find: jest.fn().mockResolvedValue(inventarios) };
        }
        if (entity === DetalleLote) {
          return { find: jest.fn().mockResolvedValue(detalles) };
        }
        throw new Error('Repositorio no esperado');
      },
    });

    it('rechaza el mismo lote origen', async () => {
      await expect(
        (service as any).validarLoteDestino(
          makeManager(),
          'producto-1',
          'lote-1',
          'lote-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un lote destino inexistente', async () => {
      await expect(
        (service as any).validarLoteDestino(
          makeManager({ lote: null }),
          'producto-1',
          'lote-1',
          'lote-destino',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un lote destino inactivo', async () => {
      await expect(
        (service as any).validarLoteDestino(
          makeManager({ lote: { id: 'lote-destino', statusId: '2' } }),
          'producto-1',
          'lote-1',
          'lote-destino',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un lote destino de otro producto', async () => {
      await expect(
        (service as any).validarLoteDestino(
          makeManager({ inventarios: [{ productoId: 'producto-2' }] }),
          'producto-1',
          'lote-1',
          'lote-destino',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('acepta un lote destino activo del mismo producto', async () => {
      await expect(
        (service as any).validarLoteDestino(
          makeManager({ inventarios: [{ productoId: 'producto-1' }] }),
          'producto-1',
          'lote-1',
          'lote-destino',
        ),
      ).resolves.toBeUndefined();
    });

    it('usa detalle_lote cuando no hay inventario', async () => {
      await expect(
        (service as any).validarLoteDestino(
          makeManager({ detalles: [{ productoId: 'producto-1' }] }),
          'producto-1',
          'lote-1',
          'lote-destino',
        ),
      ).resolves.toBeUndefined();
    });

    it('rechaza un lote sin asociación a producto', async () => {
      await expect(
        (service as any).validarLoteDestino(
          makeManager(),
          'producto-1',
          'lote-1',
          'lote-destino',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
