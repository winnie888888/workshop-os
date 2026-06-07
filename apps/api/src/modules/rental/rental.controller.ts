import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { RentalService } from './rental.service';
import { generateRentalContractPdf } from './rental-pdf';

/**
 * Vehicle rental — the desk workflow, gated on RentalManage. The endpoints follow
 * the operational flow: create a fleet vehicle, reserve it, create a contract,
 * hand it over, take it back (which computes the charges), generate the final
 * invoice through the existing engine, and fetch the contract or its signed PDF.
 */
class CreateVehicleDto {
  @IsString() plate!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsInt() @Min(0) dailyRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) includedKmPerDay?: number;
  @IsOptional() @IsInt() @Min(0) perKmRateMinor?: number;
  @IsOptional() @IsInt() @Min(0) perFuelEighthMinor?: number;
  @IsOptional() @IsInt() @Min(0) cleaningFeeMinor?: number;
  @IsOptional() @IsInt() @Min(0) lateFeePerDayMinor?: number;
  @IsOptional() @IsInt() @Min(0) depositMinor?: number;
  @IsOptional() @IsInt() @Min(0) deductibleMinor?: number;
}
class ReserveDto {
  @IsString() @Length(1, 36) rentalVehicleId!: string;
  @IsString() @Length(1, 36) customerId!: string;
  @IsString() startAt!: string;
  @IsString() endAt!: string;
  @IsOptional() @IsString() pickupLocation?: string;
  @IsOptional() @IsString() returnLocation?: string;
}
class CreateContractDto {
  @IsString() @Length(1, 36) reservationId!: string;
  @IsOptional() @IsBoolean() casco?: boolean;
  @IsOptional() @IsString() fuelPolicy?: string;
  @IsOptional() @IsString() mileagePolicy?: string;
  @IsOptional() @IsString() latePolicy?: string;
}
class HandoverDto {
  @IsInt() @Min(0) startMileageKm!: number;
  @IsInt() @Min(0) startFuelEighths!: number;
  @IsOptional() @IsString() signatureAttachmentId?: string;
}
class ReturnDto {
  @IsInt() @Min(0) returnMileageKm!: number;
  @IsInt() @Min(0) returnFuelEighths!: number;
  @IsOptional() @IsBoolean() dirty?: boolean;
  @IsOptional() @IsString() signatureAttachmentId?: string;
  @IsOptional() @IsArray() damages?: Array<{ description: string; severity?: string; estimatedCostMinor?: number; photoAttachmentIds?: string[] }>;
}

@Controller('rental')
@UseGuards(PermissionsGuard)
export class RentalController {
  constructor(private readonly rental: RentalService) {}

  // --- Fleet ---
  @Post('vehicles')
  @RequirePermissions(Permission.RentalManage)
  createVehicle(@Body() dto: CreateVehicleDto) { return this.rental.createVehicle(dto); }

  @Get('vehicles')
  @RequirePermissions(Permission.RentalManage)
  listVehicles() { return this.rental.listVehicles(); }

  // --- Reservations / calendar ---
  @Post('reservations')
  @RequirePermissions(Permission.RentalManage)
  reserve(@Body() dto: ReserveDto) { return this.rental.reserve(dto); }

  @Get('calendar')
  @RequirePermissions(Permission.RentalManage)
  calendar(@Query('from') from: string, @Query('to') to: string) { return this.rental.calendar(from, to); }

  // --- Contracts ---
  @Post('contracts')
  @RequirePermissions(Permission.RentalManage)
  createContract(@Body() dto: CreateContractDto) { return this.rental.createContract(dto); }

  @Get('contracts/:id')
  @RequirePermissions(Permission.RentalManage)
  getContract(@Param('id') id: string) { return this.rental.getContract(id); }

  @Post('contracts/:id/handover')
  @RequirePermissions(Permission.RentalManage)
  handover(@Param('id') id: string, @Body() dto: HandoverDto) { return this.rental.handover(id, dto); }

  @Post('contracts/:id/return')
  @RequirePermissions(Permission.RentalManage)
  returnVehicle(@Param('id') id: string, @Body() dto: ReturnDto) { return this.rental.returnVehicle(id, dto); }

  @Post('contracts/:id/invoice')
  @RequirePermissions(Permission.RentalManage)
  generateInvoice(@Param('id') id: string) { return this.rental.generateInvoice(id); }

  // --- Contract PDF (the document the customer signs) ---
  @Get('contracts/:id/pdf')
  @RequirePermissions(Permission.RentalManage)
  async contractPdf(@Param('id') id: string, @Res() res: any) {
    const { contract, vehicle, customer } = await this.rental.getContract(id);
    const pdf = generateRentalContractPdf({
      workshopName: 'A-SPRINT d.o.o.', workshopVatId: 'SI45598711',
      contractNumber: contract.number,
      customerName: customer?.name ?? '', customerVatId: customer?.vat_id, customerCountry: customer?.country,
      vehicle: `${[vehicle?.make, vehicle?.model].filter(Boolean).join(' ')} (${vehicle?.plate})`,
      vehicleVin: vehicle?.vin,
      startAt: contract.start_at, endAt: contract.end_at,
      pickupLocation: contract.pickup_location, returnLocation: contract.return_location,
      startMileageKm: contract.start_mileage_km, returnMileageKm: contract.return_mileage_km,
      startFuelEighths: contract.start_fuel_eighths, returnFuelEighths: contract.return_fuel_eighths,
      currency: contract.currency, dailyRateMinor: Number(contract.daily_rate_minor),
      includedKmPerDay: Number(contract.included_km_per_day), perKmRateMinor: Number(contract.per_km_rate_minor),
      depositMinor: Number(contract.deposit_minor), casco: contract.casco === true,
      deductibleMinor: Number(contract.deductible_minor), fuelPolicy: contract.fuel_policy,
      mileagePolicy: contract.mileage_policy, latePolicy: contract.late_policy,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="rental-${contract.number}.pdf"`);
    res.send(pdf);
  }
}
