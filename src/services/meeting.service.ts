import { AppDataSource } from '../config/database';
import { Meeting } from '../entities/Meeting';
import { Team } from '../entities/Team';
import { HackathonRegistration } from '../entities/HackathonRegistration';

export class MeetingService {
  private meetingRepository = AppDataSource.getRepository(Meeting);
  private teamRepository = AppDataSource.getRepository(Team);
  private registrationRepository = AppDataSource.getRepository(HackathonRegistration);

  async createMeeting(
    hackathonId: string,
    createdBy: string,
    title: string,
    description: string,
    scheduledDate: Date,
    meetingLink?: string,
    teamId?: string
  ): Promise<Meeting> {
    if (teamId) {
      const team = await this.teamRepository.findOne({ where: { id: teamId } });
      if (!team) {
        throw new Error('Team not found');
      }
    }

    const meeting = this.meetingRepository.create({
      hackathonId,
      createdBy,
      title,
      description: description || undefined,
      scheduledDate,
      meetingLink: meetingLink || undefined,
      teamId: teamId || undefined,
    });

    const savedMeeting = await this.meetingRepository.save(meeting);
    return await this.meetingRepository.findOne({
      where: { id: savedMeeting.id },
      relations: ['creator', 'hackathon', 'team'],
    }) as Meeting;
  }

  async getMeetingsByHackathon(hackathonId: string): Promise<Meeting[]> {
    return await this.meetingRepository.find({
      where: { hackathonId },
      relations: ['creator', 'hackathon', 'team'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async getMeetingsByTeam(teamId: string): Promise<Meeting[]> {
    return await this.meetingRepository.find({
      where: { teamId },
      relations: ['creator', 'hackathon', 'team'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async getUserMeetings(userId: string): Promise<Meeting[]> {
    // Get all hackathons user is registered for
    const registrations = await this.registrationRepository.find({
      where: { userId },
      relations: ['hackathon'],
    });

    const hackathonIds = registrations.map(r => r.hackathonId);
    const teamIds = registrations.filter(r => r.teamId).map(r => r.teamId!);

    // Get meetings for hackathons user is registered for
    const hackathonMeetings = hackathonIds.length > 0
      ? await this.meetingRepository.find({
          where: hackathonIds.map(id => ({ hackathonId: id, teamId: null as any })),
          relations: ['creator', 'hackathon', 'team'],
        })
      : [];

    // Get meetings for teams user is part of
    const teamMeetings = teamIds.length > 0
      ? await this.meetingRepository.find({
          where: teamIds.map(id => ({ teamId: id })),
          relations: ['creator', 'hackathon', 'team'],
        })
      : [];

    // Combine and deduplicate
    const allMeetings = [...hackathonMeetings, ...teamMeetings];
    const uniqueMeetings = Array.from(
      new Map(allMeetings.map(m => [m.id, m])).values()
    );

    return uniqueMeetings.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }

  async updateMeeting(
    id: string,
    userId: string,
    title?: string,
    description?: string,
    scheduledDate?: Date,
    meetingLink?: string
  ): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id, createdBy: userId },
    });

    if (!meeting) {
      throw new Error('Meeting not found or you do not have permission to update it');
    }

    if (title) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (scheduledDate) meeting.scheduledDate = scheduledDate;
    if (meetingLink !== undefined) meeting.meetingLink = meetingLink;

    await this.meetingRepository.save(meeting);
    return await this.meetingRepository.findOne({
      where: { id },
      relations: ['creator', 'hackathon', 'team'],
    }) as Meeting;
  }

  async deleteMeeting(id: string, userId: string): Promise<void> {
    const meeting = await this.meetingRepository.findOne({
      where: { id, createdBy: userId },
    });

    if (!meeting) {
      throw new Error('Meeting not found or you do not have permission to delete it');
    }

    await this.meetingRepository.remove(meeting);
  }
}

