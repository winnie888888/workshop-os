import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { OcrReceivingService } from './ocr-receiving.service';

/**
 * OCR receiving — the warehouse clerk photographs a delivery note or supplier
 * invoice (uploaded through the existing attachments pipeline) and asks the
 * system to turn it into a DRAFT goods receipt. The endpoint requires the same
 * StockReceive permission as manual receiving. It deliberately exposes only the
 * "create a draft" step — there is no OCR posting route, because posting is the
 * human-confirmed action on the existing goods-receipts controller.
 */
class OcrDraftDto {
  @IsString() attachmentId!: string;
  @IsIn(['delivery_note', 'supplier_invoice']) documentType!: 'delivery_note' | 'supplier_invoice';
  // Where received stock lands unless the reviewer changes it on the draft.
  @IsString() defaultLocationId!: string;
  @IsOptional() @IsString() note?: string;
}

@Controller('ocr/receiving')
@UseGuards(PermissionsGuard)
export class OcrReceivingController {
  constructor(private readonly ocr: OcrReceivingService) {}

  /**
   * Extract a stored supplier document and create a draft goods receipt from it.
   * Returns the draft (if one could be created) plus the full review payload:
   * the supplier and PO matches, every line with its match verdict, and the
   * fields flagged for human review. Never posts; never moves stock.
   */
  @Post('draft')
  // AI ekstrakcija dokumenta je draga; strog limit proti zlorabi generacije.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequirePermissions(Permission.StockReceive)
  async draft(@Body() dto: OcrDraftDto) {
    return this.ocr.draftFromDocument({
      attachmentId: dto.attachmentId,
      documentType: dto.documentType,
      defaultLocationId: dto.defaultLocationId,
    });
  }
}
