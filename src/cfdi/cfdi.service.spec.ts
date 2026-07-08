import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CfdiService } from './cfdi.service';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Laboratorio } from '../laboratorios/entities/laboratorio.entity';
import { Recepcion } from '../recepciones/entities/recepcion.entity';
import { OrdenCompra } from '../ordenes-compra/entities/orden-compra.entity';
import { DetalleOrdenCompra } from '../ordenes-compra/entities/detalle-orden-compra.entity';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { DetalleLoteService } from '../detalle-lote/detalle-lote.service';
import { ProveedoresService } from '../proveedores/proveedores.service';
import { RecepcionesService } from '../recepciones/recepciones.service';

const mockProductoRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const mockLoteRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const mockLaboratorioRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const mockRecepcionRepository = {
  create: jest.fn(),
  save: jest.fn(),
};
const mockInventarioAlmacenService = {
  agregarStock: jest.fn().mockResolvedValue({ ultimoMovimientoId: 'mov-1' }),
};
const mockDetalleLoteService = {
  create: jest.fn(),
};
const mockProveedoresService = {
  findByRfc: jest.fn(),
  create: jest.fn(),
};
const mockRecepcionesService = {
  create: jest.fn(),
  findByUuid: jest.fn().mockResolvedValue(null),
};
const mockOrdenCompraRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};
const mockDetalleOrdenCompraRepository = {
  update: jest.fn(),
};

const mockManager = {
  getRepository: jest.fn().mockImplementation((entity) => {
    if (entity === Producto) return mockProductoRepository;
    if (entity === Lote) return mockLoteRepository;
    if (entity === Laboratorio) return mockLaboratorioRepository;
    if (entity === Recepcion) return mockRecepcionRepository;
    if (entity === OrdenCompra) return mockOrdenCompraRepository;
    if (entity === DetalleOrdenCompra) return mockDetalleOrdenCompraRepository;
    return {};
  }),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: mockManager,
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Serie="A" Folio="12345" Fecha="2026-06-01T12:00:00" SubTotal="1000.00" Total="1160.00">
  <cfdi:Emisor Rfc="LAB123456789" Nombre="Laboratorio Test"/>
  <cfdi:Conceptos>
    <cfdi:Concepto Cantidad="10" NoIdentificacion="PROD001" Descripcion="Producto Test 1" ValorUnitario="50.00" ClaveProdServ="51101700" ClaveUnidad="H87" Importe="500.00">
      <cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="500.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="80.00"/></cfdi:Traslados></cfdi:Impuestos>
    </cfdi:Concepto>
    <cfdi:Concepto Cantidad="5" NoIdentificacion="PROD002" Descripcion="Producto Test 2" ValorUnitario="100.00" ClaveProdServ="51101700" ClaveUnidad="H87" Importe="500.00">
      <cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="500.00" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="80.00"/></cfdi:Traslados></cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital UUID="ABC12345-1234-5678-9ABC-DEF012345678"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

describe('CfdiService', () => {
  let service: CfdiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CfdiService,
        { provide: getRepositoryToken(Producto), useValue: mockProductoRepository },
        { provide: getRepositoryToken(Lote), useValue: mockLoteRepository },
        { provide: getRepositoryToken(Laboratorio), useValue: mockLaboratorioRepository },
        { provide: InventarioAlmacenService, useValue: mockInventarioAlmacenService },
        { provide: DetalleLoteService, useValue: mockDetalleLoteService },
        { provide: ProveedoresService, useValue: mockProveedoresService },
        { provide: RecepcionesService, useValue: mockRecepcionesService },
        { provide: getRepositoryToken(OrdenCompra), useValue: mockOrdenCompraRepository },
        { provide: getRepositoryToken(DetalleOrdenCompra), useValue: mockDetalleOrdenCompraRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<CfdiService>(CfdiService);

    jest.clearAllMocks();
    mockLoteRepository.findOne.mockResolvedValue(null);
    mockLoteRepository.create.mockReturnValue({});
    mockLoteRepository.save.mockResolvedValue({ id: 'lote-1' });
    mockRecepcionRepository.create.mockReturnValue({});
    mockRecepcionRepository.save.mockResolvedValue({ id: 'rec-1' });
    mockProveedoresService.findByRfc.mockResolvedValue(null);
    mockProveedoresService.create.mockResolvedValue({ id: 'prov-1' });
    mockRecepcionesService.create.mockResolvedValue({ id: 'rec-1' });
  });

  describe('validarXml', () => {
    it('should return error for empty xml', async () => {
      const result = await service.validarXml('');
      expect(result.valido).toBe(false);
      expect(result.errores).toContain('El archivo XML está vacío');
    });

    it('should return error for non-CFDI xml', async () => {
      const result = await service.validarXml('<root><item/></root>');
      expect(result.valido).toBe(false);
      expect(result.errores).toContain('No es un archivo CFDI válido');
    });

    it('should return error when no conceptos', async () => {
      const xml = '<cfdi:Comprobante><cfdi:Emisor Rfc="X"/></cfdi:Comprobante>';
      const result = await service.validarXml(xml);
      expect(result.valido).toBe(false);
      expect(result.errores).toContain(
        'El CFDI no contiene conceptos (productos)',
      );
    });

    it('should return error when no emisor RFC', async () => {
      const xml =
        '<cfdi:Comprobante><cfdi:Conceptos><cfdi:Concepto/></cfdi:Conceptos></cfdi:Comprobante>';
      const result = await service.validarXml(xml);
      expect(result.valido).toBe(false);
      expect(result.errores.some((e) => e.includes('RFC'))).toBe(true);
    });

    it('should return valid for well-formed CFDI xml', async () => {
      const result = await service.validarXml(VALID_XML);
      expect(result.valido).toBe(true);
      expect(result.errores).toHaveLength(0);
    });
  });

  describe('parseXmlToPreview', () => {
    it('should return empty preview for non-xml content', async () => {
      const preview = await service.parseXmlToPreview('not xml');

      expect(preview.conceptos).toEqual([]);
      expect(preview.subtotal).toBe(0);
      expect(preview.total).toBe(0);
    });

    it('should parse valid CFDI xml into preview', async () => {
      const preview = await service.parseXmlToPreview(VALID_XML);

      expect(preview.serie).toBe('A');
      expect(preview.folio).toBe('12345');
      expect(preview.subtotal).toBe(1000);
      expect(preview.total).toBe(1160);
      expect(preview.emisor.rfc).toBe('LAB123456789');
      expect(preview.emisor.nombre).toBe('Laboratorio Test');
      expect(preview.conceptos).toHaveLength(2);
      expect(preview.conceptos[0].noIdentificacion).toBe('PROD001');
      expect(preview.conceptos[0].cantidad).toBe(10);
      expect(preview.conceptos[0].valorUnitario).toBe(50);
      expect(preview.conceptos[0].ivaCfdi).toBe(16);
      expect(preview.conceptos[1].noIdentificacion).toBe('PROD002');
      expect(preview.conceptos[1].cantidad).toBe(5);
    });
  });

  describe('procesarRecepcion', () => {
    const userId = 'user-1';
    const dto = {
      xmlContent: VALID_XML,
      productos: [
        {
          productoId: 'PROD001',
          esNuevo: false,
          cantidad: 10,
          fechaCaducidad: '2026-12-31',
          numeroLote: 'LOTE-TEST',
          stockMinimo: 5,
          stockMaximo: 50,
        },
      ],
    };

    it('should create new lab when not found', async () => {
      mockLaboratorioRepository.findOne.mockResolvedValue(null);
      mockLaboratorioRepository.create.mockReturnValue({});
      mockLaboratorioRepository.save.mockResolvedValue({ id: 'lab-1' });
      mockProductoRepository.findOne.mockResolvedValue(null);
      mockProductoRepository.create.mockReturnValue({});
      mockProductoRepository.save.mockResolvedValue({
        id: 'prod-1',
        nombre: 'Producto Test 1',
        codigoBarras: 'PROD001',
      });

      const result = await service.procesarRecepcion(dto as any, userId);

      expect(result.laboratorio.esNuevo).toBe(true);
      expect(result.laboratorio.rfc).toBe('LAB123456789');
      expect(result.productosCreados).toHaveLength(1);
      expect(result.productosExistentes).toHaveLength(0);
      expect(mockDetalleLoteService.create).toHaveBeenCalledWith(
        expect.objectContaining({ productoId: 'prod-1', cantidad: 10 }),
        expect.any(Object),
      );
    });

    it('should use existing lab when found', async () => {
      mockLaboratorioRepository.findOne.mockResolvedValue({ id: 'lab-1' });
      mockProductoRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        codigoBarras: 'PROD001',
      });

      const result = await service.procesarRecepcion(dto as any, userId);

      expect(result.laboratorio.esNuevo).toBe(false);
      expect(result.productosExistentes).toHaveLength(1);
    });

    it('should add stock via inventarioAlmacenService', async () => {
      mockLaboratorioRepository.findOne.mockResolvedValue({ id: 'lab-1' });
      mockProductoRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        codigoBarras: 'PROD001',
      });

      await service.procesarRecepcion(dto as any, userId);

      expect(mockInventarioAlmacenService.agregarStock).toHaveBeenCalledWith(
        'prod-1',
        expect.any(String),
        expect.any(Number),
        10,
        16,
        50,
        expect.any(Object),
        'ENTRADA_BODEGA',
        'user-1',
      );
    });

    it('should commit transaction on success', async () => {
      mockLaboratorioRepository.findOne.mockResolvedValue({ id: 'lab-1' });
      mockProductoRepository.findOne.mockResolvedValue({
        id: 'prod-1',
        codigoBarras: 'PROD001',
      });

      await service.procesarRecepcion(dto as any, userId);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      mockLaboratorioRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.procesarRecepcion(dto as any, userId)).rejects.toThrow('DB error');

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should reject duplicate UUID', async () => {
      mockRecepcionesService.findByUuid.mockResolvedValue({ id: 'rec-existing', serie: 'A', folio: '99999' });
      mockLaboratorioRepository.findOne.mockResolvedValue({ id: 'lab-1' });

      await expect(service.procesarRecepcion(dto as any, userId)).rejects.toThrow(
        'CFDI UUID',
      );
    });
  });
});
