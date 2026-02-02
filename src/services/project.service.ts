import { AppDataSource } from '../config/database';
import { Project } from '../entities/Project';
import { Idea } from '../entities/Idea';
import { ProjectStatus } from '../enums/ProjectStatus';
import { IdeaStatus } from '../enums/IdeaStatus';
import { HackathonType } from '../enums/HackathonType';
import { SubmitProjectDto, ReviewProjectDto } from '../dto/project.dto';

export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  private ideaRepository = AppDataSource.getRepository(Idea);

  async submitProject(ideaId: string, userId: string, submitDto: SubmitProjectDto): Promise<Project> {
    // Check if idea exists and is approved
    const idea = await this.ideaRepository.findOne({
      where: { id: ideaId },
      relations: ['user', 'hackathon'],
    });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.userId !== userId) {
      throw new Error('You can only submit projects for your own ideas');
    }

    // For Hands-On hackathons, allow submission if idea is in ENHANCEMENTS or IMPLEMENTATION phase
    // For regular ideas, only allow if APPROVED
    const isHandsOnHackathon = idea.hackathonId && idea.hackathon?.hackathonType === HackathonType.HANDS_ON;
    
    if (isHandsOnHackathon) {
      // For Hands-On hackathons, allow submission only in ENHANCEMENTS or IMPLEMENTATION phases
      const canSubmitForHandsOn = idea.status === IdeaStatus.ENHANCEMENTS || idea.status === IdeaStatus.IMPLEMENTATION;
      if (!canSubmitForHandsOn) {
        throw new Error('Project can only be submitted during Enhancements or Implementation phase');
      }
      
      // Check if statusDeadline has passed
      if (idea.statusDeadline) {
        const now = new Date();
        if (now > new Date(idea.statusDeadline)) {
          throw new Error('The deadline for submitting this project has passed');
        }
      }
    } else {
      // For regular ideas, only allow if APPROVED
      if (idea.status !== IdeaStatus.APPROVED) {
        throw new Error('Project can only be submitted for approved ideas');
      }
    }

    // Check if project already exists
    let project = await this.projectRepository.findOne({
      where: { ideaId, userId },
    });

    const submittedAt = new Date();
    const isLate = idea.projectDeadline && submittedAt > new Date(idea.projectDeadline);

    if (project) {
      // Update existing project
      project.githubUrl = submitDto.githubUrl || project.githubUrl;
      project.demoVideoUrl = submitDto.demoVideoUrl || project.demoVideoUrl;
      project.documentationUrl = submitDto.documentationUrl || project.documentationUrl;
      project.projectDescription = submitDto.projectDescription || project.projectDescription;
      project.implementationDetails = submitDto.implementationDetails || project.implementationDetails;
      project.pitchVideoUrl = submitDto.pitchVideoUrl || project.pitchVideoUrl;
      project.presentationUrl = submitDto.presentationUrl || project.presentationUrl;
      project.submittedAt = submittedAt;
      project.status = isLate ? ProjectStatus.LATE : ProjectStatus.SUBMITTED;
    } else {
      // Create new project
      project = this.projectRepository.create({
        ideaId,
        userId,
        ...submitDto,
        submittedAt,
        status: isLate ? ProjectStatus.LATE : ProjectStatus.SUBMITTED,
      });
    }

    return await this.projectRepository.save(project);
  }

  async reviewProject(projectId: string, reviewerId: string, reviewDto: ReviewProjectDto): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['idea', 'user'],
    });

    if (!project) {
      throw new Error('Project not found');
    }

    project.status = reviewDto.status;
    project.judgeFeedback = reviewDto.judgeFeedback;
    project.reviewedBy = reviewerId;
    project.reviewedAt = new Date();

    return await this.projectRepository.save(project);
  }

  async getProjectByIdeaId(ideaId: string, userId: string): Promise<Project | null> {
    return await this.projectRepository.findOne({
      where: { ideaId, userId },
      relations: ['idea', 'user', 'reviewer'],
    });
  }

  async getProjectsByHackathon(hackathonId: string): Promise<Project[]> {
    return await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.idea', 'idea')
      .leftJoinAndSelect('project.user', 'user')
      .leftJoinAndSelect('project.reviewer', 'reviewer')
      .where('idea.hackathonId = :hackathonId', { hackathonId })
      .getMany();
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.projectRepository.find({
      relations: ['idea', 'user', 'reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    return await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['idea', 'idea.hackathon', 'user', 'reviewer'],
    });
  }

  async getProjectsNeedingReview(): Promise<Project[]> {
    // Get all projects that are submitted, late, or under review
    // and belong to Hands-On hackathons
    return await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.idea', 'idea')
      .leftJoinAndSelect('idea.hackathon', 'hackathon')
      .leftJoinAndSelect('project.user', 'user')
      .leftJoinAndSelect('project.reviewer', 'reviewer')
      .where('project.status IN (:...statuses)', {
        statuses: [ProjectStatus.SUBMITTED, ProjectStatus.LATE, ProjectStatus.UNDER_REVIEW]
      })
      .andWhere('hackathon.hackathonType = :hackathonType', {
        hackathonType: HackathonType.HANDS_ON
      })
      .orderBy('project.submittedAt', 'DESC')
      .getMany();
  }
}

