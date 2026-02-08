import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '../../../../../prisma/generated/client/index.js';

/**
 * Global exception filter that catches all unhandled exceptions.
 *
 * - HttpException: Passes through status and message (preserves validation errors)
 * - PrismaClientKnownRequestError: Maps to safe, generic German messages
 * - All other errors: Returns generic 500 error
 *
 * Full error details are logged server-side but never sent to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let statusCode = 500;
    let message: string | string[] = 'Ein interner Fehler ist aufgetreten';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      // Preserve nested validation error messages from class-validator
      if (typeof response === 'object' && response !== null && 'message' in response) {
        message = (response as { message: string | string[] }).message;
      } else if (typeof response === 'string') {
        message = response;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`Prisma error [${exception.code}]: ${exception.message}`, exception.stack);

      switch (exception.code) {
        case 'P2002':
          statusCode = 409;
          message = 'Ein Datensatz mit diesen Daten existiert bereits';
          break;
        case 'P2025':
          statusCode = 404;
          message = 'Datensatz nicht gefunden';
          break;
        case 'P2003':
          statusCode = 400;
          message = 'Ungueltige Referenz';
          break;
        default:
          statusCode = 400;
          message = 'Datenbankfehler';
          break;
      }
    } else {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(`Unhandled exception: ${err.message}`, err.stack);
    }

    const responseBody = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, statusCode);
  }
}
