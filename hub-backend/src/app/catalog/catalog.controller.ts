import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Public } from '../auth/public.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  list() {
    return this.catalog.list();
  }
}
