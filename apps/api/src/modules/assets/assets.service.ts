import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  newId, getContext, normalizePlate, isStructurallyValidVin,
} from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { AssetsRepository, type Asset } from './assets.repository';
import { CreateAssetDto, LinkTrailerDto } from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: AssetsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateAssetDto): Promise<Asset> {
    const ctx = getContext();
    const plate = normalizePlate(dto.plate);
    if (dto.vin && !isStructurallyValidVin(dto.vin)) {
      throw new BadRequestException('VIN failed structural validation');
    }
    const id = newId();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const asset = await this.repo.insert(tx, {
        id,
        tenantId: ctx.tenantId,
        customerId: dto.customerId,
        fleetId: dto.fleetId ?? null,
        type: dto.type,
        plate,
        countryOfPlate: dto.countryOfPlate.toUpperCase(),
        vin: dto.vin ? dto.vin.toUpperCase() : null,
        make: dto.make ?? null,
        model: dto.model ?? null,
        year: dto.year ?? null,
        odometerLast: dto.odometerLast ?? null,
        createdBy: ctx.userId,
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'asset.created',
        entityType: 'asset', entityId: asset.id, before: null, after: asset,
      });
      return asset;
    });
  }

  /**
   * Edit a vehicle's descriptive fields (plate, VIN, make/model, year,
   * odometer, fleet, type). Re-runs the same plate normalisation and VIN
   * structural check that `create` does, then audits before/after. Ownership
   * (customer_id) is intentionally immutable here — see repo note.
   */
  async update(id: string, dto: import('./dto/update-asset.dto').UpdateAssetDto): Promise<Asset> {
    const ctx = getContext();
    if (dto.vin && !isStructurallyValidVin(dto.vin)) {
      throw new BadRequestException('VIN failed structural validation');
    }
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const before = await this.repo.findById(tx, id);
      if (!before) throw new NotFoundException('Asset not found');

      const after = await this.repo.update(tx, id, {
        fleetId: dto.fleetId,
        type: dto.type,
        plate: dto.plate ? normalizePlate(dto.plate) : undefined,
        countryOfPlate: dto.countryOfPlate ? dto.countryOfPlate.toUpperCase() : undefined,
        vin: dto.vin ? dto.vin.toUpperCase() : dto.vin,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        odometerLast: dto.odometerLast,
        updatedBy: ctx.userId,
      });
      if (!after) throw new NotFoundException('Asset not found');

      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'asset.updated',
        entityType: 'asset', entityId: id, before, after,
      });
      return after;
    });
  }

  async findById(id: string): Promise<Asset & { currentTrailerId: string | null }> {
    const ctx = getContext();
    const result = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const asset = await this.repo.findById(tx, id);
      if (!asset) return null;
      const currentTrailerId = await this.repo.currentTrailer(tx, id);
      return { ...asset, currentTrailerId };
    });
    if (!result) throw new NotFoundException('Asset not found');
    return result;
  }

  async listByCustomer(customerId: string): Promise<Asset[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, (tx) => this.repo.listByCustomer(tx, customerId));
  }

  /**
   * Pair a trailer to a tractor for a period of time. Trucking reality: the same
   * tractor pulls different trailers on different days, so the relationship is
   * time-bounded, not a fixed column. Linking a new trailer closes the previous
   * open pairing automatically.
   */
  async linkTrailer(tractorId: string, dto: LinkTrailerDto): Promise<{ linkId: string }> {
    const ctx = getContext();
    const validFrom = dto.validFrom ?? new Date().toISOString();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const tractor = await this.repo.findById(tx, tractorId);
      const trailer = await this.repo.findById(tx, dto.trailerAssetId);
      if (!tractor || !trailer) throw new NotFoundException('Tractor or trailer not found');
      if (tractor.type !== 'tractor' && tractor.type !== 'truck') {
        throw new BadRequestException('Lead asset must be a tractor/truck');
      }
      if (trailer.type !== 'trailer') {
        throw new BadRequestException('Linked asset must be a trailer');
      }
      const linkId = newId();
      await this.repo.linkTrailer(tx, {
        id: linkId, tenantId: ctx.tenantId, tractorAssetId: tractorId,
        trailerAssetId: dto.trailerAssetId, validFrom,
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'asset.trailer_linked',
        entityType: 'asset_link', entityId: linkId,
        before: null, after: { tractorId, trailerId: dto.trailerAssetId, validFrom },
      });
      return { linkId };
    });
  }
}
