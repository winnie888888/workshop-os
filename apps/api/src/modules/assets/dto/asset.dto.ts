import {
  IsIn, IsISO31661Alpha2, IsInt, IsOptional, IsString, Length, Matches, Min, Max,
} from 'class-validator';

export class CreateAssetDto {
  @IsString() @Length(1, 36)
  customerId!: string;

  @IsOptional() @IsString() @Length(1, 36)
  fleetId?: string;

  @IsIn(['tractor', 'truck', 'van', 'trailer', 'other'])
  type!: 'tractor' | 'truck' | 'van' | 'trailer' | 'other';

  @IsString() @Length(1, 20)
  plate!: string;

  @IsISO31661Alpha2()
  countryOfPlate!: string;

  @IsOptional() @Matches(/^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$/, { message: 'vin must be 17 valid chars' })
  vin?: string;

  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() @Min(1900) @Max(2100) year?: number;
  @IsOptional() @IsInt() @Min(0) odometerLast?: number;
}

export class LinkTrailerDto {
  @IsString() @Length(1, 36)
  trailerAssetId!: string;

  @IsOptional() @IsString()
  validFrom?: string; // ISO; defaults to now
}
