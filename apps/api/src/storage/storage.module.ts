/**
 * Storage module — selects and provides the active StoragePort based on
 * configuration, and (in development) mounts the local-storage route that the
 * LocalStorageAdapter's signed URLs point at. Production code depends only on
 * STORAGE_PORT; which adapter is behind it is a deployment decision.
 */

import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../config/configuration';
import { STORAGE_PORT, type StoragePort } from './storage.port';
import { S3StorageAdapter } from './s3.adapter';
import { LocalStorageAdapter } from './local.adapter';
import { LocalStorageController } from './local-storage.controller';

/**
 * Factory: choose the adapter by `STORAGE_DRIVER`. The local driver is refused
 * in production so a misconfigured deployment cannot quietly serve files from
 * the API process's disk.
 */
function createStorage(config: AppConfig): StoragePort {
  if (config.storageDriver === 'local') {
    if (config.nodeEnv === 'production') {
      throw new Error('Local storage driver must not be used in production');
    }
    return new LocalStorageAdapter({
      baseDir: config.localStorageDir,
      publicBaseUrl: config.publicApiBaseUrl,
      signingSecret: config.localStorageSigningSecret,
      signedUrlTtlSeconds: config.signedUrlTtlSeconds,
    });
  }
  return new S3StorageAdapter({
    bucket: config.s3Bucket,
    region: config.s3Region,
    endpoint: config.s3Endpoint,
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
    forcePathStyle: config.s3ForcePathStyle,
    signedUrlTtlSeconds: config.signedUrlTtlSeconds,
  });
}

@Global()
@Module({
  controllers: [LocalStorageController],
  providers: [
    {
      provide: STORAGE_PORT,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => createStorage(config),
    },
  ],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
