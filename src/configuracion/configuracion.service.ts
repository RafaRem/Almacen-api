import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionSistema } from './entities/configuracion-sistema.entity';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(ConfiguracionSistema)
    private configuracionRepository: Repository<ConfiguracionSistema>,
  ) {}

  async inicializarConfiguraciones(): Promise<void> {
    const configuraciones = [
      {
        clave: 'reversion_automatica',
        valor: { enabled: false, maxIntentos: 3 },
        descripcion: 'Configuración global de reversión automática para movimientos fallidos',
      },
      {
        clave: 'parametros_stock',
        valor: { minStock: 0, maxStock: 999999 },
        descripcion: 'Parámetros globales de control de stock',
      },
      {
        clave: 'descuentos',
        valor: { permiteCAE: false },
        descripcion: 'Configuración de descuentos. permiteCAE: muestra campo de Código de Autorización de Descuento',
      },
      {
        clave: 'ticket',
        valor: { mensaje: '¡Gracias por su preferencia!' },
        descripcion: 'Configuración de impresión de tickets. mensaje: texto mostrado al final del ticket',
      },
    ];

    for (const config of configuraciones) {
      const existente = await this.configuracionRepository.findOne({
        where: { clave: config.clave },
      });
      if (!existente) {
        await this.configuracionRepository.save(config);
      }
    }
  }

  async getConfiguracion(clave: string): Promise<ConfiguracionSistema | null> {
    return this.configuracionRepository.findOne({ where: { clave, activo: true } });
  }

  async getConfiguracionValor<T>(clave: string): Promise<T | null> {
    const config = await this.getConfiguracion(clave);
    return config ? (config.valor as T) : null;
  }

  async updateConfiguracion(
    clave: string,
    valor: Record<string, any>,
    userId: string,
  ): Promise<ConfiguracionSistema | null> {
    const config = await this.configuracionRepository.findOne({ where: { clave } });
    if (!config) return null;

    config.valor = valor;
    config.updatedBy = userId;
    return this.configuracionRepository.save(config);
  }
}