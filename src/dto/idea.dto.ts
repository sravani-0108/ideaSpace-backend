import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateIdeaDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description: string;

  // For Hands-On Hackathon ideas
  @IsUUID()
  @IsOptional()
  hackathonId?: string;
}

export class ApproveIdeaDto {
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsDateString({}, { message: 'Project deadline must be a valid date' })
  @IsOptional()
  projectDeadline?: string;
}

