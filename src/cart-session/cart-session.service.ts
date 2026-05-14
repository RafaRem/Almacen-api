import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  CartSessionDto,
  SaveCartDto,
  CartSessionResponseDto,
} from './dto/cart-session.dto';

@Injectable()
export class CartSessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CartSessionService.name);
  private redis: Redis;
  private readonly TTL_SECONDS = 43200; // 12 horas

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.redis = new Redis({
      host,
      port,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis connection failed, operating without cache');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err.message);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redis.connect().catch((err) => {
      this.logger.warn('Could not connect to Redis:', err.message);
    });
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  private getKey(userId: string): string {
    return `cart:user:${userId}`;
  }

  async getCartSession(userId: string): Promise<CartSessionResponseDto | null> {
    try {
      const data = await this.redis.get(this.getKey(userId));
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Error getting cart session:', error.message);
      return null;
    }
  }

  async saveCartSession(
    userId: string,
    session: CartSessionDto,
  ): Promise<boolean> {
    try {
      const cleanedCarts = session.carts
        .filter((c) => c.items && c.items.length > 0)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 4);

      const sessionData: CartSessionResponseDto = {
        userId,
        carts: cleanedCarts,
        lastModified: new Date().toISOString(),
      };

      await this.redis.setex(
        this.getKey(userId),
        this.TTL_SECONDS,
        JSON.stringify(sessionData),
      );
      return true;
    } catch (error) {
      this.logger.error('Error saving cart session:', error.message);
      return false;
    }
  }

  async deleteCartSession(userId: string): Promise<boolean> {
    try {
      await this.redis.del(this.getKey(userId));
      return true;
    } catch (error) {
      this.logger.error('Error deleting cart session:', error.message);
      return false;
    }
  }

  async cartSessionExists(userId: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(this.getKey(userId));
      return exists === 1;
    } catch (error) {
      this.logger.error(
        'Error checking cart session existence:',
        error.message,
      );
      return false;
    }
  }

  async refreshTTL(userId: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(this.getKey(userId));
      if (exists) {
        await this.redis.expire(this.getKey(userId), this.TTL_SECONDS);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Error refreshing TTL:', error.message);
      return false;
    }
  }
}
