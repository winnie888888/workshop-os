import { IsArray, IsInt, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// One line on a draft purchase order. unit_cost is in minor units; the server
// computes net/VAT/gross from quantity × unit cost via the shared money core.
export class PoLineDto {
  @IsString() itemId!: string;
  @IsOptional() @IsString() supplierItemId?: string;
  @IsString() @Length(1, 300) description!: string;
  @IsInt() @Min(1) qtyOrdered!: number;
  @IsInt() @Min(0) unitCostMinor!: number;
  @IsOptional() @IsString() vatRatePct?: string;
}

export class CreatePoDto {
  @IsString() supplierId!: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() expectedDate?: string;
  @IsOptional() @IsString() shipToLocationId?: string;
  @IsOptional() @IsString() @Length(1, 1000) notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PoLineDto)
  lines!: PoLineDto[];
}
