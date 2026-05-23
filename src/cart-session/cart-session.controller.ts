import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CartSessionService } from './cart-session.service';
import { CartSessionDto, SaveCartDto } from './dto/cart-session.dto';

@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartSessionController {
  constructor(private readonly cartSessionService: CartSessionService) {}

  @Get(':userId')
  async getCartSession(@Param('userId') userId: string) {
    const session = await this.cartSessionService.getCartSession(userId);
    if (!session) {
      throw new HttpException('Cart session not found', HttpStatus.NOT_FOUND);
    }
    return session;
  }

  @Put(':userId')
  async saveCartSession(
    @Param('userId') userId: string,
    @Body() cartSessionDto: CartSessionDto,
  ) {
    if (cartSessionDto.userId !== userId) {
      throw new HttpException('User ID mismatch', HttpStatus.FORBIDDEN);
    }

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

  @Delete(':userId')
  async deleteCartSession(@Param('userId') userId: string) {
    const success = await this.cartSessionService.deleteCartSession(userId);
    if (!success) {
      throw new HttpException(
        'Failed to delete cart session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { success: true, message: 'Cart session deleted' };
  }

  @Get(':userId/exists')
  async cartSessionExists(@Param('userId') userId: string) {
    const exists = await this.cartSessionService.cartSessionExists(userId);
    return { exists };
  }

  @Post(':userId/refresh')
  async refreshTTL(@Param('userId') userId: string) {
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
