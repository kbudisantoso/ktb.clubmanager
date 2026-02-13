import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireClubContext } from '../common/decorators/club-context.decorator.js';
import { FilesService } from './files.service.js';

/**
 * REST controller for file operations.
 * Scoped under /clubs/:slug/files.
 */
@ApiTags('Files')
@ApiBearerAuth()
@Controller('clubs/:slug/files')
@RequireClubContext()
export class FilesController {
  constructor(private filesService: FilesService) {}
}
