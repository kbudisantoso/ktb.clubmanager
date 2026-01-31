import { Module, Global } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service.js';

@Global()
@Module({
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class SettingsModule {}
