import { Controller, Get, Post, Param, Body, Request, ForbiddenException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Public } from '../auth/public.decorator';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('locations')
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('truck/:truckId')
  @Public()
  async getLocation(@Param('truckId') truckId: string) {
    return this.locationsService.getLocation(truckId);
  }

  @Post('truck/:truckId')
  async upsertLocation(
    @Request() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { latitude: number; longitude: number; address?: string },
  ) {
    const truck = await this.supabase.findById(truckId);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    if (truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can update location');
    }
    return this.locationsService.upsertLocation(truckId, body.latitude, body.longitude, body.address);
  }
}
