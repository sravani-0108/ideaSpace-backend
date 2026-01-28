import { Response } from 'express';
import { TeamService } from '../services/team.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';

const teamService = new TeamService();

export class TeamController {
  async createTeam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const { name, description } = req.body;

      if (!name) {
        throw new Error('Team name is required');
      }

      const team = await teamService.createTeam(hackathonId, req.userId!, name, description);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Team created successfully',
        data: team,
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to create team',
      };
      res.status(400).json(response);
    }
  }

  async getTeamsByHackathon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const teams = await teamService.getTeamsByHackathon(hackathonId);

      const response: ApiResponse<any> = {
        success: true,
        data: teams,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch teams',
      };
      res.status(400).json(response);
    }
  }

  async getTeamById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const team = await teamService.getTeamById(id);

      const response: ApiResponse<any> = {
        success: true,
        data: team,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch team',
      };
      res.status(400).json(response);
    }
  }

  async getTeamMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const members = await teamService.getTeamMembers(id);

      // Remove password from user objects
      const membersWithoutPassword = members.map((member) => {
        if (member.user && 'password' in member.user) {
          const { password, ...userWithoutPassword } = member.user as any;
          return { ...member, user: userWithoutPassword };
        }
        return member;
      });

      const response: ApiResponse<any> = {
        success: true,
        data: membersWithoutPassword,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch team members',
      };
      res.status(400).json(response);
    }
  }

  async addMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, hackathonId } = req.body;

      if (!userId || !hackathonId) {
        throw new Error('userId and hackathonId are required');
      }

      await teamService.addMemberToTeam(id, userId, hackathonId);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Member added to team successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to add member to team',
      };
      res.status(400).json(response);
    }
  }

  async removeMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;
      await teamService.removeMemberFromTeam(id, userId);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Member removed from team successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to remove member from team',
      };
      res.status(400).json(response);
    }
  }

  async updateTeam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const team = await teamService.updateTeam(id, req.userId!, name, description);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Team updated successfully',
        data: team,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to update team',
      };
      res.status(400).json(response);
    }
  }

  async deleteTeam(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await teamService.deleteTeam(id, req.userId!);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Team deleted successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to delete team',
      };
      res.status(400).json(response);
    }
  }
}

