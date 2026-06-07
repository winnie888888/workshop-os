import { Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { FleetsRepository, type Fleet } from './fleets.repository';
import { CreateFleetDto } from './dto/fleet.dto';

@Injectable()
export class FleetsService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: FleetsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateFleetDto): Promise<Fleet> {
    const ctx = getContext();
    const id = newId();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const fleet = await this.repo.insert(tx, {
        id,
        tenantId: ctx.tenantId,
        customerId: dto.customerId,
        name: dto.name,
        costCenter: dto.costCenter ?? null,
        notes: dto.notes ?? null,
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'fleet.created',
        entityType: 'fleet', entityId: fleet.id, before: null, after: fleet,
      });
      return fleet;
    });
  }

  async findById(id: string): Promise<Fleet> {
    const ctx = getContext();
    const f = await this.pg.withTenant(ctx.tenantId, (tx) => this.repo.findById(tx, id));
    if (!f) throw new NotFoundException('Fleet not found');
    return f;
  }

  async listByCustomer(customerId: string): Promise<Fleet[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, (tx) => this.repo.listByCustomer(tx, customerId));
  }
}
