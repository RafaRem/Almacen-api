import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { InventarioAlmacenService } from './inventario-almacen.service';
import { InventarioAlmacen } from './entities/inventario-almacen.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';

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
});
