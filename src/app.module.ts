import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
import { ClientesModule } from './clientes/clientes.module';
import { VentasModule } from './ventas/ventas.module';
import { FacturasModule } from './facturas/facturas.module';
import { RegimenFiscalModule } from './regimen-fiscal/regimen-fiscal.module';
import { TelefonosModule } from './telefonos/telefonos.module';
import { DomiciliosModule } from './domicilios/domicilios.module';
import { FacturacionClienteModule } from './facturacion-cliente/facturacion-cliente.module';
import { CreditosModule } from './creditos/creditos.module';
import { CuentasCobrarModule } from './cuentas-cobrar/cuentas-cobrar.module';
import { CfdiModule } from './cfdi/cfdi.module';
import { InventarioAlmacenModule } from './inventario-almacen/inventario-almacen.module';
import { ConfiguracionesModule } from './configuraciones/configuraciones.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { EmpresaModule } from './empresa/empresa.module';
import { TicketUploadsModule } from './ticket-uploads/ticket-uploads.module';
import { CartSessionModule } from './cart-session/cart-session.module';
import { DetalleLoteModule } from './detalle-lote/detalle-lote.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrdenesCompraModule } from './ordenes-compra/ordenes-compra.module';
import { RecepcionModule } from './recepciones/recepcion.module';
import { UpdatesModule } from './updates/updates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.dev', '.env'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
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
    ConfiguracionModule,
    MovimientosAlmacenModule,
    CategoriasClienteModule,
    DescuentosModule,
    UploadsModule,
    ReportesModule,
    ClientesModule,
    VentasModule,
    FacturasModule,
    RegimenFiscalModule,
    TelefonosModule,
    DomiciliosModule,
    FacturacionClienteModule,
    CreditosModule,
    CuentasCobrarModule,
    CfdiModule,
    InventarioAlmacenModule,
    ConfiguracionesModule,
    EmpresaModule,
    TicketUploadsModule,
    CartSessionModule,
    DetalleLoteModule,
    ProveedoresModule,
    OrdenesCompraModule,
    RecepcionModule,
    DashboardModule,
    UpdatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
