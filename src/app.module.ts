import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LaboratoriosModule } from './laboratorios/laboratorios.module';
import { LotesModule } from './lotes/lotes.module';
import { ProductosModule } from './productos/productos.module';
import { MovimientosAlmacenModule } from './movimientos-almacen/movimientos-almacen.module';
import { CategoriasClienteModule } from './categorias-cliente/categorias-cliente.module';
import { DescuentosModule } from './descuentos/descuentos.module';
import { UploadsModule } from './uploads/uploads.module';
import { ReportesModule } from './reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    UsersModule,
    AuthModule,
    LaboratoriosModule,
    LotesModule,
    ProductosModule,
    MovimientosAlmacenModule,
    CategoriasClienteModule,
    DescuentosModule,
    UploadsModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
