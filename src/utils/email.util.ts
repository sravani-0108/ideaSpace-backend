const ALLOWED_DOMAINS = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || [
  '@company.com',
  '@office.com',
  '@outlook.office365.com',
  '@ibaseit.com',
];

export const isValidCompanyEmail = (email: string): boolean => {
  return ALLOWED_DOMAINS.some((domain) => email.endsWith(domain));
};

export const getAllowedDomains = (): string[] => {
  return ALLOWED_DOMAINS;
};

