import { IsArray, IsInt, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// A standalone adjustment. qty is signed: negative removes stock (damage, loss),
// positive adds it (found stock). Zero is rejected by the service.
export class AdjustStockDto {
  @IsString() itemId!: string;
  @IsString() locationId!: string;
  @IsInt() qty!: number;
  @IsString() @Length(3, 300) reason!: string;
}

export class OpenCountDto {
  @IsOptional() @IsString() scope?: string;       // 'location' | 'item_subset' | 'full'
  @IsOptional() @IsString() locationId?: string;  // required in practice for 'location' scope
  @IsOptional() @IsString() @Length(1, 1000) notes?: string;
}

export class CountLineDto {
  @IsString() itemId!: string;
  @IsString() locationId!: string;
  @IsInt() countedQty!: number;
}

export class RecordCountDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CountLineDto)
  lines!: CountLineDto[];
}
