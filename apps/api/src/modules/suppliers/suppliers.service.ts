import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { newId, getContext, assertSupplierInvariants, type Supplier } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { AuditService } from '../../common/audit/audit.service';
import { SuppliersRepository } from './suppliers.repository';
import { CreateSupplierDto, UpdateSupplierDto, LinkSupplierItemDto } from './dto/supplier.dto';

/**
 * Suppliers own the source side of stock. The service mirrors the customers
 * service exactly: a single transaction writes the row (RLS-scoped) and appends
 * a tamper-evident audit entry, and the shared domain invariants are checked on
 * both create and update so an edit can never produce a state create would have
 * rejected. No Minimax sync here — suppliers are not synced now (the schema only
 * reserves a column for a future payables direction).
 */
@Injectable()
export class SuppliersService {
  constructor(
    private readonly pg: PgService,
    private readonly repo: SuppliersRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const ctx = getContext();
    const merged = {
      name: dto.name,
      country: dto.country,
      currency: dto.currency ?? 'EUR',
      vatId: dto.vatId ?? null,
      paymentTermsDays: dto.paymentTermsDays ?? 30,
      defaultLeadTimeDays: dto.defaultLeadTimeDays ?? 3,
    };
    assertSupplierInvariants(merged); // throws SupplierError -> 400 via filter

    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const supplier = await this.repo.insert(tx, {
        id: newId(), tenantId: ctx.tenantId, code: dto.code ?? null, name: dto.name,
        country: merged.country, vatId: merged.vatId, currency: merged.currency,
        paymentTermsDays: merged.paymentTermsDays, defaultLeadTimeDays: merged.defaultLeadTimeDays,
        email: dto.email ?? null, phone: dto.phone ?? null, address: dto.address ?? null,
        notes: dto.notes ?? null, createdBy: ctx.userId,
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'supplier.created',
        entityType: 'supplier', entityId: supplier.id, before: null, after: supplier,
      });
      return supplier;
    });
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const before = await this.repo.findById(tx, id);
      if (!before) throw new NotFoundException('Supplier not found');

      // Validate the MERGED result against the same invariants as create.
      assertSupplierInvariants({
        name: dto.name ?? before.name,
        country: dto.country ?? before.country,
        currency: dto.currency ?? before.currency,
        vatId: dto.vatId ?? before.vatId,
        paymentTermsDays: dto.paymentTermsDays ?? before.paymentTermsDays,
        defaultLeadTimeDays: dto.defaultLeadTimeDays ?? before.defaultLeadTimeDays,
      });

      const updated = await this.repo.update(tx, id, { ...dto, updatedBy: ctx.userId });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'supplier.updated',
        entityType: 'supplier', entityId: id, before, after: updated,
      });
      return updated!;
    });
  }

  async get(id: string): Promise<Supplier> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const s = await this.repo.findById(tx, id);
      if (!s) throw new NotFoundException('Supplier not found');
      return s;
    });
  }

  async list(opts: { status?: string; limit?: number }): Promise<Supplier[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, (tx) =>
      this.repo.list(tx, { status: opts.status, limit: Math.min(opts.limit ?? 100, 500) }));
  }

  // --- supplier ↔ item links ----------------------------------------------

  async linkItem(supplierId: string, dto: LinkSupplierItemDto): Promise<void> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const supplier = await this.repo.findById(tx, supplierId);
      if (!supplier) throw new NotFoundException('Supplier not found');
      const item = await tx.query(`SELECT id FROM app.inventory_items WHERE id = $1`, [dto.itemId]);
      if (item.rowCount === 0) throw new BadRequestException('Inventory item not found');

      await this.repo.linkItem(tx, {
        id: newId(), tenantId: ctx.tenantId, supplierId, itemId: dto.itemId,
        supplierSku: dto.supplierSku ?? null, supplierName: dto.supplierName ?? null,
        packSize: dto.packSize ?? 1, lastPriceMinor: String(dto.lastPriceMinor ?? 0),
        currency: dto.currency ?? supplier.currency, leadTimeDays: dto.leadTimeDays ?? null,
        preferred: dto.preferred ?? false,
      });
      await this.audit.append(tx, {
        tenantId: ctx.tenantId, actorId: ctx.userId, action: 'supplier.item_linked',
        entityType: 'supplier', entityId: supplierId, before: null,
        after: { itemId: dto.itemId, supplierSku: dto.supplierSku ?? null, preferred: dto.preferred ?? false },
      });
    });
  }

  async itemsForSupplier(supplierId: string): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, (tx) => this.repo.itemsForSupplier(tx, supplierId));
  }

  async suppliersForItem(itemId: string): Promise<any[]> {
    const ctx = getContext();
    return this.pg.withTenant(ctx.tenantId, (tx) => this.repo.suppliersForItem(tx, itemId));
  }
}
