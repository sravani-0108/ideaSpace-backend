export enum IdeaStatus {
  PENDING = 'PENDING',      // Initial status - waiting for admin approval
  APPROVED = 'APPROVED',     // Approved by admin, but not yet published
  PUBLISHED = 'PUBLISHED',   // Published and visible in feed
  REJECTED = 'REJECTED',     // Rejected by admin
  // Hands-On Hackathon specific statuses
  UNDER_REVIEW = 'UNDER_REVIEW',
  PITCHING = 'PITCHING',
  ENHANCEMENTS = 'ENHANCEMENTS',
  IMPLEMENTATION = 'IMPLEMENTATION',
  COMPLETED = 'COMPLETED'
}

