import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
