import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { PlateRecognitionService } from './plate-recognition.service';

/**
 * Plate recognition — the advisor photographs a plate (uploaded through the
 * existing attachments pipeline) and the system identifies the vehicle and
 * customer and detects open work orders. Three endpoints, mirroring the airlock:
 *   - recognize        : read + match + detect (NEVER mutates).
 *   - confirm/existing : human confirms opening an existing work order.
 *   - confirm/new      : human confirms creating a new work order.
 * Creating/opening a work order requires the WorkOrderManage permission, the
 * same as manual intake — recognition itself only needs to read vehicles, but we
 * gate the whole controller on WorkOrderCreate since its purpose is intake.
 */
class RecognizeDto {
  @IsString() attachmentId!: string;
}
class ConfirmExistingDto {
  @IsString() @Length(1, 36) workOrderId!: string;
  @IsString() @Length(1, 36) assetId!: string;
}
class ConfirmNewDto {
  @IsString() @Length(1, 36) customerId!: string;
  @IsString() @Length(1, 36) assetId!: string;
  @IsOptional() @IsString() complaint?: string;
  @IsOptional() @IsInt() @Min(0) odometer?: number;
  @IsOptional() @IsString() @Length(36, 36) clientId?: string;
}

@Controller('plate-recognition')
@UseGuards(PermissionsGuard)
export class PlateRecognitionController {
  constructor(private readonly plate: PlateRecognitionService) {}

  @Post('recognize')
  @RequirePermissions(Permission.WorkOrderCreate)
  async recognize(@Body() dto: RecognizeDto) {
    return this.plate.recognize({ attachmentId: dto.attachmentId });
  }

  @Post('confirm/existing')
  @RequirePermissions(Permission.WorkOrderCreate)
  async confirmExisting(@Body() dto: ConfirmExistingDto) {
    return this.plate.confirmExisting({ workOrderId: dto.workOrderId, assetId: dto.assetId });
  }

  @Post('confirm/new')
  @RequirePermissions(Permission.WorkOrderCreate)
  async confirmNew(@Body() dto: ConfirmNewDto) {
    return this.plate.confirmNew({
      customerId: dto.customerId, assetId: dto.assetId,
      complaint: dto.complaint, odometer: dto.odometer, clientId: dto.clientId,
    });
  }
}
