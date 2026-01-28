import { IsString, IsNotEmpty, MinLength, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MinLength(1, { message: 'Comment cannot be empty' })
  content: string;

  @IsOptional()
  @IsUUID(4, { message: 'Parent comment ID must be a valid UUID' })
  parentId?: string; // Optional: if provided, this is a reply to another comment
}

