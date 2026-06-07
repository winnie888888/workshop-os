import {
  IsIn, IsInt, IsOptional, IsString, Length, Matches, Min,
} from 'class-validator';
import { WorkOrderStatus } from '@workshop/shared';

export class CreateWorkOrderDto {
  @IsString() @Length(1, 36) customerId!: string;
  @IsOptional() @IsString() @Length(1, 36) assetId?: string;
  @IsOptional() @IsString() @Length(1, 36) fleetId?: string;
  @IsOptional() @IsString() @Length(1, 36) locationId?: string;
  @IsOptional() @IsString() complaint?: string;
  @IsOptional() @IsInt() @Min(0) odometer?: number;
  @IsOptional() @IsString() customerPo?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  /** Optional client-supplied id for offline-created work orders (idempotency). */
  @IsOptional() @IsString() @Length(36, 36) clientId?: string;
}

export class AddLineDto {
  /** Optional client-generated id so an offline-queued line replays idempotently. */
  @IsOptional() @IsString() @Length(36, 36) lineId?: string;

  @IsIn(['labour', 'part', 'sublet', 'kit', 'fee', 'core', 'discount'])
  type!: 'labour' | 'part' | 'sublet' | 'kit' | 'fee' | 'core' | 'discount';

  @IsString() @Length(1, 300) description!: string;

  @IsOptional() @IsString() @Length(1, 36) inventoryItemId?: string;
  @IsOptional() @IsString() @Length(1, 36) locationId?: string;

  @Matches(/^-?\d+(\.\d{1,3})?$/, { message: 'quantity must be a decimal' })
  quantity!: string;

  @IsInt() unitPriceMinor!: number;

  @IsOptional() @Matches(/^\d+(\.\d{1,2})?$/) discountPct?: string;
  @IsOptional() @Matches(/^\d+(\.\d{1,2})?$/) vatRatePct?: string;
}

export class TransitionDto {
  @IsIn(Object.values(WorkOrderStatus))
  to!: string;
}

export class ClockDto {
  @IsString() @Length(1, 36) mechanicId!: string;
}
