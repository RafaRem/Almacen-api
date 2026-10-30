import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface FacturapiInvoice {
  id: string;
  status: 'valid' | 'pending' | 'draft' | 'canceled';
  uuid: string | null;
  folio_number?: number;
  series?: string;
  total?: number;
}

@Injectable()
export class FacturapiService {
  private readonly logger = new Logger(FacturapiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl =
      config.get<string>('FACTURAPI_BASE_URL') || 'https://www.facturapi.io/v2';
    this.apiKey = config.get<string>('FACTURAPI_KEY') || '';
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  isTestMode(): boolean {
    return this.apiKey.startsWith('sk_test_');
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createInvoice(payload: Record<string, any>): Promise<FacturapiInvoice> {
    this.ensureConfigured();
    try {
      const { data } = await firstValueFrom(
        this.http.post<FacturapiInvoice>(
          `${this.baseUrl}/invoices`,
          payload,
          { headers: this.headers() },
        ),
      );
      return data;
    } catch (error) {
      throw this.mapError(error, 'crear factura');
    }
  }

  async cancelInvoice(invoiceId: string, motive = '02'): Promise<any> {
    this.ensureConfigured();
    try {
      const { data } = await firstValueFrom(
        this.http.delete(`${this.baseUrl}/invoices/${invoiceId}`, {
          headers: this.headers(),
          params: { motive },
        }),
      );
      return data;
    } catch (error) {
      throw this.mapError(error, 'cancelar factura');
    }
  }

  async downloadInvoiceFile(
    invoiceId: string,
    format: 'xml' | 'pdf',
  ): Promise<Buffer> {
    this.ensureConfigured();
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/invoices/${invoiceId}/${format}`, {
          headers: this.headers(),
          responseType: 'arraybuffer',
        }),
      );
      return Buffer.from(data);
    } catch (error) {
      throw this.mapError(error, `descargar ${format.toUpperCase()}`);
    }
  }

  private ensureConfigured() {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Facturapi no está configurado: falta FACTURAPI_KEY',
      );
    }
  }

  private mapError(error: any, accion: string): Error {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Error desconocido';

    if (status) {
      this.logger.error(`Facturapi ${accion} falló (${status}): ${message}`);
    } else {
      this.logger.error(`Facturapi ${accion} sin respuesta: ${message}`);
    }

    if (status === 401) {
      return new BadRequestException(
        `Facturapi rechazó la API key (401): ${message}`,
      );
    }
    if (status === 402) {
      return new BadRequestException(
        `Facturapi requiere una suscripción activa (402): ${message}`,
      );
    }
    if (status === 400 || status === 422) {
      return new BadRequestException(
        `Facturapi rechazó la solicitud (${status}): ${message}`,
      );
    }
    if (!status) {
      return new ServiceUnavailableException(
        `No se pudo conectar con Facturapi: ${message}`,
      );
    }
    return new BadRequestException(`Facturapi (${status}): ${message}`);
  }
}
