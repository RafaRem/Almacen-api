import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { RegimenFiscalService } from './regimen-fiscal.service';
import { RegimenFiscal } from './entities/regimen-fiscal.entity';

@Controller('regimen-fiscal')
export class RegimenFiscalController {
  constructor(private readonly regimenFiscalService: RegimenFiscalService) {}

  @Get()
  async findAll(): Promise<RegimenFiscal[]> {
    return this.regimenFiscalService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<RegimenFiscal> {
    return this.regimenFiscalService.findOne(id);
  }
}
