import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { VoiceWorkOrderService } from './voice-workorder.service';

/**
 * Voice work orders — record a spoken note (uploaded through the existing
 * attachments pipeline) and the system drafts a work order for review. Three
 * endpoints, mirroring the airlock used by plate scanning and OCR:
 *   - draft          : transcribe + extract + resolve (NEVER mutates).
 *   - confirm/create : human confirms creating a new work order.
 *   - confirm/update : human confirms appending to an existing work order.
 * Gated on WorkOrderCreate (drafting and creating) / WorkOrderEdit (updating),
 * the same permissions manual intake and editing use.
 */
class DraftDto {
  @IsString() attachmentId!: string;
  @IsOptional() @IsString() @Length(2, 8) languageHint?: string;
}
class VoiceLineDto {
  @IsIn(['labour', 'part', 'fee']) type!: 'labour' | 'part' | 'fee';
  @IsString() @Length(1, 300) description!: string;
}
class ConfirmCreateDto {
  @IsString() @Length(1, 36) customerId!: string;
  @IsOptional() @IsString() @Length(1, 36) assetId?: string;
  @IsOptional() @IsString() complaint?: string;
  @IsOptional() @IsInt() @Min(0) odometerKm?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VoiceLineDto) lines?: VoiceLineDto[];
  @IsOptional() @IsString() @Length(36, 36) clientId?: string;
}
class ConfirmUpdateDto {
  @IsString() @Length(1, 36) workOrderId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => VoiceLineDto) lines!: VoiceLineDto[];
}

@Controller('voice-work-orders')
@UseGuards(PermissionsGuard)
export class VoiceWorkOrderController {
  constructor(private readonly voice: VoiceWorkOrderService) {}

  @Post('draft')
  // AI transkripcija + ekstrakcija je draga; strog limit proti zlorabi generacije.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @RequirePermissions(Permission.WorkOrderCreate)
  async draft(@Body() dto: DraftDto) {
    return this.voice.draft({ attachmentId: dto.attachmentId, languageHint: dto.languageHint ?? null });
  }

  @Post('confirm/create')
  @RequirePermissions(Permission.WorkOrderCreate)
  async confirmCreate(@Body() dto: ConfirmCreateDto) {
    return this.voice.confirmCreate({
      customerId: dto.customerId, assetId: dto.assetId, complaint: dto.complaint,
      odometerKm: dto.odometerKm, lines: dto.lines, clientId: dto.clientId,
    });
  }

  @Post('confirm/update')
  @RequirePermissions(Permission.WorkOrderEdit)
  async confirmUpdate(@Body() dto: ConfirmUpdateDto) {
    return this.voice.confirmUpdate({ workOrderId: dto.workOrderId, lines: dto.lines });
  }
}
