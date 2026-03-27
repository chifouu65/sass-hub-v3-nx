import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HubProxyMiddleware } from './proxy/hub-proxy.middleware';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthGuard } from './auth/auth.guard';
import { TrucksModule } from './trucks/trucks.module';
import { LocationsModule } from './locations/locations.module';
import { SchedulesModule } from './schedules/schedules.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { FollowersModule } from './followers/followers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadModule } from './upload/upload.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    SupabaseModule,
    TrucksModule,
    LocationsModule,
    SchedulesModule,
    MenuModule,
    OrdersModule,
    FollowersModule,
    NotificationsModule,
    UploadModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Proxifie /hub-api/* vers le hub-backend (auth OAuth)
    consumer
      .apply(HubProxyMiddleware)
      .forRoutes({ path: '/hub-api/*path', method: RequestMethod.ALL });
  }
}
