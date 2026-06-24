import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import {
  createMockRepository,
  MockRepository,
} from '../test-utils/mock-repository';
import { Producto } from './entities/producto.entity';
import { ProductosService } from './productos.service';

describe('ProductosService', () => {
  let service: ProductosService;
  let repository: MockRepository<Producto>;
  let inventarioService: {
    findByProducto: jest.Mock;
    actualizarPrecioVenta: jest.Mock;
  };

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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductosService,
        {
          provide: getRepositoryToken(Producto),
          useValue: createMockRepository<Producto>(),
        },
        {
          provide: InventarioAlmacenService,
          useValue: inventarioService,
        },
      ],
    }).compile();

    service = module.get(ProductosService);
    repository = module.get(getRepositoryToken(Producto));
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
        loteId: 'lote-1',
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
        loteId: 'lote-1',
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
        tieneInventario: true,
      },
      { codigoBarras: 'missing-code', existe: false, nombre: undefined, tieneInventario: false },
    ]);
  });
});
