import { Module } from '@nestjs/common';
import { UserAppsController } from './user-apps.controller';
import { UserAppsService } from './user-apps.service';

@Module({
  controllers: [UserAppsController],
  providers: [UserAppsService],
})
export class UserAppsModule {}
