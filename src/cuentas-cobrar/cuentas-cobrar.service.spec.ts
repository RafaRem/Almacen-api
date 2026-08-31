import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CuentasCobrarService } from './cuentas-cobrar.service';

describe('CuentasCobrarService', () => {
  let service: CuentasCobrarService;
  let mockQuery: jest.Mock;

  const cuentaMock = (overrides: any = {}) => ({
    id: 'cta-1',
    cliente_id: 'cli-1',
    venta_id: 'ven-1',
    monto_original: '3200.00',
    monto_pendiente: '3200.00',
    credito_a_favor: '0.00',
    id_status: 1,
    fecha_vencimiento: '2026-09-30',
    observaciones: null,
    created_at: new Date(),
    updated_at: new Date(),
    nombre: 'Edgar',
    apellidoPaterno: 'Rembao',
    apellidoMaterno: 'Quintero',
    empresa: null,
    limite: '60000.00',
    saldo_actual: '0.00',
    cliente_credito_a_favor: '0.00',
    ...overrides,
  });

  beforeEach(async () => {
    mockQuery = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuentasCobrarService,
        { provide: DataSource, useValue: { query: mockQuery } },
      ],
    }).compile();

    service = module.get(CuentasCobrarService);
  });

  describe('aplicarAbono', () => {
    const cuentaId = 'cta-1';
    const usuarioId = 'user-1';

    it('pago parcial: reduce montoPendiente sin cambiar status a PAGADA', async () => {
      mockQuery
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '3200.00', id_status: 1 })])
        .mockResolvedValueOnce([]) // INSERT abono
        .mockResolvedValueOnce([]); // UPDATE cuenta

      const result = await service.aplicarAbono(cuentaId, 1000, usuarioId);

      expect(result.cuenta.idStatus).toBe(1);
      expect(result.abono.monto).toBe(1000);
      expect(result.abono.excedente).toBe(0);

      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[1][0]).toBe(2200); // nuevo pendiente
      expect(updateCall[1][1]).toBe(1); // status sigue PENDIENTE
    });

    it('pago parcial: registra abono con monto correcto', async () => {
      mockQuery
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '3200.00', id_status: 1 })])
        .mockResolvedValueOnce([]) // INSERT abono
        .mockResolvedValueOnce([]); // UPDATE cuenta

      await service.aplicarAbono(cuentaId, 500, usuarioId);

      const insertAbonoCall = mockQuery.mock.calls[1];
      expect(insertAbonoCall[0]).toContain('INSERT INTO abono');
      expect(insertAbonoCall[1][2]).toBe(500); // monto
      expect(insertAbonoCall[1][3]).toBe(0); // excedente
    });

    it('liquida cuenta: marca como PAGADA cuando abono >= montoPendiente', async () => {
      mockQuery
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '3200.00', id_status: 1 })])
        .mockResolvedValueOnce([]) // INSERT abono
        .mockResolvedValueOnce([]); // UPDATE cuenta

      const result = await service.aplicarAbono(cuentaId, 3200, usuarioId);

      expect(result.cuenta.montoPendiente).toBe(0);
      expect(result.cuenta.idStatus).toBe(2);

      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[1][0]).toBe(0); // nuevo pendiente
      expect(updateCall[1][1]).toBe(2); // status = PAGADA
    });

    it('liquida cuenta: funciona con abono mayor al pendiente por redondeo', async () => {
      mockQuery
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '1000.00', id_status: 1 })])
        .mockResolvedValueOnce([]) // INSERT abono
        .mockResolvedValueOnce([]); // UPDATE cuenta

      const result = await service.aplicarAbono(cuentaId, 1000.01, usuarioId);

      expect(result.cuenta.montoPendiente).toBe(0);
      expect(result.cuenta.idStatus).toBe(2);
    });

    it('con excedente: acredita diferencia a credito_a_favor del cliente', async () => {
      mockQuery
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '1000.00', id_status: 1 })])
        .mockResolvedValueOnce([]) // INSERT abono
        .mockResolvedValueOnce([]) // UPDATE cuenta
        .mockResolvedValueOnce([]) // UPSERT creditos
        .mockResolvedValueOnce([]); // INSERT movimientos_credito

      const result = await service.aplicarAbono(cuentaId, 1500, usuarioId);

      expect(result.abono.monto).toBe(1500);
      expect(result.abono.excedente).toBe(500);
      expect(result.cuenta.creditoAFavor).toBe(500);

      const upsertCall = mockQuery.mock.calls[3];
      expect(upsertCall[0]).toContain('creditos');
      expect(upsertCall[1][2]).toBe(500); // excedente
    });

    it('con excedente: crea movimiento_credito con tipo USO', async () => {
      mockQuery
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '500.00', id_status: 1 })])
        .mockResolvedValueOnce([]) // INSERT abono
        .mockResolvedValueOnce([]) // UPDATE cuenta
        .mockResolvedValueOnce([]) // UPSERT creditos
        .mockResolvedValueOnce([]); // INSERT movimientos_credito

      await service.aplicarAbono(cuentaId, 1000, usuarioId);

      const movCall = mockQuery.mock.calls[4];
      expect(movCall[0]).toContain('INSERT INTO movimientos_credito');
      expect(movCall[1]).toContain('USO');
      expect(movCall[1][4]).toContain('Abono'); // observaciones contiene "Abono"
    });

    it('con excedente: no crea montoPendiente negativo', async () => {
      mockQuery
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '1000.00', id_status: 1 })])
        .mockResolvedValueOnce([]) // INSERT abono
        .mockResolvedValueOnce([]) // UPDATE cuenta
        .mockResolvedValueOnce([]) // UPSERT creditos
        .mockResolvedValueOnce([]); // INSERT movimientos_credito

      const result = await service.aplicarAbono(cuentaId, 5000, usuarioId);

      expect(result.cuenta.montoPendiente).toBe(0);
      expect(result.cuenta.idStatus).toBe(2);

      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[1][0]).toBe(0); // nunca negativo
    });

    it('lanza BadRequestException si cuenta ya esta PAGADA', async () => {
      mockQuery.mockResolvedValueOnce([
        cuentaMock({ id_status: 2, monto_pendiente: '0.00' }),
      ]);

      await expect(service.aplicarAbono(cuentaId, 100, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si cuenta esta CANCELADA', async () => {
      mockQuery.mockResolvedValueOnce([
        cuentaMock({ id_status: 4, monto_pendiente: '1000.00' }),
      ]);

      await expect(service.aplicarAbono(cuentaId, 100, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza monto <= 0', async () => {
      mockQuery
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '1000.00' })])
        .mockResolvedValueOnce([cuentaMock({ monto_pendiente: '1000.00' })]);

      await expect(service.aplicarAbono(cuentaId, 0, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.aplicarAbono(cuentaId, -100, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza monto NaN', async () => {
      mockQuery.mockResolvedValueOnce([
        cuentaMock({ monto_pendiente: '1000.00' }),
      ]);

      await expect(service.aplicarAbono(cuentaId, NaN, usuarioId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza monto undefined', async () => {
      mockQuery.mockResolvedValueOnce([
        cuentaMock({ monto_pendiente: '1000.00' }),
      ]);

      await expect(
        service.aplicarAbono(cuentaId, undefined as any, usuarioId),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si cuenta no existe', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(service.aplicarAbono(cuentaId, 100, usuarioId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('marcarPagada', () => {
    it('establece monto_pendiente = 0 e id_status = 2', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // UPDATE
        .mockResolvedValueOnce([
          {
            id: 'cta-1',
            cliente_id: 'cli-1',
            monto_original: '500.00',
            monto_pendiente: '0.00',
            id_status: 2,
            created_at: new Date(),
          },
        ]);

      const result = await service.marcarPagada('cta-1');

      expect(result.idStatus).toBe(2);
      expect(result.montoPendiente).toBe(0);

      expect(mockQuery.mock.calls.length).toBe(2);
      const [updateCall, selectCall] = mockQuery.mock.calls;
      expect(updateCall[0]).toContain('UPDATE cuenta_por_cobrar');
      expect(updateCall[1]).toEqual(['cta-1']); // params: [id]
      expect(selectCall[0]).toContain('SELECT');
      expect(selectCall[1]).toEqual(['cta-1']); // params: [id]
    });

    it('lanza NotFoundException si cuenta no existe', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // UPDATE
        .mockResolvedValueOnce([]); // SELECT returns empty

      await expect(service.marcarPagada('cta-noexiste')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResumen', () => {
    it('retorna totales agregados de cuentas por status', async () => {
      mockQuery.mockResolvedValueOnce([
        { id_status: 1, monto_pendiente: '5000.00', credito_a_favor: '0.00' },
        { id_status: 1, monto_pendiente: '5000.00', credito_a_favor: '0.00' },
        { id_status: 3, monto_pendiente: '3000.00', credito_a_favor: '0.00' },
        { id_status: 2, monto_pendiente: '0.00', credito_a_favor: '500.00' },
      ]);

      const result = await service.getResumen();

      expect(result.totalPendiente).toBe(10000);
      expect(result.totalVencido).toBe(3000);
      expect(result.countPendiente).toBe(2);
      expect(result.countVencido).toBe(1);
    });

    it('retorna ceros cuando no hay cuentas', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await service.getResumen();

      expect(result.totalPendiente).toBe(0);
      expect(result.totalVencido).toBe(0);
      expect(result.totalCreditoAFavor).toBe(0);
    });
  });

  describe('abonosPorCuenta', () => {
    it('retorna abonos ordenados por fecha DESC', async () => {
      const now = new Date();
      mockQuery.mockResolvedValueOnce([
        {
          id: 'abono-2',
          cuenta_cobrar_id: 'cta-1',
          monto: '500.00',
          excedente: '0.00',
          observaciones: 'segundo',
          fecha: new Date(now.getTime() - 86400000),
          usuario_id: 'user-1',
          created_at: new Date(now.getTime() - 86400000),
        },
        {
          id: 'abono-1',
          cuenta_cobrar_id: 'cta-1',
          monto: '300.00',
          excedente: '0.00',
          observaciones: 'primero',
          fecha: now,
          usuario_id: 'user-1',
          created_at: now,
        },
      ]);

      const result = await service.abonosPorCuenta('cta-1');

      expect(result).toHaveLength(2);
      expect(result[0].monto).toBe(500);
      expect(result[1].monto).toBe(300);
    });

    it('retorna arreglo vacio si no hay abonos', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await service.abonosPorCuenta('cta-sin-abonos');

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('retorna cuentas con JOIN a clientes y creditos, incluyendo creditoDisponible', async () => {
      mockQuery.mockResolvedValueOnce([
        cuentaMock({
          monto_original: '5000.00',
          monto_pendiente: '2000.00',
          id_status: 1,
          cliente_credito_a_favor: '200.00',
        }),
      ]);

      const result = await service.findAll({});

      expect(result).toHaveLength(1);
      expect(result[0].clienteNombre).toBe('Edgar Rembao Quintero');
      expect(result[0].creditoDisponible).toBe(60200); // 60000 limite + 200 a favor
      expect(result[0].montoOriginal).toBe(5000);
      expect(result[0].montoPendiente).toBe(2000);
    });

    it('filtra por status cuando se proporciona', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await service.findAll({ status: 2 });

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('c.id_status = $');
      expect(queryCall[1][0]).toBe(2);
    });

    it('filtra por clienteId cuando se proporciona', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await service.findAll({ clienteId: 'cli-123' });

      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('c.cliente_id = $');
      expect(queryCall[1][0]).toBe('cli-123');
    });
  });

  describe('findOne', () => {
    it('retorna cuenta con cliente y creditoDisponible', async () => {
      mockQuery.mockResolvedValueOnce([
        cuentaMock({
          monto_original: '3200.00',
          monto_pendiente: '3200.00',
          id_status: 1,
          cliente_credito_a_favor: '0.00',
        }),
      ]);

      const result = await service.findOne('cta-1');

      expect(result.id).toBe('cta-1');
      expect(result.clienteNombre).toBe('Edgar Rembao Quintero');
      expect(result.creditoDisponible).toBe(60000);
      expect(result.montoOriginal).toBe(3200);
      expect(result.montoPendiente).toBe(3200);
    });

    it('lanza NotFoundException si no existe', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(service.findOne('cta-noexiste')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('crea cuenta por cobrar y retorna con id generado', async () => {
      const createdAt = new Date();
      mockQuery
        .mockResolvedValueOnce([]) // INSERT
        .mockResolvedValueOnce([
          {
            id: 'cta-new',
            cliente_id: 'cli-1',
            monto_original: '5000.00',
            monto_pendiente: '5000.00',
            id_status: 1,
            created_at: createdAt,
          },
        ]);

      const createDto = {
        clienteId: 'cli-1',
        ventaId: 'ven-1',
        montoOriginal: 5000,
        montoPendiente: 5000,
        idStatus: 1,
        fechaVencimiento: '2026-09-30',
      };

      const result = await service.create(createDto as any);

      expect(result.clienteId).toBe('cli-1');
      expect(result.montoOriginal).toBe(5000);
      expect(result.montoPendiente).toBe(5000);
      expect(result.idStatus).toBe(1);

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO cuenta_por_cobrar');
    });
  });
});
