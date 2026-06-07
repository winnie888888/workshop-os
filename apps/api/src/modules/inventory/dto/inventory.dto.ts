import { IsBoolean, IsInt, IsOptional, IsString, Length, Min, Matches } from 'class-validator';

export class CreateItemDto {
  @IsString() @Length(1, 200) name!: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() oemRef?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsInt() @Min(0) costMinor?: number;
  @IsOptional() @IsInt() @Min(0) priceMinor?: number;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @Matches(/^\d+(\.\d{1,2})?$/) vatRatePct?: string;
  @IsOptional() @IsBoolean() isCore?: boolean;
}

export class ReceiveStockDto {
  @IsString() @Length(1, 36) itemId!: string;
  @IsString() @Length(1, 36) locationId!: string;
  @IsInt() @Min(1) quantity!: number;
  // Phase 5.0: a costed receive recomputes the item's moving-average cost.
  @IsOptional() @IsInt() @Min(0) unitCostMinor?: number;
  @IsOptional() @IsString() reason?: string;
}

// Phase 5.0: move stock between two locations. The service validates that the
// source has enough FREE (unreserved) stock and writes an atomic transfer pair.
export class TransferStockDto {
  @IsString() @Length(1, 36) itemId!: string;
  @IsString() @Length(1, 36) fromLocationId!: string;
  @IsString() @Length(1, 36) toLocationId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() reason?: string;
}
