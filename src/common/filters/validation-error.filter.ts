import {
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';

@Catch(BadRequestException)
export class ValidationErrorFilter {
  private readonly logger = new Logger('ValidationError');

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const response = exception.getResponse();

    this.logger.error(`=== VALIDATION FAILED on ${req.method} ${req.originalUrl} ===`);
    this.logger.error(`Body keys: ${Object.keys(req.body || {})}`);
    this.logger.error(`productos type: ${typeof req.body?.productos}`);
    this.logger.error(`productos raw: ${JSON.stringify(req.body?.productos)?.slice(0, 300)}`);
    this.logger.error(`xmlContent type: ${typeof req.body?.xmlContent}`);
    this.logger.error(`xmlContent raw: ${JSON.stringify(req.body?.xmlContent)}`);
    this.logger.error(`file name: ${req.file?.originalname} | size: ${req.file?.size}`);
    this.logger.error(`Errores: ${JSON.stringify(response)}`);

    res.status(exception.getStatus()).json(response);
  }
}