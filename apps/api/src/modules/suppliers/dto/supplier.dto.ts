import {
  IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Min,
} from 'class-validator';

// Create a supplier. Country/currency are validated for length here; the shared
// assertSupplierInvariants is the domain authority and runs in the service too.
export class CreateSupplierDto {
  @IsOptional() @IsString() @Length(1, 30) code?: string;
  @IsString() @Length(1, 200) name!: string;
  @IsString() @Length(2, 2) country!: string;
  @IsOptional() @IsString() @Length(2, 20) vatId?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsInt() @Min(0) paymentTermsDays?: number;
  @IsOptional() @IsInt() @Min(0) defaultLeadTimeDays?: number;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(1, 50) phone?: string;
  @IsOptional() @IsString() @Length(1, 500) address?: string;
  @IsOptional() @IsString() @Length(1, 1000) notes?: string;
}

export class UpdateSupplierDto {
  @IsOptional() @IsString() @Length(1, 30) code?: string;
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
  @IsOptional() @IsString() @Length(2, 20) vatId?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsInt() @Min(0) paymentTermsDays?: number;
  @IsOptional() @IsInt() @Min(0) defaultLeadTimeDays?: number;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Length(1, 50) phone?: string;
  @IsOptional() @IsString() @Length(1, 500) address?: string;
  @IsOptional() @IsString() @Length(1, 1000) notes?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
}

// Link a catalogue item to this supplier (or update the existing link).
export class LinkSupplierItemDto {
  @IsString() itemId!: string;
  @IsOptional() @IsString() @Length(1, 80) supplierSku?: string;
  @IsOptional() @IsString() @Length(1, 200) supplierName?: string;
  @IsOptional() @IsInt() @Min(1) packSize?: number;
  @IsOptional() @IsInt() @Min(0) lastPriceMinor?: number;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsInt() @Min(0) leadTimeDays?: number;
  @IsOptional() @IsBoolean() preferred?: boolean;
}
