import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateCuentaPorCobrarDto {
  @IsString()
  clienteId: string;

  @IsOptional()
  @IsString()
  ventaId?: string;

  @IsNumber()
  montoOriginal: number;

  @IsOptional()
  @IsNumber()
  montoPendiente?: number;

  @IsOptional()
  @IsNumber()
  idStatus?: number;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateCuentaPorCobrarDto {
  @IsOptional()
  @IsNumber()
  idStatus?: number;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

@Injectable()
export class CuentasCobrarService {
  constructor(private readonly dataSource: DataSource) {}

  private mapClienteNombre(r: any): string {
    if (!r) return 'Sin cliente'
    const parts = [r.nombre, r.apellidoPaterno, r.apellidoMaterno].filter(Boolean)
    return parts.join(' ') || r.empresa || 'Sin nombre'
  }

  private buildClienteObject(r: any) {
    return {
      id: r.cliente_id,
      nombre: r.nombre,
      apellidoPaterno: r.apellidoPaterno,
      apellidoMaterno: r.apellidoMaterno,
      empresa: r.empresa,
    }
  }

  async findAll(filtros: {
    clienteId?: string;
    status?: number;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<any[]> {
    let sql = `SELECT c.id, c.cliente_id, c.venta_id, c.monto_original, c.monto_pendiente,
                COALESCE(c.credito_a_favor, 0) as credito_a_favor, c.id_status,
                c.fecha_vencimiento, c.observaciones, c.created_at, c.updated_at,
                cl.nombre, cl."apellidoPaterno", cl."apellidoMaterno", cl.empresa,
                cr.limite, cr.saldo_actual, COALESCE(cr.credito_a_favor, 0) as cliente_credito_a_favor
                FROM cuenta_por_cobrar c
                LEFT JOIN clientes cl ON cl.id = c.cliente_id
                LEFT JOIN creditos cr ON cr.cliente_id = c.cliente_id
                WHERE 1=1`;
    const params: any[] = [];
    let p = 1;

    if (filtros.clienteId) {
      sql += ` AND c.cliente_id = $${p++}`;
      params.push(filtros.clienteId);
    }
    if (filtros.status !== undefined) {
      sql += ` AND c.id_status = $${p++}`;
      params.push(filtros.status);
    }
    if (filtros.fechaDesde) {
      sql += ` AND c.created_at >= $${p++}`;
      params.push(filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      sql += ` AND c.created_at <= $${p++}`;
      params.push(filtros.fechaHasta);
    }
    sql += ` ORDER BY c.created_at DESC`;

    const rows = await this.dataSource.query(sql, params);

    return rows.map((r: any) => ({
      id: r.id,
      clienteId: r.cliente_id,
      ventaId: r.venta_id,
      montoOriginal: parseFloat(r.monto_original),
      montoPendiente: parseFloat(r.monto_pendiente),
      creditoAFavor: parseFloat(r.credito_a_favor || 0),
      idStatus: parseInt(r.id_status),
      fechaVencimiento: r.fecha_vencimiento,
      observaciones: r.observaciones,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      cliente: this.buildClienteObject(r),
      clienteNombre: this.mapClienteNombre(r),
      creditoDisponible: parseFloat(r.limite || 0) - parseFloat(r.saldo_actual || 0) + parseFloat(r.cliente_credito_a_favor || 0),
    }));
  }

  async findByCliente(clienteId: string): Promise<any[]> {
    const rows = await this.dataSource.query(
      `SELECT c.id, c.cliente_id, c.venta_id, c.monto_original, c.monto_pendiente, c.id_status,
              c.fecha_vencimiento, c.observaciones, c.created_at,
              cl.nombre, cl."apellidoPaterno", cl."apellidoMaterno", cl.empresa,
              cr.limite, cr.saldo_actual, COALESCE(cr.credito_a_favor, 0) as cliente_credito_a_favor
       FROM cuenta_por_cobrar c
       LEFT JOIN clientes cl ON cl.id = c.cliente_id
       LEFT JOIN creditos cr ON cr.cliente_id = c.cliente_id
       WHERE c.cliente_id = $1 ORDER BY c.created_at DESC`,
      [clienteId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      clienteId: r.cliente_id,
      ventaId: r.venta_id,
      montoOriginal: parseFloat(r.monto_original),
      montoPendiente: parseFloat(r.monto_pendiente),
      idStatus: parseInt(r.id_status),
      fechaVencimiento: r.fecha_vencimiento,
      observaciones: r.observaciones,
      createdAt: r.created_at,
      cliente: this.buildClienteObject(r),
      clienteNombre: this.mapClienteNombre(r),
      creditoDisponible: parseFloat(r.limite || 0) - parseFloat(r.saldo_actual || 0) + parseFloat(r.cliente_credito_a_favor || 0),
    }));
  }

  async findByVenta(ventaId: string): Promise<any | null> {
    const rows = await this.dataSource.query(
      `SELECT c.id, c.cliente_id, c.venta_id, c.monto_original, c.monto_pendiente, c.id_status,
              c.fecha_vencimiento, c.observaciones, c.created_at,
              cl.nombre, cl."apellidoPaterno", cl."apellidoMaterno", cl.empresa,
              cr.limite, cr.saldo_actual, COALESCE(cr.credito_a_favor, 0) as cliente_credito_a_favor
       FROM cuenta_por_cobrar c
       LEFT JOIN clientes cl ON cl.id = c.cliente_id
       LEFT JOIN creditos cr ON cr.cliente_id = c.cliente_id
       WHERE c.venta_id = $1 LIMIT 1`,
      [ventaId],
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      clienteId: r.cliente_id,
      ventaId: r.venta_id,
      montoOriginal: parseFloat(r.monto_original),
      montoPendiente: parseFloat(r.monto_pendiente),
      idStatus: parseInt(r.id_status),
      fechaVencimiento: r.fecha_vencimiento,
      observaciones: r.observaciones,
      createdAt: r.created_at,
      cliente: this.buildClienteObject(r),
      clienteNombre: this.mapClienteNombre(r),
      creditoDisponible: parseFloat(r.limite || 0) - parseFloat(r.saldo_actual || 0) + parseFloat(r.cliente_credito_a_favor || 0),
    };
  }

  async findOne(id: string): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT c.id, c.cliente_id, c.venta_id, c.monto_original, c.monto_pendiente,
              COALESCE(c.credito_a_favor, 0) as credito_a_favor, c.id_status,
              c.fecha_vencimiento, c.observaciones, c.created_at, c.updated_at,
              cl.nombre, cl."apellidoPaterno", cl."apellidoMaterno", cl.empresa,
              cr.limite, cr.saldo_actual, COALESCE(cr.credito_a_favor, 0) as cliente_credito_a_favor
       FROM cuenta_por_cobrar c
       LEFT JOIN clientes cl ON cl.id = c.cliente_id
       LEFT JOIN creditos cr ON cr.cliente_id = c.cliente_id
       WHERE c.id = $1 LIMIT 1`,
      [id],
    );
    if (!rows.length) {
      throw new NotFoundException(`Cuenta por cobrar ${id} no encontrada`);
    }
    const r = rows[0];
    return {
      id: r.id,
      clienteId: r.cliente_id,
      ventaId: r.venta_id,
      montoOriginal: parseFloat(r.monto_original),
      montoPendiente: parseFloat(r.monto_pendiente),
      creditoAFavor: parseFloat(r.credito_a_favor || 0),
      idStatus: parseInt(r.id_status),
      fechaVencimiento: r.fecha_vencimiento,
      observaciones: r.observaciones,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      cliente: this.buildClienteObject(r),
      clienteNombre: this.mapClienteNombre(r),
      creditoDisponible: parseFloat(r.limite || 0) - parseFloat(r.saldo_actual || 0) + parseFloat(r.cliente_credito_a_favor || 0),
    };
  }

  async create(createDto: CreateCuentaPorCobrarDto): Promise<any> {
    const id = crypto.randomUUID();
    const montoPendiente = createDto.montoPendiente ?? createDto.montoOriginal;
    const idStatus = createDto.idStatus ?? 1;
    await this.dataSource.query(
      `INSERT INTO cuenta_por_cobrar (id, cliente_id, venta_id, monto_original, monto_pendiente, id_status, fecha_vencimiento, observaciones, credito_a_favor, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW(), NOW())`,
      [id, createDto.clienteId, createDto.ventaId || null, createDto.montoOriginal, montoPendiente, idStatus, createDto.fechaVencimiento || null, createDto.observaciones || null],
    );
    const rows = await this.dataSource.query(
      `SELECT id, cliente_id, monto_original, monto_pendiente, id_status, created_at FROM cuenta_por_cobrar WHERE id = $1`,
      [id],
    );
    const r = rows[0];
    return {
      id: r.id,
      clienteId: r.cliente_id,
      montoOriginal: parseFloat(r.monto_original),
      montoPendiente: parseFloat(r.monto_pendiente),
      idStatus: parseInt(r.id_status),
      createdAt: r.created_at,
    };
  }

  async update(id: string, updateDto: UpdateCuentaPorCobrarDto): Promise<any> {
    await this.findOne(id);
    const sets: string[] = [];
    const params: any[] = [];
    let p = 1;
    if (updateDto.idStatus !== undefined) {
      sets.push(`id_status = $${p++}`);
      params.push(updateDto.idStatus);
    }
    if (updateDto.fechaVencimiento !== undefined) {
      sets.push(`fecha_vencimiento = $${p++}`);
      params.push(updateDto.fechaVencimiento);
    }
    if (updateDto.observaciones !== undefined) {
      sets.push(`observaciones = $${p++}`);
      params.push(updateDto.observaciones);
    }
    if (!sets.length) return this.findOne(id);
    sets.push(`updated_at = NOW()`);
    params.push(id);
    await this.dataSource.query(
      `UPDATE cuenta_por_cobrar SET ${sets.join(', ')} WHERE id = $${p}`,
      params,
    );
    return this.findOne(id);
  }

  async marcarPagada(id: string): Promise<any> {
    await this.dataSource.query(
      `UPDATE cuenta_por_cobrar SET id_status = 2, monto_pendiente = 0, updated_at = NOW() WHERE id = $1`,
      [id],
    );
    const rows = await this.dataSource.query(
      `SELECT id, cliente_id, monto_original, monto_pendiente, id_status, created_at FROM cuenta_por_cobrar WHERE id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException(`Cuenta ${id} no encontrada`);
    const r = rows[0];
    return {
      id: r.id,
      clienteId: r.cliente_id,
      montoOriginal: parseFloat(r.monto_original),
      montoPendiente: parseFloat(r.monto_pendiente),
      idStatus: parseInt(r.id_status),
      createdAt: r.created_at,
    };
  }

  async getResumen(): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT id_status, monto_pendiente, COALESCE(credito_a_favor, 0) as credito_a_favor FROM cuenta_por_cobrar`,
    );

    const pendientes = rows.filter((r: any) => parseInt(r.id_status) === 1);
    const vencidas = rows.filter((r: any) => parseInt(r.id_status) === 3);
    const totalCreditoAFavor = rows.reduce(
      (sum: number, r: any) => sum + parseFloat(r.credito_a_favor || 0),
      0,
    );

    return {
      totalPendiente: pendientes.reduce((sum: number, r: any) => sum + parseFloat(r.monto_pendiente), 0),
      totalVencido: vencidas.reduce((sum: number, r: any) => sum + parseFloat(r.monto_pendiente), 0),
      totalCreditoAFavor,
      countPendiente: pendientes.length,
      countVencido: vencidas.length,
    };
  }

  async aplicarAbono(
    cuentaId: string,
    monto: number,
    usuarioId: string,
    observaciones?: string,
  ): Promise<any> {
    const rows = await this.dataSource.query(
      `SELECT id, cliente_id, monto_pendiente, id_status, COALESCE(credito_a_favor, 0) as credito_a_favor
       FROM cuenta_por_cobrar WHERE id = $1 LIMIT 1`,
      [cuentaId],
    );
    if (!rows.length) throw new NotFoundException(`Cuenta ${cuentaId} no encontrada`);
    const cuenta = rows[0];
    const idStatus = parseInt(cuenta.id_status);

    if (idStatus === 2) throw new BadRequestException('La cuenta ya está pagada');
    if (idStatus === 4) throw new BadRequestException('La cuenta está cancelada');

    const montoPendiente = parseFloat(cuenta.monto_pendiente);
    const montoNum = parseFloat(String(monto));
    if (isNaN(montoNum) || montoNum <= 0) throw new BadRequestException('Monto de abono inválido');

    const excedente = montoNum > montoPendiente ? montoNum - montoPendiente : 0;
    const nuevoPendiente = montoNum >= montoPendiente ? 0 : montoPendiente - montoNum;
    const nuevoStatus = nuevoPendiente === 0 ? 2 : idStatus;

    const abonoId = crypto.randomUUID();
    await this.dataSource.query(
      `INSERT INTO abono (id, cuenta_cobrar_id, monto, excedente, observaciones, usuario_id, fecha, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [abonoId, cuentaId, monto, excedente, observaciones || null, usuarioId],
    );

    await this.dataSource.query(
      `UPDATE cuenta_por_cobrar SET monto_pendiente = $1, id_status = $2, credito_a_favor = COALESCE(credito_a_favor, 0) + $3, updated_at = NOW() WHERE id = $4`,
      [nuevoPendiente, nuevoStatus, excedente, cuentaId],
    );

    if (excedente > 0) {
      await this.dataSource.query(
        `INSERT INTO creditos (id, cliente_id, limite, saldo_actual, id_status, fecha_de_corte, created_at, updated_at, credito_a_favor)
         VALUES ($1, $2, 0, 0, 1, 20, NOW(), NOW(), $3)
         ON CONFLICT (cliente_id) DO UPDATE SET credito_a_favor = creditos.credito_a_favor + $3, updated_at = NOW()`,
        [crypto.randomUUID(), cuenta.cliente_id, excedente],
      );
      await this.dataSource.query(
        `INSERT INTO movimientos_credito (id, clienteid, usuarioid, tipo, observaciones, saldoactualanterior, saldoactualnuevo, createdat)
         VALUES ($1, $2, $3, $4, $5, 0, $6, NOW())`,
        [
          crypto.randomUUID(),
          cuenta.cliente_id,
          usuarioId || 'SYSTEM',
          'USO',
          `Abono de $${monto.toFixed(2)} a cuenta ${cuentaId}. Excedente: $${excedente.toFixed(2)}`,
          excedente,
        ],
      );
    }

    return {
      cuenta: {
        id: cuentaId,
        montoPendiente: nuevoPendiente,
        idStatus: nuevoStatus,
        creditoAFavor: parseFloat(cuenta.credito_a_favor || 0) + excedente,
      },
      abono: {
        id: abonoId,
        monto,
        excedente,
        fecha: new Date().toISOString(),
      },
    };
  }

  async abonosPorCuenta(cuentaId: string): Promise<any[]> {
    const rows = await this.dataSource.query(
      `SELECT a.id, a.cuenta_cobrar_id, a.monto, a.excedente, a.observaciones, a.fecha, a.usuario_id, a.created_at
       FROM abono a WHERE a.cuenta_cobrar_id = $1 ORDER BY a.fecha DESC`,
      [cuentaId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      cuentaCobrarId: r.cuenta_cobrar_id,
      monto: parseFloat(r.monto),
      excedente: parseFloat(r.excedente),
      observaciones: r.observaciones,
      fecha: r.fecha,
      usuarioId: r.usuario_id,
      createdAt: r.created_at,
    }));
  }
}
