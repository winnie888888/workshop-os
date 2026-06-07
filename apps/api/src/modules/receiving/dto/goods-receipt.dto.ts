import { IsArray, IsInt, IsNumber, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// One received line on a draft GRN. The location is where the stock physically
// lands; unit_cost is what this delivery cost per unit (drives moving-average).
export class GrnLineDto {
  @IsString() itemId!: string;
  @IsString() locationId!: string;
  @IsInt() @Min(1) qty!: number;
  @IsInt() @Min(0) unitCostMinor!: number;
  @IsOptional() @IsString() purchaseOrderLineId?: string;
  // OCR provenance (only set by the future extraction pipeline).
  @IsOptional() @IsString() ocrRawText?: string;
  @IsOptional() @IsNumber() ocrConfidence?: number;
  @IsOptional() @IsString() matchStatus?: string;
}

// Create a draft goods receipt. source defaults to 'manual'; the OCR pipeline
// will create drafts with source='ocr', an ocrAttachmentId, and per-line
// confidence — the same endpoint, just pre-filled.
export class CreateGrnDto {
  @IsString() supplierId!: string;
  @IsOptional() @IsString() purchaseOrderId?: string;
  @IsOptional() @IsString() @Length(1, 100) deliveryNoteRef?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() ocrAttachmentId?: string;
  @IsOptional() @IsNumber() ocrConfidence?: number;
  @IsOptional() @IsString() @Length(1, 1000) notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => GrnLineDto)
  lines!: GrnLineDto[];
}
