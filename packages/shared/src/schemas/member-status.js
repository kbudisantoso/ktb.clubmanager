"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MEMBER_STATUS = exports.MemberStatusSchema = void 0;
const zod_1 = require("zod");
/**
 * Member status enum - tracks lifecycle of club membership.
 * Used across API and frontend for consistent status handling.
 */
exports.MemberStatusSchema = zod_1.z.enum(['ACTIVE', 'INACTIVE', 'PENDING']);
/**
 * Default member status for new members.
 */
exports.DEFAULT_MEMBER_STATUS = 'PENDING';
