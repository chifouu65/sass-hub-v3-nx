import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { BillingModule } from './billing/billing.module';
import { UserAppsModule } from './user-apps/user-apps.module';
import { SupabaseModule } from './supabase/supabase.module';
import { OAuthController } from './oauth.controller';
import { GoogleOAuthService } from './auth/google-oauth.service';

@Module({
  imports: [JwtModule.register({}), SupabaseModule, AuthModule, CatalogModule, BillingModule, UserAppsModule],
  controllers: [AppController, OAuthController],
  providers: [AppService, GoogleOAuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
