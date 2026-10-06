import { Controller, Get, Query } from '@nestjs/common';
import { GetMaterialsQueryDto } from './dto/get-materials-query.dto';
import { MaterialsService } from './materials.service';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  async getMaterials(@Query() query: GetMaterialsQueryDto) {
    return this.materialsService.getMaterials(query);
  }
}
