import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Application settings keys with their default values.
 */
export const APP_SETTING_DEFAULTS: AppSettingValues = {
  'club.selfServiceCreation': false,
  'club.defaultVisibility': 'PRIVATE',
  'club.defaultTierId': null,
  'tier.graceperiodDays': 14,
  'mode.saas': false, // true = SaaS mode (show upgrade prompts), false = OSS mode (hide disabled features)
};

/**
 * Type definitions for application settings.
 */
export interface AppSettingValues {
  'club.selfServiceCreation': boolean;
  'club.defaultVisibility': 'PUBLIC' | 'PRIVATE';
  'club.defaultTierId': string | null;
  'tier.graceperiodDays': number;
  'mode.saas': boolean;
}

export type AppSettingKey = keyof AppSettingValues;

@Injectable()
export class AppSettingsService {
  private cache: Map<string, string> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Gets a setting value, returning default if not set.
   *
   * @param key - Setting key
   * @returns Setting value
   */
  async get<K extends AppSettingKey>(key: K): Promise<AppSettingValues[K]> {
    // Check cache first
    if (this.cache.has(key)) {
      return JSON.parse(this.cache.get(key)!) as AppSettingValues[K];
    }

    const setting = await this.prisma.appSetting.findUnique({
      where: { key },
    });

    const value = setting?.value ?? JSON.stringify(APP_SETTING_DEFAULTS[key]);
    this.cache.set(key, value);

    return JSON.parse(value) as AppSettingValues[K];
  }

  /**
   * Sets a setting value.
   *
   * @param key - Setting key
   * @param value - Value to set
   */
  async set<K extends AppSettingKey>(
    key: K,
    value: AppSettingValues[K],
  ): Promise<void> {
    const serialized = JSON.stringify(value);

    await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value: serialized },
      update: { value: serialized },
    });

    this.cache.set(key, serialized);
  }

  /**
   * Gets all settings as an object.
   */
  async getAll(): Promise<AppSettingValues> {
    const settings = await this.prisma.appSetting.findMany();
    const result = { ...APP_SETTING_DEFAULTS };

    for (const setting of settings) {
      if (setting.key in result) {
        (result as Record<string, unknown>)[setting.key] = JSON.parse(
          setting.value,
        );
      }
    }

    // Update cache
    for (const [key, value] of Object.entries(result)) {
      this.cache.set(key, JSON.stringify(value));
    }

    return result;
  }

  /**
   * Clears the settings cache. Call after direct DB updates.
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Convenience methods for common settings
  async isSelfServiceEnabled(): Promise<boolean> {
    return this.get('club.selfServiceCreation');
  }

  async getDefaultVisibility(): Promise<'PUBLIC' | 'PRIVATE'> {
    return this.get('club.defaultVisibility');
  }

  async getDefaultTierId(): Promise<string | null> {
    return this.get('club.defaultTierId');
  }

  async isSaasMode(): Promise<boolean> {
    return this.get('mode.saas');
  }
}
