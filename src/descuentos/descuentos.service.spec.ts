import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DescuentosService } from './descuentos.service';
import { Descuento } from './entities/descuento.entity';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';
import { DescuentoTipo } from '../common/enums/descuento-tipo.enum';

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
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
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DescuentosService>(DescuentosService);
    repository = module.get<Repository<Descuento>>(getRepositoryToken(Descuento));
    jest.clearAllMocks();
  });

  describe('calcularDescuentosAcumulables', () => {
    const laboratorioId = 'lab-123';
    const categoriaClienteId = 'cat-5';

    const createDescuento = (overrides: Partial<Descuento> = {}): Descuento => ({
      id: 'desc-' + Math.random().toString(36).substr(2, 9),
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
      ...overrides,
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
          100,
          laboratorioId,
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
          100,
          laboratorioId,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.porcentaje).toBe(10);
        expect(result.descuentoCategoria).toBeNull();
      });
    });

    describe('category discounts (CATEGORIA)', () => {
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
          100,
          laboratorioId,
          categoriaClienteId,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoProducto?.porcentaje).toBe(10);
        expect(result.descuentoCategoria).not.toBeNull();
        expect(result.descuentoCategoria?.porcentaje).toBe(15);
      });

      it('should apply category discount on precioOriginal (not reduced base)', async () => {
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
          100,
          laboratorioId,
          categoriaClienteId,
        );

        expect(result.descuentoProducto).not.toBeNull();
        expect(result.descuentoCategoria).not.toBeNull();
        expect(result.descuentoTotal).toBe(25);
        expect(result.precioOriginal).toBe(100);
      });
    });

    describe('30% cap', () => {
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
          100,
          laboratorioId,
          categoriaClienteId,
        );

        expect(result.descuentoTotal).toBe(30);
        expect(result.excedeLimite).toBe(true);
      });

      it('should NOT cap when under 30%', async () => {
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
          100,
          laboratorioId,
          categoriaClienteId,
        );

        expect(result.descuentoTotal).toBe(25);
        expect(result.excedeLimite).toBe(false);
      });
    });

    describe('VOLUMEN discount conditions', () => {
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
          100,
          laboratorioId,
        );
        expect(resultLessThan5.descuentoProducto).toBeNull();

        const resultExactly5 = await service.calcularDescuentosAcumulables(
          'prod-1',
          5,
          100,
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
          100,
          laboratorioId,
        );
        expect(resultWithinRange.descuentoProducto?.porcentaje).toBe(10);

        const resultAboveMax = await service.calcularDescuentosAcumulables(
          'prod-1',
          15,
          100,
          laboratorioId,
        );
        expect(resultAboveMax.descuentoProducto).toBeNull();
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
          100,
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
          100,
          laboratorioId,
        );
        expect(result.descuentoProducto?.porcentaje).toBe(5);
      });
    });

    describe('no discounts', () => {
      it('should return null when no discounts available', async () => {
        mockRepository.find.mockResolvedValue([]);

        const result = await service.calcularDescuentosAcumulables(
          'prod-1',
          1,
          100,
          laboratorioId,
        );

        expect(result.descuentoProducto).toBeNull();
        expect(result.descuentoCategoria).toBeNull();
        expect(result.descuentoTotal).toBe(0);
      });
    });
  });
});