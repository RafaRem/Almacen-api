import { BadRequestException } from '@nestjs/common';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { FacturacionCliente } from '../../facturacion-cliente/entities/facturacion-cliente.entity';
import { RegimenFiscal } from '../../regimen-fiscal/entities/regimen-fiscal.entity';

export function getTipoPersonaFromRFC(rfc: string): 'fisica' | 'moral' {
  if (!rfc || rfc.length === 0) {
    return 'fisica';
  }
  return rfc.length === 12 ? 'moral' : 'fisica';
}

export function validateRegimen(
  tipoPersona: 'fisica' | 'moral',
  regimen: RegimenFiscal,
): void {
  if (regimen.type !== 'ambos' && regimen.type !== tipoPersona) {
    throw new BadRequestException(
      `El régimen fiscal ${regimen.code} (${regimen.name}) no aplica para persona ${tipoPersona}. Este régimen es únicamente para ${regimen.type === 'moral' ? 'personas morales' : 'personas físicas'}.`,
    );
  }
}

export function validateClienteCFDI(
  cliente: Cliente,
  facturacion: FacturacionCliente,
  regimen: RegimenFiscal,
): void {
  const tipo = getTipoPersonaFromRFC(facturacion.rfc);

  if (cliente.tipoPersona && cliente.tipoPersona !== tipo) {
    throw new BadRequestException(
      `El tipo de persona no coincide con el RFC. El RFC ${facturacion.rfc} corresponde a una persona ${tipo}, pero el cliente está registrado como ${cliente.tipoPersona}.`,
    );
  }

  validateRegimen(tipo, regimen);
}

export function validateRFC(rfc: string): boolean {
  if (!rfc) return false;
  
  const rfcClean = rfc.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (rfcClean.length !== 12 && rfcClean.length !== 13) {
    return false;
  }
  
  const personaFisicaPattern = /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/;
  const personaMoralPattern = /^[A-Z]{3}\d{6}[A-Z0-9]{3}$/;
  
  return personaFisicaPattern.test(rfcClean) || personaMoralPattern.test(rfcClean);
}