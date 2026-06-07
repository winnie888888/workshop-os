import { IsIn, IsInt, IsISO31661Alpha2, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

/**
 * Patch DTO for editing a vehicle. Mirrors CreateAssetDto's field rules, minus
 * customerId — a vehicle's owner is not changed through an ordinary edit. All
 * fields optional; the service re-normalises the plate and re-validates the VIN
 * just as create does.
 */
export class UpdateAssetDto {
  @IsOptional() @IsString() @Length(1, 36) fleetId?: string;
  @IsOptional() @IsIn(['tractor', 'truck', 'van', 'trailer', 'other']) type?: string;
  @IsOptional() @IsString() @Length(1, 20) plate?: string;
  @IsOptional() @IsISO31661Alpha2() countryOfPlate?: string;
  @IsOptional() @Matches(/^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$/, { message: 'vin must be 17 valid chars' }) vin?: string;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() @Min(1900) @Max(2100) year?: number;
  @IsOptional() @IsInt() @Min(0) odometerLast?: number;
}
