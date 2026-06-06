import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { VentasService } from './ventas.service';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { PagoVenta } from './entities/pago-venta.entity';
import { DescuentoVentaDetalle } from '../descuentos/entities/descuento-venta-detalle.entity';
import { ProductosService } from '../productos/productos.service';
import { LotesService } from '../lotes/lotes.service';
import { DescuentosService } from '../descuentos/descuentos.service';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { MovimientosAlmacenService } from '../movimientos-almacen/movimientos-almacen.service';
import { ConfiguracionesService } from '../configuraciones/configuraciones.service';
import { ClientesService } from '../clientes/clientes.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { MetodoPago } from '../common/enums/metodo-pago.enum';

const mockVentasRepository = {
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ maxFolio: 42 }),
  })),
};

const mockDetallesRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockPagosRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockDescuentosVentaDetalleRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockProductosService = {
  findOne: jest.fn(),
};

const mockDescuentosService = {
  calcularDescuentosAcumulables: jest.fn(),
};

const mockInventarioAlmacenService = {
  findByProductoId: jest.fn(),
  reducirStockFIFO: jest.fn(),
  getStockTotal: jest.fn(),
};

const mockConfiguracionesService = {
  getIvaGlobal: jest.fn(),
};

const mockClientesService = {
  findOne: jest.fn(),
};

const mockLotesService = {
  findOne: jest.fn(),
};

const mockMovimientosAlmacenService = {
  create: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

describe('VentasService', () => {
  let service: VentasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VentasService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: 'VentaRepository', useValue: mockVentasRepository },
        { provide: 'DetalleVentaRepository', useValue: mockDetallesRepository },
        { provide: 'PagoVentaRepository', useValue: mockPagosRepository },
        { provide: 'DescuentoVentaDetalleRepository', useValue: mockDescuentosVentaDetalleRepository },
        { provide: ProductosService, useValue: mockProductosService },
        { provide: DescuentosService, useValue: mockDescuentosService },
        { provide: InventarioAlmacenService, useValue: mockInventarioAlmacenService },
        { provide: MovimientosAlmacenService, useValue: mockMovimientosAlmacenService },
        { provide: ConfiguracionesService, useValue: mockConfiguracionesService },
        { provide: ClientesService, useValue: mockClientesService },
        { provide: LotesService, useValue: mockLotesService },
      ],
    }).compile();

    service = module.get<VentasService>(VentasService);
    jest.clearAllMocks();
  });

  describe('getNextFolio()', () => {
    it('should call nextval sequence', async () => {
      mockVentasRepository.query = jest.fn().mockResolvedValue([{ folio: 43 }]);
      const folio = await service.getNextFolio();
      expect(folio).toBe(43);
      expect(mockVentasRepository.query).toHaveBeenCalledWith(
        `SELECT nextval('ventas_folio_seq') AS folio`,
      );
    });
  });

  describe('convertirMetodoPago()', () => {
    it('should convert MetodoPago.EFECTIVO to FormaPago.EFECTIVO', () => {
      const result = service.convertirMetodoPago(MetodoPago.EFECTIVO);
      expect(result).toBe('01');
    });

    it('should convert MetodoPago.TARJETA to FormaPago.TARJETA', () => {
      const result = service.convertirMetodoPago(MetodoPago.TARJETA);
      expect(result).toBe('04');
    });

    it('should convert MetodoPago.TRANSFERENCIA to FormaPago.TRANSFERENCIA', () => {
      const result = service.convertirMetodoPago(MetodoPago.TRANSFERENCIA);
      expect(result).toBe('03');
    });

    it('should convert MetodoPago.CLIENTE_CUENTA to FormaPago.EFECTIVO (fallback)', () => {
      const result = service.convertirMetodoPago(MetodoPago.CLIENTE_CUENTA);
      expect(result).toBe('01');
    });
  });

  describe('convertirFormaPagoAMetodoPago()', () => {
    it('should convert 01 to MetodoPago.EFECTIVO', () => {
      const result = service.convertirFormaPagoAMetodoPago('01');
      expect(result).toBe(MetodoPago.EFECTIVO);
    });

    it('should convert 04 to MetodoPago.TARJETA', () => {
      const result = service.convertirFormaPagoAMetodoPago('04');
      expect(result).toBe(MetodoPago.TARJETA);
    });

    it('should convert 03 to MetodoPago.TRANSFERENCIA', () => {
      const result = service.convertirFormaPagoAMetodoPago('03');
      expect(result).toBe(MetodoPago.TRANSFERENCIA);
    });
  });
});