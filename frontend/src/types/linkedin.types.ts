/**
 * LinkedIn Integration Types
 * Defines types for LinkedIn accounts, organizations, and posting options
 */

/**
 * Represents a LinkedIn organization (company page)
 */
export interface LinkedInOrganization {
  organizationId: string;
  name: string;
}

/**
 * Represents a connected LinkedIn account
 */
export interface LinkedInAccount {
  email: string;
  urnId: string;
  expiresAt: string;
  isExpired: boolean;
  organizations: LinkedInOrganization[];
}

/**
 * Represents a target for LinkedIn posting
 * Can be either a personal profile or an organization page
 */
export interface LinkedInPostTarget {
  urnId: string;
  name: string;
  type: 'personal' | 'organization';
  accountEmail: string;
}

/**
 * Visibility options for LinkedIn posts
 */
export type LinkedInVisibility = 'PUBLIC' | 'CONNECTIONS';

/**
 * Represents a media item for LinkedIn posting (image or video)
 */
export interface LinkedInMediaItem {
  file: File;
  title: string;
  description: string;
  preview?: string; // Data URL for preview
}

export type ApplicationChannel = 'whatsapp' | 'email';

/**
 * LinkedIn posting options state
 */
export interface LinkedInPostOptions {
  enabled: boolean;
  targets: LinkedInPostTarget[];
  visibility: LinkedInVisibility;
  content: string;
  media: LinkedInMediaItem[];
  applicationChannels: ApplicationChannel[];
}

/**
 * Initial state factory for LinkedIn post options
 */
export const createInitialLinkedInOptions = (): LinkedInPostOptions => ({
  enabled: false,
  targets: [],
  visibility: 'PUBLIC',
  content: '',
  media: [],
  applicationChannels: ['whatsapp'],
});

/**
 * Result of a single LinkedIn post attempt
 */
export interface LinkedInPostResult {
  targetUrn: string;
  success: boolean;
  message: string;
  postId?: string;
  error?: unknown;
}

/**
 * API response for LinkedIn accounts endpoint
 */
export interface LinkedInAccountsResponse {
  message: string;
  success: boolean;
  data: LinkedInAccount[] | null;
}

/**
 * API response for LinkedIn post creation
 */
export interface LinkedInPostResponse {
  message: string;
  success: boolean;
  data: LinkedInPostResult[];
}
