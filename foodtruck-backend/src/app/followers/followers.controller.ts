import { Controller, Get, Post, Delete, Param, Request, ForbiddenException } from '@nestjs/common';
import { FollowersService } from './followers.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('followers')
export class FollowersController {
  constructor(
    private readonly followersService: FollowersService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('my')
  async getFollowedTrucks(@Request() req: any) {
    return this.followersService.getFollowedTrucks(req.user.sub);
  }

  @Post('truck/:truckId')
  async followTruck(@Request() req: any, @Param('truckId') truckId: string) {
    const truck = await this.supabase.findById(truckId);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    await this.followersService.followTruck(truckId, req.user.sub);
    return { message: 'Following truck' };
  }

  @Delete('truck/:truckId')
  async unfollowTruck(@Request() req: any, @Param('truckId') truckId: string) {
    const truck = await this.supabase.findById(truckId);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    await this.followersService.unfollowTruck(truckId, req.user.sub);
    return { message: 'Unfollowed truck' };
  }

  @Get('truck/:truckId/status')
  async isFollowing(@Request() req: any, @Param('truckId') truckId: string) {
    const truck = await this.supabase.findById(truckId);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    const isFollowing = await this.followersService.isFollowing(truckId, req.user.sub);
    return { isFollowing };
  }
}
