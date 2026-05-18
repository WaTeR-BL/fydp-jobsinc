export type EventFilters = {
  from: string;
  to: string;
  interviewType: 'all' | '0' | '1';
  status: 'all' | '0' | '1' | '2' | '3' | '4' | '5';
};

export type EventTabKey = 'my-availability' | 'my-events' | 'company-events';

export type UserRoleScope = {
  isInterviewer: boolean;
  isAdminOrManager: boolean;
};
