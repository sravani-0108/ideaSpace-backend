import { AppDataSource } from '../config/database';
import { Team } from '../entities/Team';
import { HackathonRegistration } from '../entities/HackathonRegistration';

export class TeamService {
  private teamRepository = AppDataSource.getRepository(Team);
  private registrationRepository = AppDataSource.getRepository(HackathonRegistration);

  async createTeam(
    hackathonId: string,
    createdBy: string,
    name: string,
    description?: string
  ): Promise<Team> {
    // Check if user is registered for the hackathon
    const registration = await this.registrationRepository.findOne({
      where: { hackathonId, userId: createdBy },
    });

    if (!registration) {
      throw new Error('You must be registered for the hackathon to create a team');
    }

    const team = this.teamRepository.create({
      hackathonId,
      createdBy,
      name,
      description: description || undefined,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Assign creator to team
    registration.teamId = savedTeam.id;
    await this.registrationRepository.save(registration);

    return savedTeam;
  }

  async getTeamsByHackathon(hackathonId: string): Promise<Team[]> {
    return await this.teamRepository.find({
      where: { hackathonId },
      relations: ['creator', 'hackathon'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTeamById(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['creator', 'hackathon'],
    });

    if (!team) {
      throw new Error('Team not found');
    }

    return team;
  }

  async getTeamMembers(teamId: string): Promise<HackathonRegistration[]> {
    return await this.registrationRepository.find({
      where: { teamId },
      relations: ['user'],
    });
  }

  async addMemberToTeam(teamId: string, userId: string, hackathonId: string): Promise<void> {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });

    if (!team) {
      throw new Error('Team not found');
    }

    if (team.hackathonId !== hackathonId) {
      throw new Error('Team does not belong to this hackathon');
    }

    const registration = await this.registrationRepository.findOne({
      where: { hackathonId, userId },
    });

    if (!registration) {
      throw new Error('User is not registered for this hackathon');
    }

    if (registration.teamId) {
      throw new Error('User is already in a team');
    }

    registration.teamId = teamId;
    await this.registrationRepository.save(registration);
  }

  async removeMemberFromTeam(teamId: string, userId: string): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { teamId, userId },
    });

    if (!registration) {
      throw new Error('User is not a member of this team');
    }

    registration.teamId = undefined;
    await this.registrationRepository.save(registration);
  }

  async updateTeam(id: string, userId: string, name?: string, description?: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id, createdBy: userId },
    });

    if (!team) {
      throw new Error('Team not found or you do not have permission to update it');
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;

    return await this.teamRepository.save(team);
  }

  async deleteTeam(id: string, userId: string): Promise<void> {
    const team = await this.teamRepository.findOne({
      where: { id, createdBy: userId },
    });

    if (!team) {
      throw new Error('Team not found or you do not have permission to delete it');
    }

    // Remove team assignment from all members
    await this.registrationRepository.update(
      { teamId: id },
      { teamId: undefined as any }
    );

    await this.teamRepository.remove(team);
  }
}

