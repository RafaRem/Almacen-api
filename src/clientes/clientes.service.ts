import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, EntityManager, Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/create-cliente.dto';
import {
  CreateClienteFullDto,
  DomicilioFullDto,
  FacturacionFullDto,
  UpdateClienteFullDto,
} from './dto/cliente-full.dto';
import { Domicilio } from '../domicilios/entities/domicilio.entity';
import { FacturacionCliente } from '../facturacion-cliente/entities/facturacion-cliente.entity';
import { Telefono } from '../telefonos/entities/telefono.entity';
import { Credito } from '../creditos/entities/credito.entity';
import { RegimenFiscal } from '../regimen-fiscal/entities/regimen-fiscal.entity';
import { CreditosService } from '../creditos/creditos.service';
import { Clase } from '../common/enums/clase.enum';
import {
  getTipoPersonaFromRFC,
  validateRFC,
  validateRegimen,
} from '../common/utils/cfdi-validations';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
    private readonly dataSource: DataSource,
    private readonly creditosService: CreditosService,
  ) {}

  private async generarCodigo(manager?: EntityManager): Promise<string> {
    const repo = manager
      ? manager.getRepository(Cliente)
      : this.clientesRepository;
    const ultimo = await repo
      .createQueryBuilder('c')
      .where('c.codigo LIKE :prefix', { prefix: 'CLI-%' })
      .orderBy('c.codigo', 'DESC')
      .getOne();
    let next = 1;
    if (ultimo) {
      const sufijo = parseInt(ultimo.codigo.replace('CLI-', ''), 10);
      if (!isNaN(sufijo)) next = sufijo + 1;
    }
    return `CLI-${String(next).padStart(4, '0')}`;
  }

  async create(createClienteDto: CreateClienteDto): Promise<Cliente> {
    const existing = await this.clientesRepository.findOne({
      where: [{ email: createClienteDto.email }],
    });

    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    if (createClienteDto.rfc === '') {
      createClienteDto.rfc = undefined;
    }

    if (createClienteDto.rfc) {
      const existingRfc = await this.clientesRepository.findOne({
        where: { rfc: createClienteDto.rfc },
      });
      if (existingRfc) {
        throw new ConflictException('El RFC ya está registrado');
      }
    }

    (createClienteDto as any).codigo = await this.generarCodigo();
    const cliente = this.clientesRepository.create(createClienteDto);
    return this.clientesRepository.save(cliente);
  }

  async findAll(statusId?: string, nombre?: string): Promise<Cliente[]> {
    const qb = this.clientesRepository
      .createQueryBuilder('cliente')
      .leftJoinAndSelect('cliente.categoriaCliente', 'categoriaCliente')
      .leftJoinAndSelect('cliente.telefonos', 'telefonos')
      .leftJoinAndSelect('cliente.domicilio', 'domicilio')
      .leftJoinAndSelect('cliente.facturacionCliente', 'facturacionCliente')
      .leftJoinAndSelect('facturacionCliente.regimenFiscal', 'regimenFiscal')
      .leftJoinAndSelect('cliente.credito', 'credito')
      .orderBy('cliente.createdAt', 'DESC');

    if (statusId) {
      qb.andWhere('cliente.statusId = :statusId', {
        statusId: parseInt(statusId, 10),
      });
    }
    if (nombre) {
      qb.andWhere(
        "CONCAT(cliente.nombre, ' ', COALESCE(cliente.apellidoPaterno, ''), ' ', COALESCE(cliente.apellidoMaterno, '')) ILIKE :nombre",
        { nombre: `%${nombre}%` },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Cliente> {
    const cliente = await this.clientesRepository.findOne({
      where: { id },
      relations: [
        'categoriaCliente',
        'telefonos',
        'domicilio',
        'facturacionCliente',
        'facturacionCliente.regimenFiscal',
        'credito',
      ],
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente with ID ${id} not found`);
    }
    return cliente;
  }

  async update(
    id: string,
    updateClienteDto: UpdateClienteDto,
  ): Promise<Cliente> {
    const cliente = await this.findOne(id);

    if (updateClienteDto.email && updateClienteDto.email !== cliente.email) {
      const existing = await this.clientesRepository.findOne({
        where: { email: updateClienteDto.email },
      });
      if (existing) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    if (updateClienteDto.rfc === '') {
      updateClienteDto.rfc = undefined;
    }

    if (updateClienteDto.rfc && updateClienteDto.rfc !== cliente.rfc) {
      const existingRfc = await this.clientesRepository.findOne({
        where: { rfc: updateClienteDto.rfc },
      });
      if (existingRfc) {
        throw new ConflictException('El RFC ya está registrado');
      }
    }

    Object.assign(cliente, updateClienteDto);
    if (updateClienteDto.categoriaClienteId !== undefined) {
      cliente.categoriaCliente = null as any;
    }
    await this.clientesRepository.save(cliente);

    return this.findOne(id);
  }

  async createFull(
    dto: CreateClienteFullDto,
    usuarioId?: string,
  ): Promise<Cliente> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Cliente);
      const data = dto.cliente;

      const email = data.email.trim().toLowerCase();
      const dupEmail = await repo.findOne({ where: { email } });
      if (dupEmail) {
        throw new ConflictException('El email ya está registrado');
      }

      const rfc = data.rfc?.trim() || null;
      if (rfc) {
        const dupRfc = await repo.findOne({ where: { rfc } });
        if (dupRfc) {
          throw new ConflictException('El RFC ya está registrado');
        }
      }

      const facturacion = await this.prepararFacturacion(
        manager,
        dto.facturacion,
        {
          correoFallback: email,
          tipoPersona: data.tipoPersona,
        },
      );

      const tipoPersona =
        data.tipoPersona ??
        (facturacion ? getTipoPersonaFromRFC(facturacion.rfc) : 'fisica');

      const codigo = await this.generarCodigo(manager);
      const datos: DeepPartial<Cliente> = {
        nombre: data.nombre.trim(),
        apellidoPaterno: (data.apellidoPaterno ?? null) as any,
        apellidoMaterno: (data.apellidoMaterno ?? null) as any,
        email,
        rfc: rfc as any,
        categoriaClienteId: (data.categoriaClienteId ?? null) as any,
        tipoPersona,
        empresa: (data.empresa ?? null) as any,
        statusId: data.statusId ?? 1,
        clase: data.clase ?? Clase.GENERAL,
        codigo,
      };
      const cliente = repo.create(datos);
      const saved = await repo.save(cliente);

      await this.guardarRelaciones(
        manager,
        saved.id,
        dto,
        facturacion,
        usuarioId,
        saved.email,
      );

      return this.findOneTx(manager, saved.id);
    });
  }

  async updateFull(
    id: string,
    dto: UpdateClienteFullDto,
    usuarioId?: string,
  ): Promise<Cliente> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Cliente);
      const cliente = await repo.findOne({ where: { id } });
      if (!cliente) {
        throw new NotFoundException(`Cliente with ID ${id} not found`);
      }

      const data = dto.cliente ?? {};

      if (data.email !== undefined) {
        const email = data.email.trim().toLowerCase();
        if (!email) {
          throw new BadRequestException('El email es requerido');
        }
        if (email !== cliente.email) {
          const dup = await repo.findOne({ where: { email } });
          if (dup && dup.id !== id) {
            throw new ConflictException('El email ya está registrado');
          }
        }
        cliente.email = email;
      }

      if (data.rfc !== undefined) {
        const rfc = data.rfc?.trim() || null;
        if (rfc) {
          const dup = await repo.findOne({ where: { rfc } });
          if (dup && dup.id !== id) {
            throw new ConflictException('El RFC ya está registrado');
          }
        }
        cliente.rfc = rfc as any;
      }

      if (data.nombre !== undefined) cliente.nombre = data.nombre.trim();
      if (data.apellidoPaterno !== undefined) {
        cliente.apellidoPaterno = data.apellidoPaterno as any;
      }
      if (data.apellidoMaterno !== undefined) {
        cliente.apellidoMaterno = data.apellidoMaterno as any;
      }
      if (data.empresa !== undefined) cliente.empresa = data.empresa as any;
      if (data.statusId !== undefined) cliente.statusId = data.statusId;
      if (data.clase !== undefined) cliente.clase = data.clase;
      if (data.categoriaClienteId !== undefined) {
        cliente.categoriaClienteId = data.categoriaClienteId as any;
        cliente.categoriaCliente = null as any;
      }

      const facturacion = await this.prepararFacturacion(
        manager,
        dto.facturacion,
        {
          correoFallback: cliente.email,
          tipoPersona: data.tipoPersona,
        },
      );

      if (facturacion && data.tipoPersona === undefined) {
        cliente.tipoPersona = getTipoPersonaFromRFC(facturacion.rfc);
      } else if (data.tipoPersona !== undefined) {
        cliente.tipoPersona = data.tipoPersona;
      }

      await repo.save(cliente);

      await this.guardarRelaciones(
        manager,
        id,
        dto,
        facturacion,
        usuarioId,
        cliente.email,
      );

      return this.findOneTx(manager, id);
    });
  }

  private async prepararFacturacion(
    manager: EntityManager,
    facturacion: FacturacionFullDto | null | undefined,
    ctx: { correoFallback: string; tipoPersona?: 'fisica' | 'moral' },
  ): Promise<(FacturacionFullDto & { correo: string }) | null | undefined> {
    if (facturacion === undefined || facturacion === null) {
      return facturacion;
    }

    const rfc = facturacion.rfc.trim().toUpperCase();
    if (!validateRFC(rfc)) {
      throw new BadRequestException(
        `El RFC "${facturacion.rfc}" no tiene un formato válido`,
      );
    }

    const regimen = await manager
      .getRepository(RegimenFiscal)
      .findOne({ where: { id: facturacion.regimenFiscalId } });
    if (!regimen) {
      throw new BadRequestException(
        `Régimen fiscal ${facturacion.regimenFiscalId} no encontrado`,
      );
    }

    const tipoRfc = getTipoPersonaFromRFC(rfc);
    if (ctx.tipoPersona && ctx.tipoPersona !== tipoRfc) {
      throw new BadRequestException(
        `El tipo de persona (${ctx.tipoPersona}) no coincide con el RFC ${rfc}, que corresponde a persona ${tipoRfc}`,
      );
    }
    validateRegimen(tipoRfc, regimen);

    return {
      ...facturacion,
      rfc,
      correo: facturacion.correo?.trim() || ctx.correoFallback,
    };
  }

  private async guardarRelaciones(
    manager: EntityManager,
    clienteId: string,
    dto: UpdateClienteFullDto | CreateClienteFullDto,
    facturacion: (FacturacionFullDto & { correo: string }) | null | undefined,
    usuarioId?: string,
    emailFallback = '',
  ): Promise<void> {
    if (dto.domicilio === null) {
      await manager.getRepository(Domicilio).delete({ clienteId });
    } else if (dto.domicilio) {
      const repo = manager.getRepository(Domicilio);
      const existente = await repo.findOne({ where: { clienteId } });
      const datos: DeepPartial<Domicilio> = {
        ...dto.domicilio,
        clienteId,
        numeroInt: (dto.domicilio.numeroInt ?? null) as any,
        municipio: (dto.domicilio.municipio?.trim() || dto.domicilio.ciudad.trim()) as any,
        estado: (dto.domicilio.estado?.trim() || '') as any,
        pais: dto.domicilio.pais || 'México',
      };
      if (existente) {
        Object.assign(existente, datos);
        await repo.save(existente);
      } else {
        await repo.save(repo.create(datos));
      }
    }

    if (dto.telefonos !== undefined) {
      const repo = manager.getRepository(Telefono);
      await repo.delete({ clienteId });
      if (dto.telefonos.length > 0) {
        await repo.save(
          dto.telefonos.map((tel) =>
            repo.create({
              clienteId,
              tipo: tel.tipo,
              numero: tel.numero,
              statusId: tel.statusId ?? 1,
            }),
          ),
        );
      }
    }

    if (facturacion === null) {
      await manager.getRepository(FacturacionCliente).delete({ clienteId });
    } else if (facturacion) {
      const repo = manager.getRepository(FacturacionCliente);
      const existente = await repo.findOne({ where: { clienteId } });
      const datos: DeepPartial<FacturacionCliente> = {
        clienteId,
        rfc: facturacion.rfc,
        razonSocial: facturacion.razonSocial,
        correo: facturacion.correo || emailFallback,
        regimenFiscalId: facturacion.regimenFiscalId,
        usoCfdi: (facturacion.usoCfdi ?? null) as any,
        statusId: facturacion.statusId ?? 1,
      };
      if (existente) {
        Object.assign(existente, datos);
        await repo.save(existente);
      } else {
        await repo.save(repo.create(datos));
      }
    }

    if (dto.credito === null) {
      await manager.getRepository(Credito).delete({ clienteId });
    } else if (dto.credito) {
      await this.creditosService.create(
        clienteId,
        dto.credito as any,
        usuarioId,
        manager,
      );
    }
  }

  private async findOneTx(
    manager: EntityManager,
    id: string,
  ): Promise<Cliente> {
    const cliente = await manager.getRepository(Cliente).findOne({
      where: { id },
      relations: [
        'categoriaCliente',
        'telefonos',
        'domicilio',
        'facturacionCliente',
        'facturacionCliente.regimenFiscal',
        'credito',
      ],
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente with ID ${id} not found`);
    }
    return cliente;
  }

  async remove(id: string): Promise<void> {
    const cliente = await this.findOne(id);
    cliente.statusId = 2;
    await this.clientesRepository.save(cliente);
  }
}
