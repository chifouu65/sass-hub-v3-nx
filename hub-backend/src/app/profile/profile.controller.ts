import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string; email?: string; [key: string]: unknown };
}

interface UpdateProfileDto {
  name?: string;
  avatarUrl?: string;
  phone?: string;
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly supabase: SupabaseService) {}

  /** GET /api/profile — retourne le profil complet de l'utilisateur connecté */
  @Get()
  async getProfile(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub ?? '';
    const user = await this.supabase.findUserById(userId);
    if (!user) return { error: 'user_not_found' };
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? null,
      avatarUrl: user.avatar_url ?? null,
      phone: user.phone ?? null,
      provider: user.provider,
      createdAt: user.created_at,
    };
  }

  /** PATCH /api/profile — met à jour name, avatarUrl, phone */
  @Patch()
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    const userId = req.user?.sub ?? '';
    const updated = await this.supabase.updateUserProfile(userId, {
      name: body.name,
      avatar_url: body.avatarUrl,
      phone: body.phone,
    });
    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      name: updated.name ?? null,
      avatarUrl: updated.avatar_url ?? null,
      phone: updated.phone ?? null,
      provider: updated.provider,
      updatedAt: updated.updated_at,
    };
  }
}
