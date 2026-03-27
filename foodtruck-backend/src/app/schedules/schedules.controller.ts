import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { Public } from '../auth/public.decorator';
import { DbSchedule, SupabaseService } from '../supabase/supabase.service';

@Controller('schedules')
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('truck/:truckId')
  @Public()
  async getSchedules(@Param('truckId') truckId: string) {
    return this.schedulesService.getSchedules(truckId);
  }

  @Post('truck/:truckId')
  async upsertSchedule(
    @Request() req: any,
    @Param('truckId') truckId: string,
    @Body() body: Partial<DbSchedule>,
  ) {
    const truck = await this.supabase.findById(truckId);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    if (truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can manage schedules');
    }
    return this.schedulesService.upsertSchedule(truckId, body);
  }

  @Delete(':id')
  async deleteSchedule(@Request() req: any, @Param('id') id: string) {
    const schedule = await this.supabase.getScheduleById(id);
    if (!schedule) {
      throw new ForbiddenException('Schedule not found');
    }
    const truck = await this.supabase.findById(schedule.truck_id);
    if (!truck || truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can delete schedule');
    }
    await this.schedulesService.deleteSchedule(id);
  }
}
