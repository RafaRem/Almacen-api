import { Module } from '@nestjs/common';
import { CartSessionService } from './cart-session.service';
import { CartSessionController } from './cart-session.controller';

@Module({
  controllers: [CartSessionController],
  providers: [CartSessionService],
  exports: [CartSessionService],
})
export class CartSessionModule {}
