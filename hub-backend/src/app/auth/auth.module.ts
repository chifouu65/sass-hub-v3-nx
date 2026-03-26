import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OAuthService } from './oauth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class AuthModule {}
