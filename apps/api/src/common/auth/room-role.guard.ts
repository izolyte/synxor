import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { TokenRole } from '../../domain/security/token-issuer';
import { roomClaimsFrom } from './room-token.guard';

const REQUIRED_ROOM_ROLE = 'requiredRoomRole';

interface RequiredRoomRole {
  role: TokenRole;
  message: string;
}

// The message is per-route so the 403 body can say what the role gates
// ("Only the Sender may upload"), not just which role was missing.
export const RequireRoomRole = (role: TokenRole, message: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRED_ROOM_ROLE, { role, message });

// Runs after RoomTokenGuard (list it second in @UseGuards) and reads the claims
// that guard attached. As a guard rather than a handler check, the role is
// rejected before body validation pipes run.
@Injectable()
export class RoomRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<RequiredRoomRole | undefined>(
      REQUIRED_ROOM_ROLE,
      context.getHandler(),
    );
    if (!required) return true;

    const claims = roomClaimsFrom(context.switchToHttp().getRequest<Request>());
    if (claims?.role !== required.role) throw new ForbiddenException(required.message);
    return true;
  }
}
