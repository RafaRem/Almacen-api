import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { ProductoPresentacion } from './entities/producto-presentacion.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { PresentacionesService } from './presentaciones.service';
import { EmpaqueEstado } from '../common/enums/empaque-estado.enum';
import { PreciosLoteService } from '../precios-lote/precios-lote.service';
import {
  createMockRepository,
  MockRepository,
} from '../test-utils/mock-repository';

describe('PresentacionesService aliases', () => {
  let service: PresentacionesService;
  let productoRepository: MockRepository<Producto>;
  let presentacionRepository: MockRepository<ProductoPresentacion>;

  const presentaciones = [
    {
      id: 'presentacion-pieza',
      productoId: 'producto-1',
      nombre: 'Pieza',
      alias: null,
      tipo: 'PIEZA',
      factorUnidades: 1,
    },
    {
      id: 'presentacion-caja',
      productoId: 'producto-1',
      nombre: 'Caja',
      alias: null,
      tipo: 'CAJA',
      factorUnidades: 12,
    },
  ] as ProductoPresentacion[];

  beforeEach(async () => {
    productoRepository = createMockRepository<Producto>();
    presentacionRepository = createMockRepository<ProductoPresentacion>();
    productoRepository.findOne?.mockResolvedValue({ id: 'producto-1' });
    presentacionRepository.find?.mockResolvedValue(
      presentaciones.map((presentacion) => ({ ...presentacion })),
    );
    presentacionRepository.save?.mockImplementation((items) =>
      Promise.resolve(items),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresentacionesService,
        {
          provide: getRepositoryToken(Producto),
          useValue: productoRepository,
        },
        {
          provide: getRepositoryToken(ProductoPresentacion),
          useValue: presentacionRepository,
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
          provide: PreciosLoteService,
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: { manager: {} },
        },
      ],
    }).compile();

    service = module.get(PresentacionesService);
  });

  describe('validarRecepcionCaja', () => {
    it('bloquea recepción de caja si el producto no convertido ya tiene stock', async () => {
      const manager = {
        getRepository: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(3),
        }),
      } as any;

      await expect(
        service.validarRecepcionCaja(
          {
            id: 'producto-1',
            nombre: 'Producto legacy',
            empaqueEstado: EmpaqueEstado.PENDIENTE_FACTOR,
          } as any,
          12,
          manager,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite convertir un producto sin stock', async () => {
      const manager = {
        getRepository: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(0),
        }),
      } as any;

      await expect(
        service.validarRecepcionCaja(
          {
            id: 'producto-1',
            nombre: 'Producto legacy',
            empaqueEstado: EmpaqueEstado.FACTOR_ASIGNADO,
          } as any,
          12,
          manager,
        ),
      ).resolves.toBeUndefined();
    });

    it('permite recibir caja si el producto es solo pieza y conserva stock', async () => {
      const inventarioRepo = {
        count: jest.fn().mockResolvedValue(5),
        find: jest.fn().mockResolvedValue([{ loteId: 'lote-1' }]),
      };
      const loteRepo = {
        find: jest.fn().mockResolvedValue([
          {
            id: 'lote-1',
            piezasPorCaja: null,
            empaqueConvertido: false,
          },
        ]),
      };
      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          if (entity === InventarioAlmacen) return inventarioRepo;
          if (entity === Lote) return loteRepo;
          return null;
        }),
        save: jest.fn((_entity: unknown, data: any) => Promise.resolve(data)),
      } as any;

      await expect(
        service.validarRecepcionCaja(
          {
            id: 'producto-1',
            nombre: 'Producto solo pieza',
            empaqueEstado: EmpaqueEstado.PENDIENTE_FACTOR,
            piezasPorCajaDefault: 1,
            claveUnidad: 'H87',
          } as any,
          12,
          manager,
        ),
      ).resolves.toBeUndefined();

      expect(manager.save).toHaveBeenCalledWith(
        Lote,
        expect.objectContaining({
          piezasPorCaja: 1,
          empaqueConvertido: true,
        }),
      );
    });

    it('rechaza un factor distinto en producto ya convertido', async () => {
      const manager = { getRepository: jest.fn() } as any;

      await expect(
        service.validarRecepcionCaja(
          {
            id: 'producto-1',
            nombre: 'Producto convertido',
            empaqueEstado: EmpaqueEstado.CONVERTIDO,
            piezasPorCajaDefault: 12,
          } as any,
          24,
          manager,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('trims aliases and clears blank values', async () => {
    const result = await service.updateAliases('producto-1', [
      { id: 'presentacion-pieza', alias: '  Suero coco  ' },
      { id: 'presentacion-caja', alias: '   ' },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'presentacion-pieza',
        alias: 'Suero coco',
      }),
      expect.objectContaining({
        id: 'presentacion-caja',
        alias: null,
      }),
    ]);
  });

  it('rejects presentations from another product', async () => {
    presentacionRepository.find?.mockResolvedValue([presentaciones[0]]);

    await expect(
      service.updateAliases('producto-1', [
        { id: 'presentacion-pieza', alias: 'Pieza' },
        { id: 'presentacion-ajena', alias: 'Otra' },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects aliases longer than 80 characters', async () => {
    await expect(
      service.updateAliases('producto-1', [
        { id: 'presentacion-pieza', alias: 'x'.repeat(81) },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects products that do not exist', async () => {
    productoRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.updateAliases('producto-1', [
        { id: 'presentacion-pieza', alias: 'Pieza' },
      ]),
    ).rejects.toThrow(NotFoundException);
  });

  describe('clasificación de solo pieza', () => {
    const evaluar = (producto: any, lotes: any[] = [], caja = false) =>
      (service as any).esStockSoloPieza(producto, lotes, caja);

    it('clasifica H87 sin evidencia de caja como solo pieza', () => {
      expect(
        evaluar({
          claveUnidad: 'H87',
          piezasPorCajaDefault: null,
        }),
      ).toBe(true);
    });

    it('no clasifica H87 con factor de caja como solo pieza', () => {
      expect(
        evaluar({
          claveUnidad: 'H87',
          piezasPorCajaDefault: 12,
        }),
      ).toBe(false);
    });

    it('no clasifica como solo pieza si un lote tiene factor de caja', () => {
      expect(
        evaluar(
          {
            claveUnidad: 'H87',
            piezasPorCajaDefault: null,
          },
          [{ piezasPorCaja: 24, empaqueConvertido: false }],
        ),
      ).toBe(false);
    });

    it('no clasifica unidades ajenas como solo pieza', () => {
      expect(
        evaluar({
          claveUnidad: 'AB',
          piezasPorCajaDefault: null,
        }),
      ).toBe(false);
    });

    it('detecta lotes ya convertidos', () => {
      expect(
        (service as any).lotesYaConvertidos([{ empaqueConvertido: true }]),
      ).toBe(true);
    });
  });

  describe('saveFactor()', () => {
    it('guarda factor 1 para producto solo pieza', async () => {
      const producto = {
        id: 'producto-1',
        nombre: 'Producto solo pieza',
        empaqueEstado: EmpaqueEstado.PENDIENTE_FACTOR,
        piezasPorCajaDefault: null,
      } as Producto;
      productoRepository.findOne?.mockResolvedValue(producto);
      productoRepository.save?.mockImplementation((item) =>
        Promise.resolve(item),
      );

      const result = await service.saveFactor('producto-1', 1);

      expect(result.piezasPorCajaDefault).toBe(1);
      expect(result.empaqueEstado).toBe(EmpaqueEstado.FACTOR_ASIGNADO);
    });

    it('rechaza factor 0', async () => {
      await expect(service.saveFactor('producto-1', 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza convertir a solo pieza un producto ya convertido', async () => {
      productoRepository.findOne?.mockResolvedValue({
        id: 'producto-1',
        empaqueEstado: EmpaqueEstado.CONVERTIDO,
        piezasPorCajaDefault: 12,
      } as Producto);

      await expect(service.saveFactor('producto-1', 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('excluye productos solo pieza de empaques pendientes', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    productoRepository.createQueryBuilder = jest.fn(() => queryBuilder);

    await service.findPendientes('', 'PENDIENTES');

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(producto.piezasPorCajaDefault IS NULL OR producto.piezasPorCajaDefault > 1)',
    );
  });
});
