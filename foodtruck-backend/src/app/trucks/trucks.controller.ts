import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { Public } from '../auth/public.decorator';
import { DbTruck } from '../supabase/supabase.service';

@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Get()
  async getMyTruck(@Request() req: any) {
    // If authenticated, return user's first truck (one truck per user)
    const trucks = await this.trucksService.findByOwner(req.user.sub);
    return trucks[0] || null;
  }

  @Get('public/all')
  @Public()
  async getAllTrucks() {
    return this.trucksService.findAll();
  }

  @Get('public/open')
  @Public()
  async getOpenTrucks() {
    return this.trucksService.findAllOpen();
  }

  @Get(':id')
  @Public()
  async getTruckById(@Param('id') id: string) {
    return this.trucksService.findById(id);
  }

  @Post()
  async createTruck(@Request() req: any, @Body() body: Partial<DbTruck>) {
    if (req.user.role !== 'manager') {
      throw new ForbiddenException('Only managers can create trucks');
    }
    return this.trucksService.createTruck(req.user.sub, body);
  }

  @Patch(':id')
  async updateTruck(@Request() req: any, @Param('id') id: string, @Body() body: Partial<DbTruck>) {
    const truck = await this.trucksService.findById(id);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    if (truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can update truck');
    }
    // Strip location fields — they belong to the locations table, not trucks
    const { address, latitude, longitude, ...truckBody } = body as any;
    void address; void latitude; void longitude;
    await this.trucksService.updateTruck(id, truckBody);
    return this.trucksService.findById(id);
  }

  @Patch(':id/toggle-open')
  async toggleOpen(@Request() req: any, @Param('id') id: string, @Body() body: { isOpen?: boolean }) {
    const truck = await this.trucksService.findById(id);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    if (truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can toggle open status');
    }
    // Use the provided value if present, otherwise flip the current state
    const newState = body.isOpen !== undefined ? body.isOpen : !truck.isOpen;
    await this.trucksService.toggleOpen(id, newState);
    return this.trucksService.findById(id);
  }
}
