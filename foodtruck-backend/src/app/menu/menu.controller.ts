import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { Public } from '../auth/public.decorator';
import { DbMenuCategory, DbMenuItem, SupabaseService } from '../supabase/supabase.service';

@Controller('menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('truck/:truckId')
  @Public()
  async getMenu(@Param('truckId') truckId: string) {
    return this.menuService.getMenuWithCategories(truckId);
  }

  @Post('truck/:truckId/categories')
  async createCategory(
    @Request() req: any,
    @Param('truckId') truckId: string,
    @Body() body: { name: string; position?: number },
  ) {
    const truck = await this.supabase.findById(truckId);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    if (truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can manage menu');
    }
    return this.menuService.createCategory(truckId, body.name, body.position);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<DbMenuCategory>,
  ) {
    const category = await this.supabase.getMenuCategoryById(id);
    if (!category) {
      throw new ForbiddenException('Category not found');
    }
    const truck = await this.supabase.findById(category.truck_id);
    if (!truck || truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can update category');
    }
    await this.menuService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  async deleteCategory(@Request() req: any, @Param('id') id: string) {
    const category = await this.supabase.getMenuCategoryById(id);
    if (!category) {
      throw new ForbiddenException('Category not found');
    }
    const truck = await this.supabase.findById(category.truck_id);
    if (!truck || truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can delete category');
    }
    await this.menuService.deleteCategory(id);
  }

  @Post('truck/:truckId/items')
  async createItem(
    @Request() req: any,
    @Param('truckId') truckId: string,
    @Body() body: Partial<DbMenuItem>,
  ) {
    const truck = await this.supabase.findById(truckId);
    if (!truck) {
      throw new ForbiddenException('Truck not found');
    }
    if (truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can manage menu');
    }
    // Map camelCase → snake_case
    const mappedBody = {
      ...body,
      category_id: (body as any).categoryId ?? (body as any).category_id,
      image_url: (body as any).imageUrl ?? (body as any).image_url,
    };
    // Remove camelCase versions
    delete (mappedBody as any).categoryId;
    delete (mappedBody as any).imageUrl;

    return this.menuService.createMenuItem({ truck_id: truckId, ...mappedBody });
  }

  @Patch('items/:id')
  async updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<DbMenuItem>,
  ) {
    const item = await this.supabase.getMenuItemById(id);
    if (!item) {
      throw new ForbiddenException('Menu item not found');
    }
    const truck = await this.supabase.findById(item.truck_id);
    if (!truck || truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can update item');
    }
    // Map camelCase → snake_case
    const mappedBody = {
      ...body,
      category_id: (body as any).categoryId ?? (body as any).category_id,
      image_url: (body as any).imageUrl ?? (body as any).image_url,
    };
    // Remove camelCase versions
    delete (mappedBody as any).categoryId;
    delete (mappedBody as any).imageUrl;

    await this.menuService.updateMenuItem(id, mappedBody);
  }

  @Delete('items/:id')
  async deleteItem(@Request() req: any, @Param('id') id: string) {
    const item = await this.supabase.getMenuItemById(id);
    if (!item) {
      throw new ForbiddenException('Menu item not found');
    }
    const truck = await this.supabase.findById(item.truck_id);
    if (!truck || truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can delete item');
    }
    await this.menuService.deleteMenuItem(id);
  }
}
