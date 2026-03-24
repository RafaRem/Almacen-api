import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasClienteService } from './categorias-cliente.service';
import { CategoriasClienteController } from './categorias-cliente.controller';
import { CategoriaCliente } from './entities/categoria-cliente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoriaCliente])],
  controllers: [CategoriasClienteController],
  providers: [CategoriasClienteService],
  exports: [CategoriasClienteService],
})
export class CategoriasClienteModule {}