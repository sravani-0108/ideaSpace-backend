import { IsString, IsNotEmpty, IsDateString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { HackathonType } from '../enums/HackathonType';
import { HackathonStatus } from '../enums/HackathonStatus';

export class CreateHackathonDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Purpose is required' })
  @MinLength(10, { message: 'Purpose must be at least 10 characters long' })
  purpose: string;

  @IsString()
  description?: string;

  @IsDateString({}, { message: 'Start date must be a valid date' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid date' })
  endDate: string;

  @IsDateString({}, { message: 'Registration deadline must be a valid date' })
  @IsOptional()
  registrationDeadline?: string;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location: string;

  @IsString()
  onlineLink?: string;

  // Hands-On Hackathon fields
  @IsEnum(HackathonType)
  @IsOptional()
  hackathonType?: HackathonType;

  @IsEnum(HackathonStatus)
  @IsOptional()
  status?: HackathonStatus;

  @IsOptional()
  judgeIds?: string[]; // Array of judge user IDs
}

export class UpdateHackathonDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  title?: string;

  @IsString()
  @MinLength(10, { message: 'Purpose must be at least 10 characters long' })
  purpose?: string;

  @IsString()
  description?: string;

  @IsDateString({}, { message: 'Start date must be a valid date' })
  startDate?: string;

  @IsDateString({}, { message: 'End date must be a valid date' })
  endDate?: string;

  @IsDateString({}, { message: 'Registration deadline must be a valid date' })
  @IsOptional()
  registrationDeadline?: string;

  @IsString()
  location?: string;

  @IsString()
  onlineLink?: string;

  // Hands-On Hackathon fields
  @IsEnum(HackathonType)
  @IsOptional()
  hackathonType?: HackathonType;
}

