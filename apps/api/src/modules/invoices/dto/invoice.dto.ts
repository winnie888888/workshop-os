import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class IssueInvoiceDto {
  @IsString() @Length(1, 36)
  workOrderId!: string;

  /** Override payment terms; otherwise the customer's terms are used. */
  @IsOptional() @IsInt() @Min(0) @Max(365)
  dueDays?: number;

  /** Issue date (ISO yyyy-mm-dd); defaults to today. */
  @IsOptional() @IsString()
  issueDate?: string;
}

export class CreditNoteDto {
  @IsString() @Length(1, 36)
  invoiceId!: string;

  @IsString() @Length(1, 500)
  reason!: string;
}

export class RecordPaymentDto {
  @IsString() @Length(1, 36) customerId!: string;
  @IsInt() @Min(1) amountMinor!: number;
  @IsIn(['bank', 'cash', 'card', 'other']) method!: 'bank' | 'cash' | 'card' | 'other';
  @IsString() receivedAt!: string; // ISO date
  @IsOptional() @IsString() reference?: string;
}
