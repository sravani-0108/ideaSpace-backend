import { IsString, IsOptional, MinLength, IsNotEmpty } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'First name cannot be empty' })
  @MinLength(1, { message: 'First name cannot be empty' })
  firstName?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Last name cannot be empty' })
  @MinLength(1, { message: 'Last name cannot be empty' })
  lastName?: string;
}

