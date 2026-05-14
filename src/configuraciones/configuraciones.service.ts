import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './entities/configuracion.entity';

@Injectable()
export class ConfiguracionesService {
  constructor(
    @InjectRepository(Configuracion)
    private configuracionRepository: Repository<Configuracion>,
  ) {}

  async getByClave(clave: string): Promise<Configuracion | null> {
    return this.configuracionRepository.findOne({
      select: ['id', 'clave', 'valor'],
      where: { clave },
    });
  }

  async getValor(clave: string, defaultValue: number = 0): Promise<number> {
    const config = await this.getByClave(clave);
    return config ? Number(config.valor) : defaultValue;
  }

  async setValor(clave: string, valor: number): Promise<Configuracion> {
    let config = await this.getByClave(clave);

    if (config) {
      config.valor = valor;
    } else {
      config = this.configuracionRepository.create({ clave, valor });
    }

    return this.configuracionRepository.save(config);
  }

  async getIvaGlobal(): Promise<number> {
    return this.getValor('iva_global', 16);
  }

  async setIvaGlobal(valor: number): Promise<Configuracion> {
    return this.setValor('iva_global', valor);
  }

  async getMargenMinimo(): Promise<number> {
    return this.getValor('margen_minimo', 10);
  }

  async setMargenMinimo(valor: number): Promise<Configuracion> {
    return this.setValor('margen_minimo', valor);
  }

  async getMargenRecomendado(): Promise<number> {
    return this.getValor('margen_recomendado', 20);
  }

  async setMargenRecomendado(valor: number): Promise<Configuracion> {
    return this.setValor('margen_recomendado', valor);
  }
}
