export enum ProjectStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',   // Idea approved but project not yet submitted
  SUBMITTED = 'SUBMITTED',           // Project submitted on time
  LATE = 'LATE',                     // Project submitted after deadline
  UNDER_REVIEW = 'UNDER_REVIEW',     // Project under review by judges
  COMPLETED = 'COMPLETED',           // Project completed and approved
  NEEDS_CHANGES = 'NEEDS_CHANGES',   // Project needs changes
  DISQUALIFIED = 'DISQUALIFIED'      // Project disqualified
}

