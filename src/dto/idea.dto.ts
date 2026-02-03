import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsUUID, IsDateString, IsUrl } from 'class-validator';

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

  // File uploads for Hands-On hackathon ideas
  @IsUrl({}, { message: 'Git repository URL must be a valid URL' })
  @IsOptional()
  gitRepositoryUrl?: string;

  @IsString()
  @IsOptional()
  documentationUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  zipFilePath?: string;
}

export class ApproveIdeaDto {
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsDateString({}, { message: 'Project deadline must be a valid date' })
  @IsOptional()
  projectDeadline?: string;

  @IsDateString({}, { message: 'Status deadline must be a valid date' })
  @IsOptional()
  statusDeadline?: string;
}

export class UpdateProjectDetailsDto {
  @IsUrl({}, { message: 'GitHub URL must be a valid URL' })
  @IsOptional()
  githubUrl?: string;

  @IsString()
  @IsOptional()
  demoVideoUrl?: string;

  @IsString()
  @IsOptional()
  documentationUrl?: string;

  @IsString()
  @IsOptional()
  zipFilePath?: string;

  @IsString()
  @IsOptional()
  projectDescription?: string;

  @IsString()
  @IsOptional()
  implementationDetails?: string;

  @IsString()
  @IsOptional()
  pitchVideoUrl?: string;

  @IsString()
  @IsOptional()
  presentationUrl?: string;
}

