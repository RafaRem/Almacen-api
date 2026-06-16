import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

type HealthResponse = {
  status: 'ok';
  uptime: number;
  timestamp: string;
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
