import { Controller, Get, Post, Delete, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { UserAppsService } from './user-apps.service';

interface AuthReq extends Request {
  user?: { sub?: string; email?: string };
}

@Controller('user-apps')
export class UserAppsController {
  constructor(private readonly userApps: UserAppsService) {}

  /** GET /user-apps → liste des app IDs auxquels l'utilisateur est abonné */
  @Get()
  async list(@Req() req: AuthReq) {
    return { subscribedIds: await this.userApps.getSubscribedIds(req.user?.sub ?? '') };
  }

  /** POST /user-apps/:id → s'abonner à une app */
  @Post(':id')
  async subscribe(@Req() req: AuthReq, @Param('id') appId: string) {
    return { subscribedIds: await this.userApps.subscribe(req.user?.sub ?? '', appId) };
  }

  /** DELETE /user-apps/:id → se désabonner d'une app */
  @Delete(':id')
  async unsubscribe(@Req() req: AuthReq, @Param('id') appId: string) {
    return { subscribedIds: await this.userApps.unsubscribe(req.user?.sub ?? '', appId) };
  }
}
