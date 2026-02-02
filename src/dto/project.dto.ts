import { IsString, IsOptional, IsUrl, IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectStatus } from '../enums/ProjectStatus';

export class SubmitProjectDto {
  @IsUrl({}, { message: 'GitHub URL must be a valid URL' })
  @IsOptional()
  githubUrl?: string;

  @IsUrl({}, { message: 'Demo video URL must be a valid URL' })
  @IsOptional()
  demoVideoUrl?: string;

  @IsUrl({}, { message: 'Documentation URL must be a valid URL' })
  @IsOptional()
  documentationUrl?: string;

  @IsString()
  @IsOptional()
  projectDescription?: string;

  @IsString()
  @IsOptional()
  implementationDetails?: string;

  @IsUrl({}, { message: 'Pitch video URL must be a valid URL' })
  @IsOptional()
  pitchVideoUrl?: string;

  @IsUrl({}, { message: 'Presentation URL must be a valid URL' })
  @IsOptional()
  presentationUrl?: string;
}

export class ReviewProjectDto {
  @IsEnum(ProjectStatus)
  @IsNotEmpty({ message: 'Status is required' })
  status: ProjectStatus;

  @IsString()
  @IsOptional()
  judgeFeedback?: string;
}

