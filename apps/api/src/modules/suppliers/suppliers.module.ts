import { Module } from '@nestjs/common';
import { SuppliersController, ItemSuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';

@Module({
  controllers: [SuppliersController, ItemSuppliersController],
  providers: [SuppliersService, SuppliersRepository],
  exports: [SuppliersService, SuppliersRepository],
})
export class SuppliersModule {}
