import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import { MembershipTypesController } from './membership-types.controller.js';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator.js';
import type { Permission } from '../common/permissions/permissions.enum.js';
import { getUserPermissions } from '../common/permissions/permission-map.js';
import { ClubRole } from '../../../../prisma/generated/client/index.js';

const reflector = new Reflector();

function getMethodPermissions(methodName: string): string[] {
  const method = MembershipTypesController.prototype[methodName as keyof MembershipTypesController];
  return reflector.get<string[]>(PERMISSIONS_KEY, method as () => void) ?? [];
}

describe('MembershipTypesController permissions', () => {
  const adminPermissions = getUserPermissions([ClubRole.ADMIN]);

  it('ADMIN should be able to list membership types (findAll)', () => {
    const required = getMethodPermissions('findAll');
    const hasAccess = required.some((p) => adminPermissions.includes(p as Permission));

    expect(hasAccess).toBe(true);
  });

  it('ADMIN should be able to view a membership type (findOne)', () => {
    const required = getMethodPermissions('findOne');
    const hasAccess = required.some((p) => adminPermissions.includes(p as Permission));

    expect(hasAccess).toBe(true);
  });

  it('ADMIN should be able to create membership types (create)', () => {
    const required = getMethodPermissions('create');
    const hasAccess = required.some((p) => adminPermissions.includes(p as Permission));

    expect(hasAccess).toBe(true);
  });

  it('MEMBER should NOT be able to list membership types', () => {
    const memberPermissions = getUserPermissions([ClubRole.MEMBER]);
    const required = getMethodPermissions('findAll');
    const hasAccess = required.some((p) => memberPermissions.includes(p as Permission));

    expect(hasAccess).toBe(false);
  });
});
