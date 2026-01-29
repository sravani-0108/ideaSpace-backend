# Teams and Meetings System Explanation

## Overview

The Teams and Meetings system allows users to collaborate during hackathons. Here's how it works:

## Key Concepts

### 1. **Hackathon `onlineLink` (General Link)**
- **What it is**: A general Microsoft Teams link for the entire hackathon
- **Where it's set**: During hackathon creation by admin
- **Where it's displayed**: 
  - In the "Event Details" section of hackathon pages
  - Shows as "Microsoft Teams Link" in hackathon details
- **Purpose**: General link for all participants to join the main hackathon Teams channel

### 2. **Teams**
- **What they are**: Groups of users collaborating together in a hackathon
- **How they're created**: 
  - Any registered user can create a team for a hackathon
  - Teams are created separately from hackathon creation
- **Team Structure**:
  - Has a name and optional description
  - Belongs to a specific hackathon
  - Has members (users who joined the team)
  - Created by a user (team creator)

### 3. **Meetings**
- **What they are**: Scheduled Microsoft Teams meetings for hackathons or teams
- **Two Types**:
  1. **Hackathon-level meetings**: For all registered participants
  2. **Team-level meetings**: For specific teams only
- **Meeting Structure**:
  - Has title, description, scheduled date/time
  - Has its own `meetingLink` (separate from hackathon's `onlineLink`)
  - Can be associated with a hackathon only OR with both hackathon and team
  - Created by a user (meeting creator)

## Where Teams and Meetings Are Displayed

### 1. **Hackathon Details Page** (`/hackathons/:id`)
**Location**: `Ideaspace-frontend/src/pages/user/HackathonDetails.tsx`

**When shown**:
- ✅ User must be **registered** for the hackathon
- ✅ Teams section shows if `teams.length > 0`
- ✅ Meetings section shows if `meetings.length > 0`

**What's displayed**:
- **Teams Section**: Lists all teams for the hackathon with "Join Team" button
- **Meetings Section**: Lists all meetings (hackathon-level and team-level) with "Join Teams" button
- **Calendar**: Shows meetings as events on the calendar

**Code Logic**:
```typescript
// Only loads teams/meetings if user is registered
if (registered) {
  const hackathonTeams = await teamService.getTeamsByHackathon(id!);
  setTeams(hackathonTeams);
  
  const hackathonMeetings = await meetingService.getHackathonMeetings(id!);
  setMeetings(hackathonMeetings);
}
```

### 2. **My Teams Page** (`/dashboard` → Teams tab)
**Location**: `Ideaspace-frontend/src/pages/user/MyTeams.tsx`

**When shown**:
- ✅ User must be logged in
- ✅ Shows teams the user is a member of
- ✅ Shows meetings for those teams

**What's displayed**:
- All teams the user belongs to
- Team members for each team
- Microsoft Teams meetings for each team
- "Join Teams" button for each meeting

**Code Logic**:
```typescript
// Gets user registrations
const userRegistrations = await registrationService.getUserRegistrations();

// Gets teams user is part of (via teamId in registration)
const teamPromises = userRegistrations
  .filter(reg => reg.teamId)
  .map(reg => teamService.getTeamById(reg.teamId!));

// Gets meetings for user's teams
const meetingPromises = userTeams.map(team => 
  meetingService.getTeamMeetings(team.id)
);
```

### 3. **Calendar Component**
**Location**: `Ideaspace-frontend/src/components/Calendar.tsx`

**When shown**:
- Shows meetings as events on the calendar
- Displays green dots for meetings
- Shows hackathon start/end dates

## Scenarios and Workflows

### Scenario 1: Admin Creates Hackathon with `onlineLink`
1. Admin creates hackathon and provides `onlineLink` (e.g., "https://teams.microsoft.com/l/meetup-join/...")
2. This link is stored in `hackathon.onlineLink`
3. **Display**: Shows in "Event Details" → "Microsoft Teams Link" section
4. **Purpose**: General link for all participants

### Scenario 2: User Registers for Hackathon
1. User clicks "Register" on hackathon
2. Registration is created in `hackathon_registrations` table
3. **After registration**:
   - User can see teams section (if teams exist)
   - User can see meetings section (if meetings exist)
   - User can create/join teams
   - User can see calendar with meetings

### Scenario 3: User Creates a Team
1. User must be registered for hackathon first
2. User creates team via API: `POST /hackathons/:hackathonId/teams`
3. Team is created and user is automatically assigned to it
4. **Display**: Team appears in:
   - Hackathon Details page (for all registered users)
   - My Teams page (for team members)

### Scenario 4: User Joins a Team
1. User clicks "Join Team" on hackathon details page
2. API call: `POST /teams/:teamId/members`
3. User's registration is updated with `teamId`
4. **Display**: Team now appears in user's "My Teams" page

### Scenario 5: Admin/User Creates a Meeting
1. Meeting can be created for:
   - **Hackathon-level**: `POST /hackathons/:hackathonId/meetings` (no teamId)
   - **Team-level**: `POST /hackathons/:hackathonId/meetings` (with teamId)
2. Meeting includes:
   - Title, description, scheduled date/time
   - `meetingLink` (separate from hackathon's `onlineLink`)
3. **Display**: Meeting appears in:
   - Hackathon Details page (if user is registered)
   - My Teams page (if user is team member)
   - Calendar component (as green dot)

## Key Differences

| Feature | Hackathon `onlineLink` | Meeting `meetingLink` |
|---------|----------------------|---------------------|
| **Set during** | Hackathon creation | Meeting creation |
| **Scope** | Entire hackathon | Specific meeting |
| **Display** | Event Details section | Meetings section |
| **Purpose** | General Teams channel | Scheduled meeting |

## Database Structure

### Teams Table
- `id`: UUID
- `name`: Team name
- `description`: Optional team description
- `hackathonId`: Links to hackathon
- `createdBy`: User who created the team

### Meetings Table
- `id`: UUID
- `title`: Meeting title
- `description`: Optional meeting description
- `scheduledDate`: When meeting is scheduled
- `meetingLink`: Microsoft Teams link for this meeting
- `hackathonId`: Links to hackathon (required)
- `teamId`: Links to team (optional - if null, it's hackathon-level)
- `createdBy`: User who created the meeting

### Hackathon Registrations Table
- `id`: UUID
- `hackathonId`: Links to hackathon
- `userId`: Links to user
- `teamId`: Links to team (nullable - user can be registered but not in a team)

## API Endpoints

### Teams
- `POST /hackathons/:hackathonId/teams` - Create team
- `GET /hackathons/:hackathonId/teams` - Get teams for hackathon
- `POST /teams/:teamId/members` - Join team
- `GET /teams/:teamId/members` - Get team members

### Meetings
- `POST /hackathons/:hackathonId/meetings` - Create meeting
- `GET /hackathons/:hackathonId/meetings` - Get hackathon meetings
- `GET /teams/:teamId/meetings` - Get team meetings
- `GET /meetings/my-meetings` - Get user's meetings

## When Data is Saved to Database

### Team Table - When Data is Saved

**Team data is saved when:**

1. **User Creates a Team** (via API call)
   - **API Endpoint**: `POST /hackathons/:hackathonId/teams`
   - **Required**: User must be registered for the hackathon first
   - **Request Body**: 
     ```json
     {
       "name": "Team Name",
       "description": "Optional description"
     }
     ```
   - **What Happens**:
     - ✅ New row inserted into `teams` table with:
       - `id` (UUID, auto-generated)
       - `name` (from request)
       - `description` (from request, nullable)
       - `hackathonId` (from URL params)
       - `createdBy` (current user's ID)
       - `createdAt` (current timestamp)
       - `updatedAt` (current timestamp)
     - ✅ User's registration (`hackathon_registrations`) is updated:
       - `teamId` field is set to the newly created team's ID
       - User is automatically assigned to the team they created

2. **User Joins a Team** (via API call)
   - **API Endpoint**: `POST /teams/:teamId/members`
   - **Request Body**:
     ```json
     {
       "userId": "user-uuid",
       "hackathonId": "hackathon-uuid"
     }
     ```
   - **What Happens**:
     - ✅ User's registration (`hackathon_registrations`) is updated:
       - `teamId` field is set to the team's ID
     - ❌ **NO new row** is inserted into `teams` table (team already exists)

**Team Table Structure:**
```sql
teams table:
- id (UUID, PRIMARY KEY)
- name (VARCHAR)
- description (TEXT, nullable)
- hackathonId (UUID, FOREIGN KEY → hackathons.id)
- createdBy (UUID, FOREIGN KEY → users.id)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

### Meeting Table - When Data is Saved

**Meeting data is saved when:**

1. **User/Admin Creates a Meeting** (via API call)
   - **API Endpoint**: `POST /hackathons/:hackathonId/meetings`
   - **Request Body**:
     ```json
     {
       "title": "Meeting Title",
       "description": "Optional description",
       "scheduledDate": "2026-01-30T10:00:00Z",
       "meetingLink": "https://teams.microsoft.com/l/meetup-join/...",
       "teamId": "team-uuid" // Optional - if provided, it's a team meeting
     }
     ```
   - **What Happens**:
     - ✅ New row inserted into `meetings` table with:
       - `id` (UUID, auto-generated)
       - `title` (from request)
       - `description` (from request, nullable)
       - `scheduledDate` (from request, converted to Date)
       - `meetingLink` (from request, nullable)
       - `hackathonId` (from URL params, REQUIRED)
       - `teamId` (from request, nullable - if null, it's hackathon-level)
       - `createdBy` (current user's ID)
       - `createdAt` (current timestamp)
       - `updatedAt` (current timestamp)

**Meeting Table Structure:**
```sql
meetings table:
- id (UUID, PRIMARY KEY)
- title (VARCHAR)
- description (TEXT, nullable)
- scheduledDate (TIMESTAMP)
- meetingLink (VARCHAR, nullable)
- hackathonId (UUID, FOREIGN KEY → hackathons.id, REQUIRED)
- teamId (UUID, FOREIGN KEY → teams.id, nullable)
- createdBy (UUID, FOREIGN KEY → users.id)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

## Important Notes

### Teams
- ❌ **NOT saved during hackathon creation** - Teams are created separately
- ✅ **Saved when**: User calls `POST /hackathons/:hackathonId/teams` API
- ✅ **Prerequisite**: User must be registered for the hackathon first
- ✅ **Automatic assignment**: Team creator is automatically assigned to the team

### Meetings
- ❌ **NOT saved during hackathon creation** - Meetings are created separately
- ✅ **Saved when**: User/Admin calls `POST /hackathons/:hackathonId/meetings` API
- ✅ **Can be**: Hackathon-level (teamId = null) OR Team-level (teamId = specific team)
- ✅ **Each meeting** has its own `meetingLink` (separate from hackathon's `onlineLink`)

### Hackathon `onlineLink`
- ✅ **Saved during hackathon creation** - Stored in `hackathons.onlineLink`
- ✅ **Displayed in**: Event Details section
- ❌ **NOT used for meetings** - Each meeting needs its own `meetingLink`

## Current Status

**⚠️ IMPORTANT**: Currently, there are **NO UI forms** to create teams or meetings in the frontend. They can only be created via:
- Direct API calls (using Postman, curl, etc.)
- Backend scripts
- Future UI implementation

**To create teams/meetings via API:**

**Create Team:**
```bash
POST http://localhost:5000/api/hackathons/{hackathonId}/teams
Headers: Authorization: Bearer {token}
Body: {
  "name": "Team Alpha",
  "description": "Our awesome team"
}
```

**Create Meeting:**
```bash
POST http://localhost:5000/api/hackathons/{hackathonId}/meetings
Headers: Authorization: Bearer {token}
Body: {
  "title": "Team Standup",
  "description": "Daily standup meeting",
  "scheduledDate": "2026-01-30T10:00:00Z",
  "meetingLink": "https://teams.microsoft.com/l/meetup-join/...",
  "teamId": "team-uuid" // Optional
}
```

## Summary

**To see Teams and Meetings:**
1. User must be **registered** for the hackathon
2. Teams are created separately (not during hackathon creation)
3. Meetings are created separately (not during hackathon creation)
4. The hackathon's `onlineLink` is just a general link, separate from meeting links

**The `onlineLink` provided during hackathon creation:**
- Is displayed in Event Details
- Is a general Teams link for the hackathon
- Is NOT automatically used for meetings
- Each meeting has its own `meetingLink` that must be set when creating the meeting

**Data Flow:**
1. Admin creates hackathon → `hackathons` table (includes `onlineLink`)
2. User registers → `hackathon_registrations` table
3. User creates team → `teams` table + updates `hackathon_registrations.teamId`
4. User creates meeting → `meetings` table

