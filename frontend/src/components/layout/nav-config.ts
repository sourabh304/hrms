import {
  BarChart3,
  Banknote,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarHeart,
  Clock,
  FileText,
  GraduationCap,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  Laptop,
  LifeBuoy,
  LogOut,
  Megaphone,
  Network,
  Receipt,
  Rocket,
  Settings,
  ShieldCheck,
  Target,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS, type Permission } from '@/features/auth/types';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the user holds any of these permissions. */
  anyOf?: Permission[];
  badge?: 'inbox';
  keywords?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const P = PERMISSIONS;

export const NAVIGATION: NavSection[] = [
  {
    title: 'Home',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
      { label: 'Inbox', href: '/inbox', icon: Inbox, badge: 'inbox', keywords: 'approvals tasks pending' },
    ],
  },
  {
    title: 'My Workspace',
    items: [
      { label: 'My Profile', href: '/profile', icon: UserCircle, keywords: 'me personal bank password' },
      { label: 'Attendance', href: '/attendance', icon: Clock, keywords: 'clock in out timesheet regularize' },
      { label: 'Leave', href: '/leave', icon: CalendarDays, keywords: 'time off vacation holiday balance' },
      { label: 'Payslips', href: '/payslips', icon: Receipt, keywords: 'salary pay slip compensation' },
      { label: 'Expenses', href: '/expenses', icon: Wallet, keywords: 'claims reimbursement' },
      { label: 'Helpdesk', href: '/helpdesk', icon: LifeBuoy, keywords: 'tickets support ask hr' },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Employees', href: '/employees', icon: Users, anyOf: [P.EMPLOYEE_READ], keywords: 'directory people staff' },
      { label: 'Org Chart', href: '/org-chart', icon: Network, keywords: 'hierarchy reporting structure' },
      { label: 'Organization', href: '/organization', icon: Building2, anyOf: [P.ORG_MANAGE], keywords: 'departments designations locations' },
      { label: 'Holidays', href: '/holidays', icon: CalendarHeart, keywords: 'calendar public holidays' },
    ],
  },
  {
    title: 'Talent',
    items: [
      { label: 'Recruitment', href: '/recruitment', icon: Briefcase, keywords: 'jobs hiring candidates referrals ats' },
      { label: 'Onboarding', href: '/onboarding', icon: Rocket, keywords: 'new hire journey checklist' },
      { label: 'Offboarding', href: '/offboarding', icon: LogOut, keywords: 'resignation exit separation' },
      { label: 'Performance', href: '/performance', icon: Target, keywords: 'goals okr reviews feedback appraisal' },
      { label: 'Learning', href: '/learning', icon: GraduationCap, keywords: 'courses training lms' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Payroll', href: '/payroll', icon: Banknote, anyOf: [P.PAYROLL_MANAGE], keywords: 'salary run compensation ctc' },
      { label: 'Assets', href: '/assets', icon: Laptop, keywords: 'laptop devices inventory' },
      { label: 'Documents', href: '/documents', icon: FileText, keywords: 'policies handbook files' },
    ],
  },
  {
    title: 'Engage',
    items: [
      { label: 'Announcements', href: '/announcements', icon: Megaphone, keywords: 'news updates' },
      { label: 'Engagement', href: '/engagement', icon: HeartHandshake, keywords: 'kudos recognition survey enps' },
    ],
  },
  {
    title: 'Insights & Admin',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3, anyOf: [P.ANALYTICS_VIEW], keywords: 'reports headcount attrition dashboard' },
      { label: 'Audit Logs', href: '/audit-logs', icon: ShieldCheck, anyOf: [P.AUDIT_VIEW], keywords: 'security activity history' },
      { label: 'Settings', href: '/settings', icon: Settings, anyOf: [P.USER_MANAGE, P.WORKFLOW_MANAGE, P.ORG_MANAGE], keywords: 'users roles workflow company' },
    ],
  },
];

export function visibleNavigation(permissions: Permission[]): NavSection[] {
  return NAVIGATION.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.anyOf || i.anyOf.some((p) => permissions.includes(p))),
  })).filter((s) => s.items.length);
}
