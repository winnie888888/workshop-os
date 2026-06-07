import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateFleetDto {
  @IsString() @Length(1, 36)
  customerId!: string;

  @IsString() @Length(1, 200)
  name!: string;

  @IsOptional() @IsString()
  costCenter?: string;

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateFleetDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsString() costCenter?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}
