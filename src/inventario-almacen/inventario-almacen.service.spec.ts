import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { InventarioAlmacenService } from './inventario-almacen.service';
import { InventarioAlmacen } from './entities/inventario-almacen.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { DetalleLote } from '../detalle-lote/entities/detalle-lote.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { BadRequestException } from '@nestjs/common';

describe('InventarioAlmacenService', () => {
  let service: InventarioAlmacenService;

  const mockInventarioRepository = {};
  const mockProductoRepository = {};
  const mockLoteRepository = {};
  const mockMovimientoRepository = {};
  const mockDataSource = {};

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
          provide: getRepositoryToken(MovimientoAlmacen),
          useValue: mockMovimientoRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InventarioAlmacenService>(InventarioAlmacenService);
  });

  describe('updatePrecioVenta()', () => {
    it('actualiza el margen del producto desde el precio del lote', async () => {
      const inventario = {
        id: 'inv-1',
        productoId: 'prod-1',
        precioUnitarioLote: 100,
        precioVenta: 100,
        lote: { numeroLote: 'L1' },
      };
      (mockInventarioRepository as any).findOne = jest
        .fn()
        .mockResolvedValue(inventario);
      (mockInventarioRepository as any).save = jest
        .fn()
        .mockResolvedValue(inventario);
      (mockProductoRepository as any).update = jest
        .fn()
        .mockResolvedValue({});

      await service.updatePrecioVenta('inv-1', 125);

      expect(mockProductoRepository.update).toHaveBeenCalledWith('prod-1', {
        margenRecomendado: 25,
      });
    });
  });

  describe('queryLotesPorFIFO (via reducirStockFIFO)', () => {
    it('debe usar FOR UPDATE (pessimistic_write) al consultar lotes', async () => {
      const mockGetMany = jest.fn().mockResolvedValue([]);
      const mockSetLock = jest.fn().mockReturnValue({ getMany: mockGetMany });
      const mockOrderBy = jest.fn().mockReturnValue({ setLock: mockSetLock });
      const mockAndWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockWhere = jest.fn().mockReturnValue({ andWhere: mockAndWhere });
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
          undefined,
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
      expect(mockOrderBy).toHaveBeenCalledWith('lote.fechaCaducidad', 'ASC');
      expect(mockSetLock).toHaveBeenCalledWith('pessimistic_write');
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
