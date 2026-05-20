import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketUploadsService } from './ticket-uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ticket')
@UseGuards(JwtAuthGuard)
export class TicketUploadsController {
  constructor(private readonly ticketUploadsService: TicketUploadsService) {}

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      return { error: 'No se proporcionó archivo' };
    }
    return this.ticketUploadsService.saveLogo(
      file,
      req.user?.userId || 'SYSTEM',
    );
  }

  @Get('logo')
  async getLogoUrl() {
    return this.ticketUploadsService.getLogoUrl();
  }

  @Delete('logo')
  async deleteLogo(@Request() req) {
    return this.ticketUploadsService.deleteLogo(req.user?.userId || 'SYSTEM');
  }
}
