import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DescuentosService } from './descuentos.service';
import { Descuento } from './entities/descuento.entity';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';
import { DescuentoProducto } from './entities/descuento-producto.entity';
import { DescuentoTipo } from '../common/enums/descuento-tipo.enum';
import { StatusId } from '../common/enums/status-id.enum';
import { NotFoundException } from '@nestjs/common';

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockCatRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockDescuentoProductoRepository = {
  find: jest.fn(),
};

describe('DescuentosService', () => {
  let service: DescuentosService;
  let repository: Repository<Descuento>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DescuentosService,
        {
          provide: getRepositoryToken(Descuento),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(CategoriaCliente),
          useValue: mockCatRepository,
        },
        {
          provide: getRepositoryToken(DescuentoProducto),
          useValue: mockDescuentoProductoRepository,
        },
      ],
    }).compile();

    service = module.get<DescuentosService>(DescuentosService);
    repository = module.get<Repository<Descuento>>(
      getRepositoryToken(Descuento),
    );
    jest.resetAllMocks();
    mockDescuentoProductoRepository.find.mockResolvedValue([]);
  });

  const createDescuento = (overrides: Partial<Descuento> = {}): Descuento => ({
    id: 'desc-' + Math.random().toString(36).substr(2, 9),
    nombre: undefined,
    descripcion: undefined,
    tipo: DescuentoTipo.VOLUMEN,
    porcentaje: 0,
    monto: null,
    condiciones: null,
    prioridad: 1,
    acumulable: false,
    statusId: 1,
    laboratorioId: null,
    categoriaClienteId: null,
    fechaInicio: null,
    fechaFin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('calcularDescuentosAcumulables', () => {
    const laboratorioId = 'lab-123';
    const categoriaClienteId = 'cat-5';

    describe('VOLUMEN discount', () => {
      it('should apply VOLUMEN only when cantidad meets minCantidad', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 5 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const resultLessThan5 = await service.calcularDescuentosAcumulables(
          'prod-1',
          3,
          laboratorioId,
        );
        expect(resultLessThan5.descuentoProducto).toBeNull();

        const resultExactly5 = await service.calcularDescuentosAcumulables(
          'prod-1',
          5,
          laboratorioId,
        );
        expect(resultExactly5.descuentoProducto?.porcentaje).toBe(10);
      });

      it('should respect maxCantidad condition', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 3, maxCantidad: 10 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const resultWithinRange = await service.calcularDescuentosAcumulables(
          'prod-1',
          5,
          laboratorioId,
        );
        expect(resultWithinRange.descuentoProducto?.porcentaje).toBe(10);

        const resultAboveMax = await service.calcularDescuentosAcumulables(
          'prod-1',
          15,
          laboratorioId,
        );
        expect(resultAboveMax.descuentoProducto).toBeNull();
      });

      it('should calculate VOLUMEN via fixed monto when provided', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            monto: 50,
            condiciones: { minCantidad: 1 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          undefined,
          undefined,
          100,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.monto).toBe(50);
        expect(result.descuentoProducto?.precioConDescuento).toBe(50);
      });
    });

    describe('product discounts (VOLUMEN, CADUCIDAD, LABORATORIO)', () => {
      it('should select only the BEST product discount (highest percentage)', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-1',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 3 },
          }),
          createDescuento({
            id: 'desc-2',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 15,
            condiciones: { minCantidad: 3 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          5,
          laboratorioId,
          undefined,
          undefined,
          100,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.porcentaje).toBe(15);
        expect(result.descuentoProducto?.descuentoId).toBe('desc-2');
      });

      it('should NOT accumulate multiple product discounts', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 3 },
          }),
          createDescuento({
            id: 'desc-lab',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 5,
            laboratorioId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          5,
          laboratorioId,
          undefined,
          undefined,
          100,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.porcentaje).toBe(10);
        expect(result.descuentoCategoria).toBeNull();
      });
    });

    describe('CADUCIDAD discount', () => {
      const within30Days = new Date();
      within30Days.setDate(within30Days.getDate() + 15);

      const outside30Days = new Date();
      outside30Days.setDate(outside30Days.getDate() + 90);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      it('should apply CADUCIDAD within diasPrevios range', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-cad',
            tipo: DescuentoTipo.CADUCIDAD,
            porcentaje: 8,
            condiciones: { diasPrevios: 30 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          undefined,
          within30Days,
          100,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.tipo).toBe(DescuentoTipo.CADUCIDAD);
        expect(result.descuentoProducto?.porcentaje).toBe(8);
      });

      it('should NOT apply CADUCIDAD when days until expiry exceed diasPrevios', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-cad',
            tipo: DescuentoTipo.CADUCIDAD,
            porcentaje: 8,
            condiciones: { diasPrevios: 30 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          undefined,
          outside30Days,
          100,
        );

        expect(result.descuentoProducto).toBeNull();
      });

      it('should NOT apply CADUCIDAD when product is already expired', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-cad',
            tipo: DescuentoTipo.CADUCIDAD,
            porcentaje: 8,
            condiciones: { diasPrevios: 30 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          undefined,
          pastDate,
          100,
        );

        expect(result.descuentoProducto).toBeNull();
      });

      it('should prefer VOLUMEN over CADUCIDAD when percentage is higher', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 1 },
          }),
          createDescuento({
            id: 'desc-cad',
            tipo: DescuentoTipo.CADUCIDAD,
            porcentaje: 8,
            condiciones: { diasPrevios: 30 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const nearExpiry = new Date();
        nearExpiry.setDate(nearExpiry.getDate() + 10);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          undefined,
          nearExpiry,
          100,
        );

        expect(result.descuentoProducto?.tipo).toBe(DescuentoTipo.VOLUMEN);
        expect(result.descuentoProducto?.porcentaje).toBe(10);
      });
    });

    describe('LABORATORIO discount', () => {
      it('should apply only when laboratorioId matches', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-lab',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 5,
            laboratorioId: 'other-lab',
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
        );
        expect(result.descuentoProducto).toBeNull();
      });

      it('should apply when laboratorioId matches', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-lab',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 5,
            laboratorioId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
        );
        expect(result.descuentoProducto?.porcentaje).toBe(5);
      });

      it('should apply LABORATORIO only within fechaInicio/fechaFin range', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);

        const descuentos = [
          createDescuento({
            id: 'desc-lab',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 5,
            laboratorioId,
            fechaInicio: yesterday,
            fechaFin: tomorrow,
          }),
          createDescuento({
            id: 'desc-expired',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 10,
            laboratorioId,
            fechaInicio: lastMonth,
            fechaFin: yesterday,
          }),
          createDescuento({
            id: 'desc-future',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 15,
            laboratorioId,
            fechaInicio: tomorrow,
            fechaFin: nextYear,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.descuentoId).toBe('desc-lab');
        expect(result.descuentoProducto?.porcentaje).toBe(5);
      });

      it('should apply LABORATORIO when no date range is set', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-lab',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 5,
            laboratorioId,
            fechaInicio: null,
            fechaFin: null,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
        );
        expect(result.descuentoProducto?.porcentaje).toBe(5);
      });
    });

    describe('CATEGORIA discount', () => {
      beforeEach(() => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'Categoria 5',
          descuento: 15,
          statusId: 1,
        });
      });

      it('should accumulate category discount WITH product discount', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 3 },
          }),
          createDescuento({
            id: 'desc-cat',
            tipo: DescuentoTipo.CATEGORIA,
            porcentaje: 15,
            categoriaClienteId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          5,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.porcentaje).toBe(10);
        expect(result.descuentoCategoria).not.toBeNull();
        expect(result.descuentoCategoria?.porcentaje).toBe(15);
      });

      it('should use categoriaCliente.descuento (from categorias_cliente table)', async () => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'VIP',
          descuento: 20,
          statusId: 1,
        });

        mockRepository.find.mockResolvedValue([]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.descuentoCategoria).not.toBeNull();
        expect(result.descuentoCategoria?.porcentaje).toBe(20);
        expect(result.descuentoCategoria?.monto).toBe(20);
      });

      it('should not apply category discount when categoria not found', async () => {
        mockCatRepository.findOne.mockResolvedValue(null);

        mockRepository.find.mockResolvedValue([]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );
        expect(result.descuentoCategoria).toBeNull();
      });

      it('should not apply category discount when categoria.descuento is 0', async () => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'Zero',
          descuento: 0,
          statusId: 1,
        });

        mockRepository.find.mockResolvedValue([]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );
        expect(result.descuentoCategoria).toBeNull();
      });

      it('should skip category lookup when no categoriaClienteId provided', async () => {
        mockRepository.find.mockResolvedValue([]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          undefined,
          undefined,
          100,
        );
        expect(result.descuentoCategoria).toBeNull();
        expect(mockCatRepository.findOne).not.toHaveBeenCalled();
      });
    });

    describe('date validation', () => {
      describe('VOLUMEN with fechaInicio/fechaFin', () => {
        it('should apply when current date is within range', async () => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          const descuentos = [
            createDescuento({
              id: 'desc-vol',
              tipo: DescuentoTipo.VOLUMEN,
              porcentaje: 10,
              condiciones: { minCantidad: 1 },
              fechaInicio: yesterday,
              fechaFin: tomorrow,
            }),
          ];
          mockRepository.find.mockResolvedValue(descuentos);

          const result = await service.calcularDescuentosAcumulables(
            'prod-1',
            1,
            laboratorioId,
          );

          expect(result.descuentoProducto).not.toBeNull();
          expect(result.descuentoProducto?.porcentaje).toBe(10);
        });

        it('should NOT apply when date range is in the past', async () => {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          const descuentos = [
            createDescuento({
              id: 'desc-vol',
              tipo: DescuentoTipo.VOLUMEN,
              porcentaje: 10,
              condiciones: { minCantidad: 1 },
              fechaInicio: lastMonth,
              fechaFin: yesterday,
            }),
          ];
          mockRepository.find.mockResolvedValue(descuentos);

          const result = await service.calcularDescuentosAcumulables(
            'prod-1',
            1,
            laboratorioId,
          );

          expect(result.descuentoProducto).toBeNull();
        });

        it('should NOT apply when date range is in the future', async () => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);

          const descuentos = [
            createDescuento({
              id: 'desc-vol',
              tipo: DescuentoTipo.VOLUMEN,
              porcentaje: 10,
              condiciones: { minCantidad: 1 },
              fechaInicio: tomorrow,
              fechaFin: nextYear,
            }),
          ];
          mockRepository.find.mockResolvedValue(descuentos);

          const result = await service.calcularDescuentosAcumulables(
            'prod-1',
            1,
            laboratorioId,
          );

          expect(result.descuentoProducto).toBeNull();
        });

        it('should apply when no date range is set', async () => {
          const descuentos = [
            createDescuento({
              id: 'desc-vol',
              tipo: DescuentoTipo.VOLUMEN,
              porcentaje: 10,
              condiciones: { minCantidad: 1 },
              fechaInicio: null,
              fechaFin: null,
            }),
          ];
          mockRepository.find.mockResolvedValue(descuentos);

          const result = await service.calcularDescuentosAcumulables(
            'prod-1',
            1,
            laboratorioId,
          );

          expect(result.descuentoProducto).not.toBeNull();
          expect(result.descuentoProducto?.porcentaje).toBe(10);
        });
      });

      describe('CADUCIDAD with fechaInicio/fechaFin', () => {
        const within30Days = new Date();
        within30Days.setDate(within30Days.getDate() + 15);

        it('should apply when date range is active', async () => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          const descuentos = [
            createDescuento({
              id: 'desc-cad',
              tipo: DescuentoTipo.CADUCIDAD,
              porcentaje: 8,
              condiciones: { diasPrevios: 30 },
              fechaInicio: yesterday,
              fechaFin: tomorrow,
            }),
          ];
          mockRepository.find.mockResolvedValue(descuentos);

          const result = await service.calcularDescuentosAcumulables(
            'prod-1',
            1,
            laboratorioId,
            undefined,
            within30Days,
            100,
          );

          expect(result.descuentoProducto).not.toBeNull();
          expect(result.descuentoProducto?.tipo).toBe(DescuentoTipo.CADUCIDAD);
        });

        it('should NOT apply when date range has expired', async () => {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          const descuentos = [
            createDescuento({
              id: 'desc-cad',
              tipo: DescuentoTipo.CADUCIDAD,
              porcentaje: 8,
              condiciones: { diasPrevios: 30 },
              fechaInicio: lastMonth,
              fechaFin: yesterday,
            }),
          ];
          mockRepository.find.mockResolvedValue(descuentos);

          const result = await service.calcularDescuentosAcumulables(
            'prod-1',
            1,
            laboratorioId,
            undefined,
            within30Days,
            100,
          );

          expect(result.descuentoProducto).toBeNull();
        });
      });

      describe('CATEGORIA ignores fechaInicio/fechaFin', () => {
        it('should still apply when dates are set (category assignment controls eligibility)', async () => {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          mockCatRepository.findOne.mockResolvedValue({
            id: categoriaClienteId,
            nombre: 'Vip',
            descuento: 15,
            statusId: 1,
          });

          const descuentos = [
            createDescuento({
              id: 'desc-cat',
              tipo: DescuentoTipo.CATEGORIA,
              porcentaje: 15,
              categoriaClienteId,
              fechaInicio: lastMonth,
              fechaFin: yesterday,
            }),
          ];
          mockRepository.find.mockResolvedValue(descuentos);

          const result = await service.calcularDescuentosAcumulables(
            'prod-1',
            1,
            laboratorioId,
            categoriaClienteId,
            undefined,
            100,
          );

          expect(result.descuentoCategoria).not.toBeNull();
          expect(result.descuentoCategoria?.porcentaje).toBe(15);
        });
      });
    });

    describe('30% cap', () => {
      beforeEach(() => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'Categoria 5',
          descuento: 20,
          statusId: 1,
        });
      });

      it('should cap total discount at 30% of precioOriginal', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-1',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 20,
            condiciones: { minCantidad: 1 },
          }),
          createDescuento({
            id: 'desc-cat',
            tipo: DescuentoTipo.CATEGORIA,
            porcentaje: 20,
            categoriaClienteId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.descuentoTotal).toBe(30);
        expect(result.excedeLimite).toBe(true);
      });

      it('should NOT cap when under 30%', async () => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'Categoria 5',
          descuento: 15,
          statusId: 1,
        });
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 1 },
          }),
          createDescuento({
            id: 'desc-cat',
            tipo: DescuentoTipo.CATEGORIA,
            porcentaje: 15,
            categoriaClienteId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.descuentoTotal).toBeCloseTo(23.5, 1);
        expect(result.excedeLimite).toBe(false);
      });

      it('should include both descuentoProducto and descuentoCategoria when capped', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 25,
            condiciones: { minCantidad: 1 },
          }),
          createDescuento({
            id: 'desc-cat',
            tipo: DescuentoTipo.CATEGORIA,
            porcentaje: 15,
            categoriaClienteId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoCategoria).not.toBeNull();
        expect(result.descuentoTotal).toBe(30);
        expect(result.excedeLimite).toBe(true);
        expect(result.precioFinal).toBe(70);
      });
    });

    describe('output structure', () => {
      it('should return descuentosAplicables when discounts apply', async () => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'Categoria 5',
          descuento: 15,
          statusId: 1,
        });
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 1 },
          }),
          createDescuento({
            id: 'desc-cat',
            tipo: DescuentoTipo.CATEGORIA,
            porcentaje: 15,
            categoriaClienteId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.descuentosAplicables).toHaveLength(2);
        expect(result.descuentosAplicables[0].esProducto).toBe(true);
        expect(result.descuentosAplicables[1].esProducto).toBe(false);
        expect(result.descuentosAplicables[0].tipo).toBe(DescuentoTipo.VOLUMEN);
        expect(result.descuentosAplicables[1].tipo).toBe(
          DescuentoTipo.CATEGORIA,
        );
      });

      it('should populate porcentajeEfectivo correctly', async () => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'Categoria 5',
          descuento: 15,
          statusId: 1,
        });
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 1 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.porcentajeEfectivo).toBeCloseTo(23.5, 1);
        expect(result.precioOriginal).toBe(100);
        expect(result.precioFinal).toBeCloseTo(76.5, 1);
      });

      it('should handle precioVentaUnitario=0 gracefully', async () => {
        mockRepository.find.mockResolvedValue([]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          5,
          laboratorioId,
          undefined,
          undefined,
          0,
        );

        expect(result.precioOriginal).toBe(0);
        expect(result.precioFinal).toBe(0);
        expect(result.descuentoTotal).toBe(0);
        expect(result.porcentajeEfectivo).toBe(0);
        expect(result.excedeLimite).toBe(false);
      });

      it('should handle no categoriaClienteId (only product discount)', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 1 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          undefined,
          undefined,
          100,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoCategoria).toBeNull();
        expect(result.descuentoTotal).toBe(10);
        expect(result.porcentajeEfectivo).toBe(10);
      });
    });

    describe('Escenario 1 - Volumen + Categoría montos exactos', () => {
      beforeEach(() => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'Categoria 5',
          descuento: 15,
          statusId: 1,
        });
      });

      it('should calculate exact amounts: 5×$61.20, volumen 10% + categoría 15%', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 5 },
          }),
          createDescuento({
            id: 'desc-cat',
            tipo: DescuentoTipo.CATEGORIA,
            porcentaje: 15,
            categoriaClienteId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const precioVenta = 61.2;
        const cantidad = 5;
        const subtotal = precioVenta * cantidad;

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          cantidad,
          laboratorioId,
          categoriaClienteId,
          undefined,
          precioVenta,
        );

        expect(result.precioOriginal).toBeCloseTo(306, 1);
        expect(result.descuentoProducto?.porcentaje).toBe(10);
        expect(result.descuentoCategoria?.porcentaje).toBe(15);
        expect(result.descuentoProducto?.monto).toBeCloseTo(30.6, 1);
        expect(result.descuentoProducto?.precioConDescuento).toBeCloseTo(
          275.4,
          1,
        );
        expect(result.descuentoCategoria?.monto).toBeCloseTo(41.31, 1);
        expect(result.descuentoTotal).toBeCloseTo(71.91, 1);
        expect(result.precioFinal).toBeCloseTo(234.09, 1);
        expect(result.porcentajeEfectivo).toBeCloseTo(23.5, 1);
        expect(result.excedeLimite).toBe(false);
      });
    });

    describe('Escenario 2 - Laboratorio + Categoría', () => {
      beforeEach(() => {
        mockCatRepository.findOne.mockResolvedValue({
          id: categoriaClienteId,
          nombre: 'Categoria 5',
          descuento: 15,
          statusId: 1,
        });
      });

      it('should accumulate LABORATORIO 5% + CATEGORÍA 15% with correct amounts', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-lab',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 5,
            laboratorioId,
          }),
          createDescuento({
            id: 'desc-cat',
            tipo: DescuentoTipo.CATEGORIA,
            porcentaje: 15,
            categoriaClienteId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.tipo).toBe(DescuentoTipo.LABORATORIO);
        expect(result.descuentoProducto?.porcentaje).toBe(5);
        expect(result.descuentoCategoria).not.toBeNull();
        expect(result.descuentoCategoria?.porcentaje).toBe(15);
        expect(result.descuentoTotal).toBeCloseTo(19.25, 1);
        expect(result.precioFinal).toBeCloseTo(80.75, 1);
        expect(result.porcentajeEfectivo).toBeCloseTo(19.25, 1);
        expect(result.excedeLimite).toBe(false);
      });

      it('should include both in descuentosAplicables', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-lab',
            tipo: DescuentoTipo.LABORATORIO,
            porcentaje: 5,
            laboratorioId,
          }),
          createDescuento({
            id: 'desc-cat',
            tipo: DescuentoTipo.CATEGORIA,
            porcentaje: 15,
            categoriaClienteId,
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
          categoriaClienteId,
          undefined,
          100,
        );

        expect(result.descuentosAplicables).toHaveLength(2);
        const labDesc = result.descuentosAplicables.find((d) => d.esProducto);
        expect(labDesc?.tipo).toBe(DescuentoTipo.LABORATORIO);
        expect(labDesc?.porcentaje).toBe(5);
        const catDesc = result.descuentosAplicables.find((d) => !d.esProducto);
        expect(catDesc?.tipo).toBe(DescuentoTipo.CATEGORIA);
        expect(catDesc?.porcentaje).toBe(15);
      });
    });

    describe('descuentos_productos', () => {
      it('should NOT apply discount assigned to a different product', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 1 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);
        mockDescuentoProductoRepository.find.mockResolvedValue([
          { descuentoId: 'desc-vol', productoId: 'other-prod', statusId: 1 },
        ]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
        );

        expect(result.descuentoProducto).toBeNull();
      });

      it('should apply discount assigned to the same product', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 1 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);
        mockDescuentoProductoRepository.find.mockResolvedValue([
          { descuentoId: 'desc-vol', productoId: 'prod-1', statusId: 1 },
        ]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.porcentaje).toBe(10);
      });

      it('should apply discounts without any product assignments to all products', async () => {
        const descuentos = [
          createDescuento({
            id: 'desc-vol',
            tipo: DescuentoTipo.VOLUMEN,
            porcentaje: 10,
            condiciones: { minCantidad: 1 },
          }),
        ];
        mockRepository.find.mockResolvedValue(descuentos);
        mockDescuentoProductoRepository.find.mockResolvedValue([]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.porcentaje).toBe(10);
      });
    });

    describe('no discounts', () => {
      it('should return null when no discounts available', async () => {
        mockRepository.find.mockResolvedValue([]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          laboratorioId,
        );

        expect(result.descuentoProducto).toBeNull();
        expect(result.descuentoCategoria).toBeNull();
        expect(result.descuentoTotal).toBe(0);
      });
    });
  });

  describe('previewProductDiscount', () => {
    it('should return null when no discounts apply', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.previewProductDiscount(
        'prod-1',
        1,
        100,
        16,
        20,
        'lab-x',
      );

      expect(result).toBeNull();
    });

    it('should calculate preview with product and category discounts', async () => {
      mockCatRepository.findOne.mockResolvedValue({
        id: 'cat-5',
        nombre: 'VIP',
        descuento: 15,
        statusId: 1,
      });
      const descuentos = [
        {
          id: 'desc-vol',
          nombre: undefined,
          descripcion: undefined,
          tipo: DescuentoTipo.VOLUMEN,
          porcentaje: 10,
          monto: null,
          condiciones: { minCantidad: 1 },
          prioridad: 1,
          acumulable: false,
          statusId: 1,
          laboratorioId: null,
          categoriaClienteId: null,
          fechaInicio: null,
          fechaFin: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockRepository.find.mockResolvedValue(descuentos);

      const result = await service.previewProductDiscount(
        'prod-1',
        5,
        45,
        16,
        20,
        'lab-x',
        'cat-5',
      );

      expect(result).not.toBeNull();
      expect(result!.tieneDescuento).toBe(true);
      expect(result!.descuentoProducto).not.toBeNull();
      expect(result!.descuentoCategoria).not.toBeNull();
    });

    it('should handle category-only discount', async () => {
      mockCatRepository.findOne.mockResolvedValue({
        id: 'cat-5',
        nombre: 'VIP',
        descuento: 15,
        statusId: 1,
      });
      mockRepository.find.mockResolvedValue([]);

      const result = await service.previewProductDiscount(
        'prod-1',
        1,
        100,
        16,
        20,
        'lab-x',
        'cat-5',
      );

      expect(result).not.toBeNull();
      expect(result!.tieneDescuento).toBe(true);
      expect(result!.descuentoProducto).toBeNull();
      expect(result!.descuentoCategoria).not.toBeNull();
    });

    it('should apply CADUCIDAD when fechaCaducidad is provided', async () => {
      const nearExpiry = new Date();
      nearExpiry.setDate(nearExpiry.getDate() + 10);

      const descuentos = [
        {
          id: 'desc-cad',
          nombre: undefined,
          descripcion: undefined,
          tipo: DescuentoTipo.CADUCIDAD,
          porcentaje: 8,
          monto: null,
          condiciones: { diasPrevios: 30 },
          prioridad: 1,
          acumulable: false,
          statusId: 1,
          laboratorioId: null,
          categoriaClienteId: null,
          fechaInicio: null,
          fechaFin: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockRepository.find.mockResolvedValue(descuentos);

      const result = await service.previewProductDiscount(
        'prod-1',
        1,
        100,
        16,
        20,
        'lab-x',
        undefined,
        nearExpiry,
      );

      expect(result).not.toBeNull();
      expect(result!.tieneDescuento).toBe(true);
      expect(result!.descuentoProducto?.tipo).toBe(DescuentoTipo.CADUCIDAD);
      expect(result!.descuentoProducto?.porcentaje).toBe(8);
    });

    it('should NOT apply CADUCIDAD when fechaCaducidad is far out', async () => {
      const farExpiry = new Date();
      farExpiry.setDate(farExpiry.getDate() + 90);

      const descuentos = [
        {
          id: 'desc-cad',
          nombre: undefined,
          descripcion: undefined,
          tipo: DescuentoTipo.CADUCIDAD,
          porcentaje: 8,
          monto: null,
          condiciones: { diasPrevios: 30 },
          prioridad: 1,
          acumulable: false,
          statusId: 1,
          laboratorioId: null,
          categoriaClienteId: null,
          fechaInicio: null,
          fechaFin: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockRepository.find.mockResolvedValue(descuentos);

      const result = await service.previewProductDiscount(
        'prod-1',
        1,
        100,
        16,
        20,
        'lab-x',
        undefined,
        farExpiry,
      );

      expect(result).toBeNull();
    });
  });

  describe('CRUD', () => {
    const mockDescuento: Descuento = {
      id: 'desc-1',
      nombre: 'Test',
      descripcion: null,
      tipo: DescuentoTipo.VOLUMEN,
      porcentaje: 10,
      monto: null,
      condiciones: { minCantidad: 5 },
      prioridad: 1,
      acumulable: false,
      statusId: StatusId.ACTIVE,
      laboratorioId: null,
      categoriaClienteId: null,
      fechaInicio: null,
      fechaFin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('create', () => {
      it('should create a new descuento', async () => {
        const dto = {
          tipo: DescuentoTipo.VOLUMEN,
          porcentaje: 10,
          condiciones: { minCantidad: 5 },
        };
        mockRepository.create.mockReturnValue(mockDescuento);
        mockRepository.save.mockResolvedValue(mockDescuento);

        const result = await service.create(dto as any);

        expect(mockRepository.create).toHaveBeenCalledWith(dto);
        expect(mockRepository.save).toHaveBeenCalledWith(mockDescuento);
        expect(result).toEqual(mockDescuento);
      });
    });

    describe('findAll', () => {
      it('should return all descuentos', async () => {
        mockRepository.find.mockResolvedValue([mockDescuento]);

        const result = await service.findAll();

        expect(result).toEqual([mockDescuento]);
        expect(mockRepository.find).toHaveBeenCalled();
      });
    });

    describe('findOne', () => {
      it('should return a descuento by id', async () => {
        mockRepository.findOne.mockResolvedValue(mockDescuento);

        const result = await service.findOne('desc-1');

        expect(result).toEqual(mockDescuento);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'desc-1' },
        });
      });

      it('should throw NotFoundException when not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('nonexistent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('update', () => {
      it('should update an existing descuento', async () => {
        mockRepository.findOne.mockResolvedValue(mockDescuento);
        const updateDto = { porcentaje: 20 };
        const updated = { ...mockDescuento, porcentaje: 20 };
        mockRepository.save.mockResolvedValue(updated);

        const result = await service.update('desc-1', updateDto as any);

        expect(result.porcentaje).toBe(20);
        expect(mockRepository.save).toHaveBeenCalled();
      });
    });

    describe('remove', () => {
      it('should remove a descuento', async () => {
        mockRepository.findOne.mockResolvedValue(mockDescuento);
        mockRepository.remove.mockResolvedValue(mockDescuento);

        await service.remove('desc-1');

        expect(mockRepository.remove).toHaveBeenCalledWith(mockDescuento);
      });

      it('should throw NotFoundException when removing nonexistent', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.remove('nonexistent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('findByLaboratorio', () => {
      it('should find LABORATORIO discounts by lab id with date range', async () => {
        mockRepository.find.mockResolvedValue([mockDescuento]);

        const result = await service.findByLaboratorio('lab-1');

        expect(result).toEqual([mockDescuento]);
        expect(mockRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              laboratorioId: 'lab-1',
              tipo: DescuentoTipo.LABORATORIO,
              statusId: 1,
            }),
          }),
        );
      });
    });
  });
});
