export enum IdeaStatus {
  PENDING = 'PENDING',      // Initial status - waiting for admin approval
  APPROVED = 'APPROVED',     // Approved by admin, but not yet published
  PUBLISHED = 'PUBLISHED',   // Published and visible in feed
  REJECTED = 'REJECTED'      // Rejected by admin
}

