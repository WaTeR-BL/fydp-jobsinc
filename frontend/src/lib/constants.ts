import type { LucideIcon } from 'lucide-react';
import { Users, Globe, Briefcase, Calendar, Settings, CreditCard } from 'lucide-react';

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  href: string;
  roles?: string[]; // canonical slugs like 'admin', 'manager', 'interviewer'
  group: 'recruiting' | 'administration' | 'account';
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Jobs',
    icon: Briefcase,
    href: '/dashboard/jobs',
    roles: ['admin', 'manager', 'interviewer'],
    group: 'recruiting',
  },
  {
    label: 'Interviews',
    icon: Calendar,
    href: '/dashboard/interviews',
    roles: ['admin', 'manager', 'interviewer'],
    group: 'recruiting',
  },
  {
    label: 'Domains',
    icon: Globe,
    href: '/dashboard/domains',
    roles: ['admin', 'manager'],
    group: 'administration',
  },
  {
    label: 'Users',
    icon: Users,
    href: '/dashboard/users',
    roles: ['admin'],
    group: 'administration',
  },
  {
    label: 'Billing',
    icon: CreditCard,
    href: '/dashboard/billing',
    roles: ['admin'],
    group: 'account',
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
    group: 'account',
  },
];

export const NAV_GROUP_LABELS: Record<NavigationItem['group'], string> = {
  recruiting: 'Recruiting',
  administration: 'Administration',
  account: 'Account',
};
