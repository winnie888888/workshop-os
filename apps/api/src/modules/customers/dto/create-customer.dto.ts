import {
  IsBoolean, IsIn, IsInt, IsISO31661Alpha2, IsOptional, IsString,
  Length, Max, Min, Matches,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString() @Length(1, 200)
  name!: string;

  @IsIn(['individual', 'company'])
  type!: 'individual' | 'company';

  @IsISO31661Alpha2()
  country!: string;

  @IsOptional() @IsString() @Length(1, 64)
  code?: string;

  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() postCode?: string;
  @IsOptional() @IsString() city?: string;

  @IsBoolean()
  vatLiable!: boolean;

  @IsOptional() @Matches(/^[A-Za-z]{2}[0-9A-Za-z]{2,12}$/, { message: 'vatId is malformed' })
  vatId?: string;

  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() registrationNo?: string;

  @IsOptional() @Matches(/^[A-Z]{3}$/, { message: 'currency must be ISO 4217' })
  currency?: string;

  @IsOptional() @IsInt() @Min(0) @Max(365)
  paymentTermsDays?: number;

  @IsOptional() @Matches(/^\d+(\.\d{1,2})?$/, { message: 'discountPct must be a decimal' })
  discountPct?: string;

  @IsOptional() @IsString()
  minimaxPartnerId?: string;
}
