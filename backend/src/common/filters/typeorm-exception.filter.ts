import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

/** Translate database errors into meaningful HTTP responses. */
@Catch(QueryFailedError, EntityNotFoundError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  catch(exception: QueryFailedError | EntityNotFoundError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof EntityNotFoundError) {
      return res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
      });
    }

    const msg = String((exception as QueryFailedError).message ?? '');
    const code = (exception as QueryFailedError & { driverError?: { code?: string } }).driverError
      ?.code;
    if (code === '23505' || /UNIQUE constraint failed/i.test(msg)) {
      return res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'A record with the same unique value already exists',
      });
    }
    if (code === '23503' || /FOREIGN KEY constraint failed/i.test(msg)) {
      return res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'This record is referenced by other records and cannot be changed',
      });
    }

    this.logger.error(msg, (exception as Error).stack);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Unexpected database error',
    });
  }
}
