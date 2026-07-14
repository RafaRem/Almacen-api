import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken, getEntityManagerToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import {
  createMockRepository,
  MockRepository,
} from '../test-utils/mock-repository';
import { OrdenesCompraService } from './ordenes-compra.service';
import { OrdenCompra } from './entities/orden-compra.entity';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';

describe('OrdenesCompraService', () => {
  let service: OrdenesCompraService;
  let ordenesRepository: MockRepository<OrdenCompra>;
  let detallesRepository: MockRepository<DetalleOrdenCompra>;
  let lotesRepository: MockRepository<Lote>;
  let inventarioRepository: MockRepository<InventarioAlmacen>;
  let movimientoRepository: MockRepository<MovimientoAlmacen>;
  let productoRepository: MockRepository<Producto>;
  let mockEntityManager: any;

  const producto: Producto = {
    id: 'prod-1',
    nombre: 'Paracetamol',
    laboratorioId: 'lab-1',
    margenRecomendado: 20,
  } as Producto;

  const lote: Lote = {
    id: 'lote-1',
    numeroLote: 'L001',
    laboratorioId: 'lab-1',
  } as Lote;

  const detalle: DetalleOrdenCompra = {
    id: 'det-1',
    ordenCompraId: 'oc-1',
    productoId: 'prod-1',
    cantidad: 10,
    cantidadRecibida: 0,
    producto,
  } as DetalleOrdenCompra;

  const orden: OrdenCompra = {
    id: 'oc-1',
    folio: 'OC-20260705-001',
    proveedorId: 'prov-1',
    status: 'BORRADOR',
    detalles: [detalle],
  } as OrdenCompra;

  const mockManager = {
    findOne: jest.fn(),
    create: jest.fn((entity, data) => data),
    save: jest.fn((entity, data) => Promise.resolve(data || entity)),
    getRepository: jest.fn().mockReturnValue({
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
    }),
  };

  function mockQueryBuilder(returnValue: any) {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(returnValue),
      getMany: jest.fn().mockResolvedValue([returnValue]),
    };
    return jest.fn(() => qb);
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenesCompraService,
        {
          provide: getRepositoryToken(OrdenCompra),
          useValue: createMockRepository<OrdenCompra>(),
        },
        {
          provide: getRepositoryToken(DetalleOrdenCompra),
          useValue: createMockRepository<DetalleOrdenCompra>(),
        },
        {
          provide: getRepositoryToken(Lote),
          useValue: createMockRepository<Lote>(),
        },
        {
          provide: getRepositoryToken(InventarioAlmacen),
          useValue: createMockRepository<InventarioAlmacen>(),
        },
        {
          provide: getRepositoryToken(MovimientoAlmacen),
          useValue: createMockRepository<MovimientoAlmacen>(),
        },
        {
          provide: getRepositoryToken(Producto),
          useValue: createMockRepository<Producto>(),
        },
        {
          provide: getEntityManagerToken(),
          useValue: {
            transaction: jest.fn((cb) =>
              cb({
                findOne: jest.fn(),
                create: jest.fn((_entity: any, data: any) => data),
                save: jest.fn((_entity: any, data: any) =>
                  Promise.resolve(data),
                ),
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(OrdenesCompraService);
    ordenesRepository = module.get(getRepositoryToken(OrdenCompra));
    detallesRepository = module.get(getRepositoryToken(DetalleOrdenCompra));
    lotesRepository = module.get(getRepositoryToken(Lote));
    inventarioRepository = module.get(getRepositoryToken(InventarioAlmacen));
    movimientoRepository = module.get(getRepositoryToken(MovimientoAlmacen));
    productoRepository = module.get(getRepositoryToken(Producto));
  });

  describe('create()', () => {
    it('creates an order with BORRADOR status and auto-generated folio', async () => {
      ordenesRepository.createQueryBuilder = mockQueryBuilder(null);
      ordenesRepository.create = jest.fn().mockReturnValue(orden);
      ordenesRepository.save = jest.fn().mockResolvedValue(orden);
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);

      const result = await service.create({
        proveedorId: 'prov-1',
      });

      expect(result.status).toBe('BORRADOR');
      expect(result.folio).toContain('OC-');
      expect(ordenesRepository.save).toHaveBeenCalled();
    });

    it('creates order with detalles', async () => {
      ordenesRepository.createQueryBuilder = mockQueryBuilder(null);
      ordenesRepository.create = jest.fn().mockReturnValue(orden);
      ordenesRepository.save = jest.fn().mockResolvedValue(orden);
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      detallesRepository.create = jest.fn((d) => d);
      detallesRepository.save = jest.fn().mockResolvedValue([]);

      const result = await service.create({
        proveedorId: 'prov-1',
        detalles: [{ productoId: 'prod-1', cantidad: 5 }],
      });

      expect(detallesRepository.create).toHaveBeenCalled();
      expect(detallesRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    it('returns all orders without filters', async () => {
      ordenesRepository.createQueryBuilder = jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[orden], 1]),
      }));

      const result = await service.findAll();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by status', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[orden], 1]),
      };
      ordenesRepository.createQueryBuilder = jest.fn(() => qb);

      await service.findAll({ status: 'BORRADOR' });
      expect(qb.andWhere).toHaveBeenCalledWith('oc.status = :status', {
        status: 'BORRADOR',
      });
    });
  });

  describe('findOne()', () => {
    it('returns order when found', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      const result = await service.findOne('oc-1');
      expect(result).toEqual(orden);
    });

    it('throws NotFoundException when not found', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update()', () => {
    it('updates a BORRADOR order', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      ordenesRepository.save = jest.fn().mockResolvedValue(orden);

      const result = await service.update('oc-1', {
        observaciones: 'Updated',
      });
      expect(result).toBeDefined();
    });

    it('throws BadRequestException for non-BORRADOR order', async () => {
      const completedOrden = { ...orden, status: 'COMPLETADA' };
      ordenesRepository.findOne = jest.fn().mockResolvedValue(completedOrden);

      await expect(
        service.update('oc-1', { observaciones: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addDetalle()', () => {
    it('adds detalle to BORRADOR order', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      detallesRepository.create = jest.fn((d) => d);
      detallesRepository.save = jest.fn().mockResolvedValue({});

      const result = await service.addDetalle('oc-1', {
        productoId: 'prod-1',
        cantidad: 5,
      });
      expect(detallesRepository.create).toHaveBeenCalled();
    });

    it('throws for non-BORRADOR order', async () => {
      ordenesRepository.findOne = jest
        .fn()
        .mockResolvedValue({ ...orden, status: 'COMPLETADA' });

      await expect(
        service.addDetalle('oc-1', { productoId: 'prod-1', cantidad: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeDetalle()', () => {
    it('removes detalle from BORRADOR order', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      detallesRepository.delete = jest.fn().mockResolvedValue({});

      const result = await service.removeDetalle('oc-1', 'det-1');
      expect(detallesRepository.delete).toHaveBeenCalledWith('det-1');
    });
  });

  describe('cambiarStatus()', () => {
    it('changes status to valid value', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      ordenesRepository.save = jest.fn().mockResolvedValue(orden);

      const result = await service.cambiarStatus('oc-1', 'PENDIENTE');
      expect(result.status).toBe('PENDIENTE');
    });

    it('throws for invalid status', async () => {
      await expect(service.cambiarStatus('oc-1', 'INVALIDO')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('recibir()', () => {
    const recibirDto = {
      detalles: [
        {
          detalleId: 'det-1',
          cantidadRecibida: 5,
          numeroLote: 'L001',
          fechaCaducidad: '2026-12-31',
        },
      ],
    };

    it('receives items and creates MovimientoAlmacen', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      productoRepository.findOne = jest.fn().mockResolvedValue(producto);

      const txManager = {
        findOne: jest.fn(),
        create: jest.fn((_entity: any, data: any) => data),
        save: jest.fn((_entity: any, data: any) => Promise.resolve(data)),
      };

      const entityManager = {
        transaction: jest.fn((cb) => cb(txManager)),
      };
      // Override entityManager for this test
      (service as any).entityManager = entityManager;

      const result = await service.recibir('oc-1', recibirDto);

      expect(entityManager.transaction).toHaveBeenCalled();
    });

    it('throws when receiving more than ordered', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      productoRepository.findOne = jest.fn().mockResolvedValue(producto);

      await expect(
        service.recibir('oc-1', {
          detalles: [
            {
              detalleId: 'det-1',
              cantidadRecibida: 15,
              numeroLote: 'L001',
              fechaCaducidad: '2026-12-31',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('completes order when all items received', async () => {
      const completableDetalle = {
        ...detalle,
        cantidad: 5,
        cantidadRecibida: 0,
      } as DetalleOrdenCompra;
      const completableOrden = {
        ...orden,
        status: 'BORRADOR',
        detalles: [completableDetalle],
      };

      productoRepository.findOne = jest.fn().mockResolvedValue(producto);

      const updatedDetalle = {
        ...completableDetalle,
        cantidadRecibida: 5,
      } as DetalleOrdenCompra;
      const updatedOrden = {
        ...completableOrden,
        detalles: [updatedDetalle],
      };
      const completedOrden = {
        ...updatedOrden,
        status: 'COMPLETADA',
      };

      ordenesRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(completableOrden) // 1st: load in recibir
        .mockResolvedValueOnce(updatedOrden) // 2nd: load after transaction
        .mockResolvedValueOnce(completedOrden); // 3rd: final return
      ordenesRepository.save = jest.fn().mockResolvedValue(completedOrden);

      const txMgr = {
        findOne: jest.fn(),
        create: jest.fn((_e: any, d: any) => d),
        save: jest.fn((_e: any, d: any) => Promise.resolve(d)),
      };
      (service as any).entityManager = {
        transaction: jest.fn((cb) => cb(txMgr)),
      };

      const result = await service.recibir('oc-1', {
        detalles: [
          {
            detalleId: 'det-1',
            cantidadRecibida: 5,
            numeroLote: 'L002',
            fechaCaducidad: '2026-12-31',
          },
        ],
      });
      expect(result.status).toBe('COMPLETADA');
    });

    it('throws when order is already completed', async () => {
      ordenesRepository.findOne = jest
        .fn()
        .mockResolvedValue({ ...orden, status: 'COMPLETADA' });

      await expect(
        service.recibir('oc-1', {
          detalles: [
            {
              detalleId: 'det-1',
              cantidadRecibida: 1,
              numeroLote: 'L001',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting status CANCELADA', async () => {
      ordenesRepository.findOne = jest.fn().mockResolvedValue(orden);
      ordenesRepository.save = jest
        .fn()
        .mockResolvedValue({ ...orden, status: 'CANCELADA' });

      await service.remove('oc-1');
      expect(ordenesRepository.save).toHaveBeenCalled();
    });

    it('throws when trying to delete COMPLETADA order', async () => {
      ordenesRepository.findOne = jest
        .fn()
        .mockResolvedValue({ ...orden, status: 'COMPLETADA' });

      await expect(service.remove('oc-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reabastecer()', () => {
    const productoConProveedor: Producto = {
      id: 'prod-1',
      nombre: 'Paracetamol',
      laboratorioId: 'lab-1',
      stockMaximo: 100,
      proveedorPreferidoId: 'prov-1',
      proveedorPreferido: { id: 'prov-1', nombre: 'Proveedor A' } as Proveedor,
    } as Producto;

    const productoSinProveedor: Producto = {
      id: 'prod-2',
      nombre: 'Ibuprofeno',
      laboratorioId: 'lab-1',
      stockMaximo: 100,
      proveedorPreferidoId: null,
      proveedorPreferido: null,
    } as Producto;

    const mockProveedores = [
      { id: 'prov-1', nombre: 'Proveedor A' },
      { id: 'prov-2', nombre: 'Proveedor B' },
    ] as Proveedor[];

    beforeEach(() => {
      (service as any).entityManager = {
        transaction: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
      };
      detallesRepository.findOne = jest.fn();
      detallesRepository.create = jest.fn();
      detallesRepository.save = jest.fn();
    });

    it('throws NotFoundException when product not found', async () => {
      productoRepository.findOne = jest.fn().mockResolvedValue(null);
      await expect(
        service.reabastecer({ productoId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when stock is sufficient', async () => {
      productoRepository.findOne = jest
        .fn()
        .mockResolvedValue(productoConProveedor);
      inventarioRepository.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 200 }),
      }));

      await expect(
        service.reabastecer({ productoId: 'prod-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns requiresProveedor when no proveedor and no fallback', async () => {
      productoRepository.findOne = jest
        .fn()
        .mockResolvedValue(productoSinProveedor);
      inventarioRepository.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValueOnce(null) // fallback query: no recepcion
          .mockResolvedValueOnce({ total: 30 }), // stock query
      }));
      (service as any).entityManager.find = jest
        .fn()
        .mockResolvedValue(mockProveedores);

      const result = await service.reabastecer({ productoId: 'prod-2' });

      expect(result).toEqual({
        requiresProveedor: true,
        proveedores: mockProveedores,
        producto: { id: 'prod-2', nombre: 'Ibuprofeno' },
      });
    });

    it('auto-asigna proveedor when proveedorId is provided', async () => {
      productoRepository.findOne = jest
        .fn()
        .mockResolvedValue(productoSinProveedor);
      (service as any).entityManager.findOne = jest
        .fn()
        .mockResolvedValue(mockProveedores[1]);
      productoRepository.update = jest.fn().mockResolvedValue({});
      inventarioRepository.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ total: 30 }),
      }));
      ordenesRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(orden);
      ordenesRepository.create = jest.fn().mockReturnValue(orden);
      ordenesRepository.save = jest.fn().mockResolvedValue(orden);
      ordenesRepository.createQueryBuilder = mockQueryBuilder(null);

      const result = await service.reabastecer({
        productoId: 'prod-2',
        proveedorId: 'prov-2',
      });

      expect(productoRepository.update).toHaveBeenCalledWith('prod-2', {
        proveedorPreferidoId: 'prov-2',
      });
      expect(result.esNueva).toBe(true);
    });

    it('suma cantidad cuando producto ya existe en OC', async () => {
      productoRepository.findOne = jest
        .fn()
        .mockResolvedValue(productoConProveedor);
      inventarioRepository.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 30 }),
      }));
      ordenesRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(orden)
        .mockResolvedValue(orden);
      detallesRepository.findOne = jest
        .fn()
        .mockResolvedValue({ ...detalle, cantidad: 10 });

      const result = await service.reabastecer({ productoId: 'prod-1' });

      expect(result.yaExistia).toBe(true);
      expect(result.cantidad).toBeGreaterThan(0);
    });

    it('agrega nuevo detalle cuando OC existe pero producto no está en ella', async () => {
      const spyAddDetalle = jest
        .spyOn(service, 'addDetalle' as any)
        .mockResolvedValue({
          ...orden,
          detalles: [{ ...detalle, cantidad: 70 }],
        } as any);

      productoRepository.findOne = jest
        .fn()
        .mockResolvedValue(productoConProveedor);
      inventarioRepository.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 30 }),
      }));
      ordenesRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce({ ...orden, detalles: [] }) // OC check
        .mockResolvedValue({
          ...orden,
          detalles: [{ ...detalle, cantidad: 70 }],
        }); // final
      detallesRepository.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.reabastecer({ productoId: 'prod-1' });

      expect(result.yaExistia).toBe(false);
      expect(result.esNueva).toBe(false);
      expect(spyAddDetalle).toHaveBeenCalled();
      spyAddDetalle.mockRestore();
    });

    it('crea nueva OC cuando no hay BORRADOR del proveedor', async () => {
      productoRepository.findOne = jest
        .fn()
        .mockResolvedValue(productoConProveedor);
      inventarioRepository.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 30 }),
      }));
      ordenesRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(orden);
      ordenesRepository.create = jest.fn().mockReturnValue(orden);
      ordenesRepository.save = jest.fn().mockResolvedValue(orden);
      ordenesRepository.createQueryBuilder = mockQueryBuilder(null);

      const result = await service.reabastecer({ productoId: 'prod-1' });

      expect(result.esNueva).toBe(true);
      expect(result.yaExistia).toBe(false);
      expect(result.orden).toBeDefined();
    });
  });
});
