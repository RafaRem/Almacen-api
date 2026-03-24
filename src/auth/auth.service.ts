import { Injectable } from '@nestjs/common';
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

  login(user: Omit<User, 'password'>) {
    const payload = { email: user.email, sub: user.id, tipo: user.tipo };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        tipo: user.tipo,
      },
    };
  }
}
