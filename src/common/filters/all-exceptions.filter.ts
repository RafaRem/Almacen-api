import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter {
  private readonly logger = new Logger('AllExceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : String(exception);

    this.logger.error(`[${req.method} ${req.originalUrl}] ${status} - ${JSON.stringify(message)}`, exception instanceof Error ? exception.stack : '');

    res.status(status).json(
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? { statusCode: status, message: 'Internal server error' }
        : message,
    );
  }
}