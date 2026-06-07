import { IsArray, IsIn, IsObject, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * The bay tablet replays a queue of mutations it captured while offline. Each
 * one carries the device id and an idempotency key so the server can apply it
 * exactly once even if the tablet retries after a flaky reconnect.
 */
export class SyncMutationDto {
  @IsString() @Length(1, 64) deviceId!: string;
  @IsString() @Length(1, 128) idempotencyKey!: string;

  @IsIn([
    'work_order.create',
    'work_order.add_line',
    'work_order.transition',
    'time.clock_on',
    'time.clock_off',
  ])
  type!: string;

  @IsObject()
  payload!: Record<string, any>;
}

export class SyncMutationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncMutationDto)
  mutations!: SyncMutationDto[];
}

export class SyncPullQuery {
  @IsOptional() @IsString() since?: string; // cursor (bigint as string)
  @IsOptional() @IsString() limit?: string;
}
