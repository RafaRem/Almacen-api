import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import {
  createMockRepository,
  MockRepository,
} from '../test-utils/mock-repository';
import { Producto } from './entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { ProductosService } from './productos.service';
import { PresentacionesService } from './presentaciones.service';
import { PreciosLoteService } from '../precios-lote/precios-lote.service';

describe('ProductosService', () => {
  let service: ProductosService;
  let repository: MockRepository<Producto>;
  let loteRepository: MockRepository<Lote>;
  let inventarioService: {
    findByProducto: jest.Mock;
    actualizarPrecioVenta: jest.Mock;
    agregarStock: jest.Mock;
  };
  let presentacionesService: { ensurePresentations: jest.Mock };
  let preciosLoteService: { setPrecio: jest.Mock };

  const producto: Producto = {
    id: 'producto-1',
    nombre: 'Paracetamol',
    descripcion: 'Tabletas',
    codigoBarras: '7501234567890',
    laboratorioId: 'lab-1',
    laboratorio: null,
    stockMinimo: 10,
    stockMaximo: 100,
    margenRecomendado: 20,
    claveProdServ: null,
    claveUnidad: null,
    statusId: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    inventarioService = {
      findByProducto: jest.fn().mockResolvedValue([]),
      actualizarPrecioVenta: jest.fn().mockResolvedValue(undefined),
      agregarStock: jest.fn().mockResolvedValue({ id: 'inv-1' }),
    };
    presentacionesService = {
      ensurePresentations: jest.fn().mockResolvedValue([
        { id: 'presentacion-pieza', tipo: 'PIEZA' },
        { id: 'presentacion-caja', tipo: 'CAJA' },
      ]),
    };
    preciosLoteService = {
      setPrecio: jest.fn().mockResolvedValue({}),
    };

    const mockLoteRepo = createMockRepository<Lote>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductosService,
        {
          provide: getRepositoryToken(Producto),
          useValue: createMockRepository<Producto>(),
        },
        {
          provide: getRepositoryToken(Lote),
          useValue: mockLoteRepo,
        },
        {
          provide: InventarioAlmacenService,
          useValue: inventarioService,
        },
        {
          provide: PresentacionesService,
          useValue: presentacionesService,
        },
        {
          provide: PreciosLoteService,
          useValue: preciosLoteService,
        },
      ],
    }).compile();

    service = module.get(ProductosService);
    repository = module.get(getRepositoryToken(Producto));
    loteRepository = module.get(getRepositoryToken(Lote));
  });

  it('creates a product when codigoBarras is available', async () => {
    repository.findOne?.mockResolvedValue(null);
    repository.create?.mockReturnValue(producto);
    repository.save?.mockResolvedValue(producto);

    await expect(
      service.create({
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        laboratorioId: producto.laboratorioId,
      }),
    ).resolves.toEqual(producto);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { codigoBarras: producto.codigoBarras },
    });
  });

  it('rejects duplicate codigoBarras values', async () => {
    repository.findOne?.mockResolvedValue(producto);

    await expect(
      service.create({
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        laboratorioId: producto.laboratorioId,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws when a product does not exist', async () => {
    repository.findOne?.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('refreshes inventory prices when margenRecomendado changes', async () => {
    const inventario = { id: 'inventario-1' };
    repository.findOne?.mockResolvedValue({ ...producto });
    repository.save?.mockImplementation((entity: Producto) =>
      Promise.resolve(entity),
    );
    inventarioService.findByProducto.mockResolvedValue([inventario]);

    await expect(
      service.update(producto.id, { margenRecomendado: 30 }),
    ).resolves.toMatchObject({
      id: producto.id,
      margenRecomendado: 30,
    });

    expect(inventarioService.findByProducto).toHaveBeenCalledWith(producto.id);
    expect(inventarioService.actualizarPrecioVenta).toHaveBeenCalledWith(
      inventario,
    );
  });

  it('crea producto con stock en piezas, factor y precios por pieza/caja', async () => {
    repository.findOne?.mockResolvedValue(null);
    const productoGuardado = {
      ...producto,
      piezasPorCajaDefault: 12,
      empaqueEstado: 'CONVERTIDO',
    };
    const productoRepo = {
      create: jest.fn((data) => ({ ...data, id: producto.id })),
      save: jest.fn().mockResolvedValue(productoGuardado),
    };
    const loteRepo = {
      create: jest.fn((data) => ({ ...data, id: 'lote-1' })),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };
    const inventarioRepo = {
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Producto) return productoRepo;
        if (entity === Lote) return loteRepo;
        if (entity === InventarioAlmacen) return inventarioRepo;
        return null;
      }),
    };
    (repository as any).manager = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    inventarioService.agregarStock.mockResolvedValue({ id: 'inv-1' });

    await service.createConStock(
      {
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        laboratorioId: producto.laboratorioId,
        numeroLote: 'L-1',
        precioUnitarioLote: 10,
        cantidad: 24,
        piezasPorCaja: 12,
        precioVentaPieza: 15,
        ivaCfdi: 16,
        claveProdServ: '51101500',
        claveUnidad: 'h87',
      },
      'user-1',
    );

    expect(productoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        piezasPorCajaDefault: 12,
        empaqueEstado: 'CONVERTIDO',
        claveProdServ: '51101500',
        claveUnidad: 'H87',
        impuestoAplicado: '01',
      }),
    );
    expect(inventarioService.agregarStock).toHaveBeenCalledWith(
      producto.id,
      'lote-1',
      expect.anything(),
      24,
      16,
      10,
      manager,
      'ENTRADA_INICIAL',
      'user-1',
      15,
    );
    expect(preciosLoteService.setPrecio).toHaveBeenCalledTimes(2);
    expect(preciosLoteService.setPrecio).toHaveBeenCalledWith(
      expect.objectContaining({
        presentacionId: 'presentacion-pieza',
        precio: 15,
      }),
      manager,
    );
    expect(preciosLoteService.setPrecio).toHaveBeenCalledWith(
      expect.objectContaining({
        presentacionId: 'presentacion-caja',
        precio: 180,
      }),
      manager,
    );
  });

  it('crea producto solo pieza sin presentación de caja', async () => {
    repository.findOne?.mockResolvedValue(null);
    const productoRepo = {
      create: jest.fn((data) => ({ ...data, id: producto.id })),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };
    const loteRepo = {
      create: jest.fn((data) => ({ ...data, id: 'lote-1' })),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Producto) return productoRepo;
        if (entity === Lote) return loteRepo;
        return {
          save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
        };
      }),
    };
    (repository as any).manager = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    presentacionesService.ensurePresentations.mockResolvedValue([
      { id: 'presentacion-pieza', tipo: 'PIEZA' },
    ]);
    inventarioService.agregarStock.mockResolvedValue({ id: 'inv-1' });

    await service.createConStock(
      {
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        laboratorioId: producto.laboratorioId,
        numeroLote: 'L-2',
        precioUnitarioLote: 10,
        cantidad: 24,
        piezasPorCaja: 1,
        precioVentaPieza: 15,
        ivaCfdi: 0,
        claveProdServ: '51101500',
        claveUnidad: 'H87',
      },
      'user-1',
    );

    expect(productoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        piezasPorCajaDefault: 1,
        empaqueEstado: 'FACTOR_ASIGNADO',
        impuestoAplicado: '00',
      }),
    );
    expect(presentacionesService.ensurePresentations).toHaveBeenCalledWith(
      producto.id,
      1,
      manager,
    );
    expect(preciosLoteService.setPrecio).toHaveBeenCalledTimes(1);
  });

  it('checks barcode existence preserving input order', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          codigoBarras: producto.codigoBarras,
          nombre: producto.nombre,
          id: producto.id,
          margenRecomendado: producto.margenRecomendado,
        },
      ]),
    };
    repository.createQueryBuilder?.mockReturnValue(queryBuilder);

    const managerQB = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ productoId: producto.id }]),
    };
    (repository as any).manager = {
      createQueryBuilder: jest.fn(() => managerQB),
    };

    await expect(
      service.checkExistence([producto.codigoBarras, 'missing-code']),
    ).resolves.toEqual([
      {
        codigoBarras: producto.codigoBarras,
        existe: true,
        nombre: producto.nombre,
        margenRecomendado: 20,
        piezasPorCajaDefault: null,
        tieneInventario: true,
      },
      {
        codigoBarras: 'missing-code',
        existe: false,
        nombre: undefined,
        margenRecomendado: null,
        piezasPorCajaDefault: null,
        tieneInventario: false,
      },
    ]);
  });
});
