import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { Permission } from '@workshop/shared';
import { AttachmentsService } from './attachments.service';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Attachment DTOs. The presign step is validated twice: structurally here by
 * class-validator, and semantically by the shared AttachmentPolicy in the
 * service (content type, size, kind). Both layers matter — the DTO stops
 * malformed requests, the policy stops disallowed-but-well-formed ones.
 */
class PresignDto {
  @IsOptional() @IsString() @Length(1, 36) workOrderId?: string;
  @IsIn(['photo', 'voice_note', 'document']) kind!: string;
  @IsString() @Length(1, 255) filename!: string;
  @IsString() @Length(1, 150) contentType!: string;
  @IsInt() @Min(1) byteSize!: number;
}

class CompleteDto {
  @IsOptional() @IsString() @Length(1, 128) checksumSha256?: string;
  // Voice notes carry the on-device transcript (set at completion).
  @IsOptional() @IsString() @Length(1, 5000) transcript?: string;
}

@Controller('attachments')
@UseGuards(PermissionsGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  // Issue an upload URL. Both mechanics (line_time) and advisors (edit) hold
  // WorkOrderLineTime, so either can attach a photo, note, or document.
  @Post('presign')
  @RequirePermissions(Permission.WorkOrderLineTime)
  presign(@Body() dto: PresignDto) {
    return this.attachments.presign(dto);
  }

  // Confirm the bytes landed; flips the attachment to 'stored'.
  @Post(':id/complete')
  @RequirePermissions(Permission.WorkOrderLineTime)
  complete(@Param('id') id: string, @Body() dto: CompleteDto) {
    return this.attachments.complete(id, dto);
  }

  // A short-lived URL to view/download the file.
  @Get(':id/url')
  @RequirePermissions(Permission.WorkOrderLineTime)
  url(@Param('id') id: string) {
    return this.attachments.downloadUrl(id);
  }

  // List a work order's stored attachments.
  @Get()
  @RequirePermissions(Permission.WorkOrderLineTime)
  list(@Query('workOrderId') workOrderId: string) {
    return this.attachments.listForWorkOrder(workOrderId);
  }
}
