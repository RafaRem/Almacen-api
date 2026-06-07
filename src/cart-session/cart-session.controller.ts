import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CartSessionService } from './cart-session.service';
import { CartSessionDto, SaveCartDto } from './dto/cart-session.dto';

@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartSessionController {
  constructor(private readonly cartSessionService: CartSessionService) {}

  @Get()
  async getCartSession(@Request() req) {
    const userId = req.user.id;
    const session = await this.cartSessionService.getCartSession(userId);
    if (!session) {
      throw new HttpException('Cart session not found', HttpStatus.NOT_FOUND);
    }
    return session;
  }

  @Put()
  async saveCartSession(
    @Body() cartSessionDto: CartSessionDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    const success = await this.cartSessionService.saveCartSession(
      userId,
      cartSessionDto,
    );
    if (!success) {
      throw new HttpException(
        'Failed to save cart session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { success: true, message: 'Cart session saved' };
  }

  @Delete()
  async deleteCartSession(@Request() req) {
    const userId = req.user.id;
    const success = await this.cartSessionService.deleteCartSession(userId);
    if (!success) {
      throw new HttpException(
        'Failed to delete cart session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { success: true, message: 'Cart session deleted' };
  }

  @Get('exists')
  async cartSessionExists(@Request() req) {
    const userId = req.user.id;
    const exists = await this.cartSessionService.cartSessionExists(userId);
    return { exists };
  }

  @Post('refresh')
  async refreshTTL(@Request() req) {
    const userId = req.user.id;
    const refreshed = await this.cartSessionService.refreshTTL(userId);
    if (!refreshed) {
      throw new HttpException(
        'No cart session to refresh',
        HttpStatus.NOT_FOUND,
      );
    }
    return { success: true, message: 'TTL refreshed' };
  }
}
