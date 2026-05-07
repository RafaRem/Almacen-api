import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatosEmpresa } from './entities/datos-empresa.entity';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectRepository(DatosEmpresa)
    private empresaRepository: Repository<DatosEmpresa>,
  ) {}

  async getDatosEmpresa(): Promise<DatosEmpresa | null> {
    return this.empresaRepository.findOne({
      where: { activo: true },
    });
  }

  async updateDatosEmpresa(data: Partial<DatosEmpresa>): Promise<DatosEmpresa> {
    let empresa = await this.empresaRepository.findOne({
      where: { activo: true },
    });

    if (!empresa) {
      empresa = this.empresaRepository.create({
        ...data,
        activo: true,
      });
    } else {
      Object.assign(empresa, data);
    }

    return this.empresaRepository.save(empresa);
  }
}
