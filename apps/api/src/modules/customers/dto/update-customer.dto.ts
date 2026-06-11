import {
  IsBoolean, IsIn, IsInt, IsISO31661Alpha2, IsOptional, IsString, Length, Matches, Max, Min,
} from 'class-validator';

/**
 * Patch DTO for editing a customer. Every field is optional because the advisor
 * edits one or two things at a time; the service validates the *merged* result
 * against the same domain invariants `create` uses, so an edit can never leave
 * the record in an invalid state. The validation rules on each field mirror
 * CreateCustomerDto exactly so the two paths accept identical values.
 */
export class UpdateCustomerDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsIn(['individual', 'company']) type?: 'individual' | 'company';
  @IsOptional() @IsISO31661Alpha2() country?: string;
  @IsOptional() @IsString() @Length(1, 64) code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() postCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsBoolean() vatLiable?: boolean;
  @IsOptional() @Matches(/^[A-Za-z]{2}[0-9A-Za-z]{2,12}$/, { message: 'vatId is malformed' }) vatId?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() registrationNo?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/, { message: 'currency must be ISO 4217' }) currency?: string;
  @IsOptional() @IsInt() @Min(0) @Max(365) paymentTermsDays?: number;
  @IsOptional() @Matches(/^\d+(\.\d{1,2})?$/, { message: 'discountPct must be a decimal' }) discountPct?: string;
  @IsOptional() @IsString() minimaxPartnerId?: string;

  /** GSM/TEL (SMS obvestila, 0030). Normalizacija v E.164 ob pošiljanju. */
  @IsOptional() @IsString() @Length(3, 40)
  phone?: string;
}
