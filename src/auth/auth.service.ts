import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    emailOrUsername: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const userByEmail = await this.usersService.findByEmail(emailOrUsername);
    const userByUsername =
      await this.usersService.findByUsername(emailOrUsername);
    const user = userByEmail || userByUsername;

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _pwd, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Omit<User, 'password'>) {
    const payload = { email: user.email, sub: user.id, tipo: user.tipo };
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload, type: 'access' },
        { expiresIn: '2h' as const },
      ),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        { expiresIn: '7d' as const },
      ),
    ]);
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        tipo: user.tipo,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ type: string; sub: string }>(
        refreshToken,
      );
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = { email: user.email, sub: user.id, tipo: user.tipo };
      return {
        access_token: await this.jwtService.signAsync(
          { ...newPayload, type: 'access' },
          { expiresIn: '2h' as const },
        ),
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
