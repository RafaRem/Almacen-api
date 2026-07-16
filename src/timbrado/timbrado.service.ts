import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Facturapi, { CancellationMotive } from 'facturapi';
import { Factura } from '../facturas/entities/factura.entity';
import { FacturaDetalle } from '../facturas/entities/factura-detalle.entity';

@Injectable()
export class TimbradoService {
  private facturapi: Facturapi;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('FACTURAPI_KEY');
    if (key) {
      this.facturapi = new Facturapi(key);
    }
  }

  async timbrar(factura: Factura): Promise<{ facturapiId: string; uuid: string }> {
    if (!this.facturapi) {
      throw new BadRequestException('Facturapi no está configurado (FACTURAPI_KEY)');
    }

    const payload = this.buildPayload(factura);

    const result = await this.facturapi.invoices.create(payload);

    return {
      facturapiId: result.id,
      uuid: result.uuid,
    };
  }

  async cancelar(facturapiId: string): Promise<void> {
    if (!this.facturapi) {
      throw new BadRequestException('Facturapi no está configurado (FACTURAPI_KEY)');
    }

    await this.facturapi.invoices.cancel(facturapiId, { motive: CancellationMotive.ERRORES_SIN_RELACION });
  }

  private buildPayload(factura: Factura): Record<string, unknown> {
    const cliente = (factura as any).cliente || null;
    const fc = cliente?.facturacionCliente || null;

    const items = ((factura as any).detalles || []).map((det: FacturaDetalle) => {
      const impuestos = (det.impuestos || []).map((imp) => ({
        type: imp.impuesto === '002' ? 'IVA' : imp.impuesto,
        rate: imp.tasaOCuota,
      }));

      return {
        quantity: det.cantidad,
        product: {
          description: det.descripcion,
          product_key: det.claveProdServ || '01010101',
          price: det.valorUnitario,
          tax_included: false,
          unit_key: det.claveUnidad || 'H87',
          taxes: impuestos.length > 0 ? impuestos : [{ type: 'IVA', rate: 0.16 }],
        },
      };
    });

    const paymentFormMap: Record<string, string> = {
      '01': '01',
      '02': '02',
      '03': '03',
      '04': '04',
      '05': '05',
      '06': '06',
      '08': '08',
      '12': '12',
      '13': '13',
      '14': '14',
      '15': '15',
      '17': '17',
      '23': '23',
      '24': '24',
      '25': '25',
      '26': '26',
      '27': '27',
      '28': '28',
      '29': '29',
      '30': '30',
      '31': '31',
      '99': '99',
    };
    const paymentForm = paymentFormMap[factura.formaPago] || '99';

    const payload: Record<string, unknown> = {
      type: factura.tipoComprobante || 'I',
      payment_form: paymentForm,
      payment_method: factura.metodoPago || 'PUE',
      use: factura.usoCfdi || 'G03',
      currency: factura.moneda || 'MXN',
      exchange: Number(factura.tipoCambio) || 1,
      items,
      customer: {
        legal_name: fc?.razonSocial || cliente?.nombre || 'Público en General',
        tax_id: fc?.rfc || 'XAXX010101000',
        tax_system: fc?.regimenFiscal?.code || '616',
        address: {
          zip: (cliente as any)?.domicilio?.cp || '00000',
        },
      },
    };

    if (factura.serie) {
      payload.series = factura.serie;
    }

    if (factura.observaciones) {
      payload.conditions = factura.observaciones;
    }

    return payload;
  }
}
