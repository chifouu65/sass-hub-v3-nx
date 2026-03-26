import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global() // Disponible dans tous les modules sans réimporter
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
