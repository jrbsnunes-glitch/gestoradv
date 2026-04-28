import { Injectable, Scope } from '@nestjs/common';

export interface TenantInfo {
  tenantId: string;
  slug: string;
  databaseUrl: string;
  databaseName: string;
  cnpj: string;
  isActive: boolean;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private _tenant: TenantInfo | null = null;

  set(tenant: TenantInfo): void {
    this._tenant = tenant;
  }

  get(): TenantInfo | null {
    return this._tenant;
  }

  getTenantId(): string {
    if (!this._tenant) throw new Error('Tenant not resolved');
    return this._tenant.tenantId;
  }

  getDatabaseUrl(): string {
    if (!this._tenant) throw new Error('Tenant not resolved');
    return this._tenant.databaseUrl;
  }

  isResolved(): boolean {
    return this._tenant !== null;
  }
}
