import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  HttpException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

// vi.mock is hoisted — define the mock class inside the factory
vi.mock('../../../../../prisma/generated/client/index.js', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = code;
      this.clientVersion = '7.0.0';
    }
  }
  return {
    Prisma: { PrismaClientKnownRequestError },
  };
});

// Import after mock setup
import { AllExceptionsFilter } from './all-exceptions.filter';
import { Prisma } from '../../../../../prisma/generated/client/index.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockReply: ReturnType<typeof vi.fn>;
  let mockHost: {
    switchToHttp: () => { getResponse: () => object };
  };
  let mockHttpAdapterHost: {
    httpAdapter: { reply: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockReply = vi.fn();
    mockHttpAdapterHost = {
      httpAdapter: { reply: mockReply },
    };
    filter = new AllExceptionsFilter(mockHttpAdapterHost as never);
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({}),
      }),
    };
  });

  it('passes through HttpException status and message', () => {
    filter.catch(new BadRequestException('Ungueltige Daten'), mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 400, message: 'Ungueltige Daten' }),
      400
    );
  });

  it('preserves validation error arrays from class-validator', () => {
    const exception = new BadRequestException({
      message: ['field must not be empty', 'field must be a string'],
      error: 'Bad Request',
    });
    filter.catch(exception, mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusCode: 400,
        message: ['field must not be empty', 'field must be a string'],
      }),
      400
    );
  });

  it('handles 404 NotFoundException', () => {
    filter.catch(new NotFoundException(), mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 404 }),
      404
    );
  });

  it('handles 403 ForbiddenException', () => {
    filter.catch(new ForbiddenException('Kein Zugriff'), mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 403, message: 'Kein Zugriff' }),
      403
    );
  });

  it('maps Prisma P2002 (unique constraint) to 409', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
    } as never);
    filter.catch(error, mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusCode: 409,
        message: 'Ein Datensatz mit diesen Daten existiert bereits',
      }),
      409
    );
  });

  it('maps Prisma P2025 (not found) to 404', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
    } as never);
    filter.catch(error, mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusCode: 404,
        message: 'Datensatz nicht gefunden',
      }),
      404
    );
  });

  it('maps Prisma P2003 (foreign key) to 400', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
    } as never);
    filter.catch(error, mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 400, message: 'Ungueltige Referenz' }),
      400
    );
  });

  it('maps unknown Prisma errors to generic 400', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Some error', {
      code: 'P9999',
    } as never);
    filter.catch(error, mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 400, message: 'Datenbankfehler' }),
      400
    );
  });

  it('returns generic 500 for unknown errors (no leak)', () => {
    filter.catch(new Error('sensitive internal details'), mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusCode: 500,
        message: 'Ein interner Fehler ist aufgetreten',
      }),
      500
    );
  });

  it('handles non-Error thrown values', () => {
    filter.catch('string error', mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusCode: 500,
        message: 'Ein interner Fehler ist aufgetreten',
      }),
      500
    );
  });

  it('includes timestamp in response body', () => {
    filter.catch(new Error('test'), mockHost as never);

    const body = mockReply.mock.calls[0]![1];
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it('handles HttpException with string response', () => {
    filter.catch(new HttpException('Custom message', 422), mockHost as never);

    expect(mockReply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 422, message: 'Custom message' }),
      422
    );
  });
});
