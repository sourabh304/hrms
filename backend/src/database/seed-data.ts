/** Static reference data for the demo tenant. */
import { Role } from '../common/auth/roles.js';
import { EmploymentType, WorkMode } from '../modules/employees/entities/employee.entity.js';

export const DEMO_PASSWORD = 'Segue@123';

export const LOCATIONS = [
  { code: 'BLR', name: 'Bengaluru HQ', city: 'Bengaluru', country: 'India', timezone: 'Asia/Kolkata', isHeadquarters: true, address: 'Embassy Tech Village, Outer Ring Road' },
  { code: 'NYC', name: 'New York Office', city: 'New York', country: 'United States', timezone: 'America/New_York', isHeadquarters: false, address: '350 Fifth Avenue' },
  { code: 'LON', name: 'London Office', city: 'London', country: 'United Kingdom', timezone: 'Europe/London', isHeadquarters: false, address: '1 Canada Square, Canary Wharf' },
  { code: 'SGP', name: 'Singapore Office', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', isHeadquarters: false, address: '8 Marina View' },
];

export const DEPARTMENTS = [
  { code: 'EXEC', name: 'Executive Office', costCenter: 'CC-100', head: 'ceo' },
  { code: 'ENG', name: 'Engineering', costCenter: 'CC-200', head: 'vpe' },
  { code: 'PROD', name: 'Product Management', costCenter: 'CC-210', head: 'grace' },
  { code: 'DES', name: 'Design', costCenter: 'CC-220', head: 'chloe' },
  { code: 'SALES', name: 'Sales', costCenter: 'CC-300', head: 'william' },
  { code: 'MKT', name: 'Marketing', costCenter: 'CC-310', head: 'olivia' },
  { code: 'FIN', name: 'Finance', costCenter: 'CC-400', head: 'emily' },
  { code: 'HR', name: 'People & Culture', costCenter: 'CC-410', head: 'hrd' },
  { code: 'CS', name: 'Customer Success', costCenter: 'CC-320', head: 'carlos' },
  { code: 'IT', name: 'IT & Operations', costCenter: 'CC-420', head: 'marcus' },
  { code: 'LEGAL', name: 'Legal & Compliance', costCenter: 'CC-430', head: 'laura' },
];

export const DESIGNATIONS: [title: string, level: string, family: string][] = [
  ['Chief Executive Officer', 'L9', 'Executive'],
  ['Chief Technology Officer', 'L9', 'Executive'],
  ['VP of Engineering', 'L8', 'Engineering'],
  ['VP of Product', 'L8', 'Product'],
  ['Director of People', 'L8', 'People'],
  ['Head of Sales', 'L8', 'Sales'],
  ['Engineering Manager', 'L7', 'Engineering'],
  ['Finance Manager', 'L7', 'Finance'],
  ['Legal Counsel', 'L7', 'Legal'],
  ['Staff Engineer', 'L6', 'Engineering'],
  ['Design Lead', 'L6', 'Design'],
  ['Marketing Manager', 'L6', 'Marketing'],
  ['HR Business Partner', 'L6', 'People'],
  ['IT Manager', 'L6', 'IT'],
  ['Customer Success Lead', 'L6', 'Customer Success'],
  ['Senior Software Engineer', 'L5', 'Engineering'],
  ['Product Manager', 'L5', 'Product'],
  ['Product Designer', 'L5', 'Design'],
  ['DevOps Engineer', 'L5', 'Engineering'],
  ['Payroll Specialist', 'L5', 'Finance'],
  ['Talent Acquisition Specialist', 'L5', 'People'],
  ['Account Executive', 'L5', 'Sales'],
  ['Customer Success Manager', 'L5', 'Customer Success'],
  ['Software Engineer', 'L4', 'Engineering'],
  ['QA Engineer', 'L4', 'Engineering'],
  ['Financial Analyst', 'L4', 'Finance'],
  ['Content Strategist', 'L4', 'Marketing'],
  ['IT Support Engineer', 'L4', 'IT'],
  ['Associate Software Engineer', 'L3', 'Engineering'],
  ['Sales Development Representative', 'L3', 'Sales'],
  ['Support Specialist', 'L3', 'Customer Success'],
  ['Software Engineering Intern', 'L1', 'Engineering'],
];

export interface EmployeeDef {
  key: string;
  first: string;
  last: string;
  gender: 'MALE' | 'FEMALE';
  dept: string;
  title: string;
  loc: string;
  manager?: string;
  joined: string;
  email?: string;
  roles?: Role[];
  type?: EmploymentType;
  mode?: WorkMode;
  exited?: string;
}

export const EMPLOYEES: EmployeeDef[] = [
  { key: 'ceo', first: 'Arjun', last: 'Kapoor', gender: 'MALE', dept: 'EXEC', title: 'Chief Executive Officer', loc: 'BLR', joined: '2018-04-02', email: 'admin@segueit.com', roles: [Role.SUPER_ADMIN] },
  { key: 'hrd', first: 'Neha', last: 'Iyer', gender: 'FEMALE', dept: 'HR', title: 'Director of People', loc: 'BLR', manager: 'ceo', joined: '2018-06-11', email: 'hr@segueit.com', roles: [Role.HR_ADMIN] },
  { key: 'aisha', first: 'Aisha', last: 'Khan', gender: 'FEMALE', dept: 'HR', title: 'Talent Acquisition Specialist', loc: 'BLR', manager: 'hrd', joined: '2021-02-15', email: 'recruiter@segueit.com', roles: [Role.RECRUITER] },
  { key: 'oliverb', first: 'Oliver', last: 'Bennett', gender: 'MALE', dept: 'HR', title: 'HR Business Partner', loc: 'LON', manager: 'hrd', joined: '2020-09-01' },
  { key: 'kavya', first: 'Kavya', last: 'Nair', gender: 'FEMALE', dept: 'HR', title: 'HR Business Partner', loc: 'BLR', manager: 'hrd', joined: '2022-07-18' },
  { key: 'cto', first: 'Michael', last: 'Thompson', gender: 'MALE', dept: 'EXEC', title: 'Chief Technology Officer', loc: 'NYC', manager: 'ceo', joined: '2018-08-20' },
  { key: 'vpe', first: 'Sanjay', last: 'Gupta', gender: 'MALE', dept: 'ENG', title: 'VP of Engineering', loc: 'BLR', manager: 'cto', joined: '2019-01-07' },
  { key: 'daniel', first: 'Daniel', last: 'Carter', gender: 'MALE', dept: 'ENG', title: 'Engineering Manager', loc: 'NYC', manager: 'vpe', joined: '2019-05-13', email: 'manager@segueit.com' },
  { key: 'sofia', first: 'Sofia', last: 'Martinez', gender: 'FEMALE', dept: 'ENG', title: 'Senior Software Engineer', loc: 'NYC', manager: 'daniel', joined: '2021-03-22', email: 'employee@segueit.com', mode: WorkMode.HYBRID },
  { key: 'ethan', first: 'Ethan', last: 'Walker', gender: 'MALE', dept: 'ENG', title: 'Software Engineer', loc: 'NYC', manager: 'daniel', joined: '2022-10-03' },
  { key: 'priyar', first: 'Priya', last: 'Reddy', gender: 'FEMALE', dept: 'ENG', title: 'Software Engineer', loc: 'BLR', manager: 'daniel', joined: '2023-01-16', mode: WorkMode.REMOTE },
  { key: 'lucas', first: 'Lucas', last: 'Silva', gender: 'MALE', dept: 'ENG', title: 'QA Engineer', loc: 'LON', manager: 'daniel', joined: '2022-04-11' },
  { key: 'ananya', first: 'Ananya', last: 'Krishnan', gender: 'FEMALE', dept: 'ENG', title: 'Engineering Manager', loc: 'BLR', manager: 'vpe', joined: '2019-11-04' },
  { key: 'rohan', first: 'Rohan', last: 'Das', gender: 'MALE', dept: 'ENG', title: 'Staff Engineer', loc: 'BLR', manager: 'ananya', joined: '2019-08-19' },
  { key: 'vivek', first: 'Vivek', last: 'Pillai', gender: 'MALE', dept: 'ENG', title: 'Senior Software Engineer', loc: 'BLR', manager: 'ananya', joined: '2020-12-07' },
  { key: 'meera', first: 'Meera', last: 'Joshi', gender: 'FEMALE', dept: 'ENG', title: 'Software Engineer', loc: 'BLR', manager: 'ananya', joined: '2023-06-05' },
  { key: 'arnav', first: 'Arnav', last: 'Bhatt', gender: 'MALE', dept: 'ENG', title: 'DevOps Engineer', loc: 'BLR', manager: 'ananya', joined: '2021-09-13' },
  { key: 'kiran', first: 'Kiran', last: 'Kumar', gender: 'MALE', dept: 'ENG', title: 'QA Engineer', loc: 'BLR', manager: 'ananya', joined: '2024-02-19' },
  { key: 'tanya', first: 'Tanya', last: 'Singh', gender: 'FEMALE', dept: 'ENG', title: 'Software Engineering Intern', loc: 'BLR', manager: 'ananya', joined: '2026-06-01', type: EmploymentType.INTERN },
  { key: 'marcus', first: 'Marcus', last: 'Johnson', gender: 'MALE', dept: 'IT', title: 'IT Manager', loc: 'NYC', manager: 'cto', joined: '2019-03-18', email: 'it@segueit.com', roles: [Role.IT_ADMIN] },
  { key: 'samuel', first: 'Samuel', last: 'Okafor', gender: 'MALE', dept: 'IT', title: 'IT Support Engineer', loc: 'LON', manager: 'marcus', joined: '2021-11-08' },
  { key: 'deepak', first: 'Deepak', last: 'Yadav', gender: 'MALE', dept: 'IT', title: 'IT Support Engineer', loc: 'BLR', manager: 'marcus', joined: '2023-03-27' },
  { key: 'grace', first: 'Grace', last: 'Kim', gender: 'FEMALE', dept: 'PROD', title: 'VP of Product', loc: 'SGP', manager: 'ceo', joined: '2019-02-11' },
  { key: 'jamesw', first: 'James', last: 'Wilson', gender: 'MALE', dept: 'PROD', title: 'Product Manager', loc: 'NYC', manager: 'grace', joined: '2021-05-10' },
  { key: 'isha', first: 'Isha', last: 'Malhotra', gender: 'FEMALE', dept: 'PROD', title: 'Product Manager', loc: 'BLR', manager: 'grace', joined: '2022-08-22' },
  { key: 'chloe', first: 'Chloe', last: 'Dubois', gender: 'FEMALE', dept: 'DES', title: 'Design Lead', loc: 'LON', manager: 'grace', joined: '2020-03-02' },
  { key: 'ryan', first: 'Ryan', last: 'Park', gender: 'MALE', dept: 'DES', title: 'Product Designer', loc: 'SGP', manager: 'chloe', joined: '2022-01-10' },
  { key: 'zara', first: 'Zara', last: 'Ahmed', gender: 'FEMALE', dept: 'DES', title: 'Product Designer', loc: 'BLR', manager: 'chloe', joined: '2024-05-06' },
  { key: 'william', first: 'William', last: 'Brooks', gender: 'MALE', dept: 'SALES', title: 'Head of Sales', loc: 'NYC', manager: 'ceo', joined: '2019-07-01' },
  { key: 'jessica', first: 'Jessica', last: 'Taylor', gender: 'FEMALE', dept: 'SALES', title: 'Account Executive', loc: 'NYC', manager: 'william', joined: '2021-08-16' },
  { key: 'tom', first: 'Tom', last: 'Harris', gender: 'MALE', dept: 'SALES', title: 'Account Executive', loc: 'LON', manager: 'william', joined: '2022-03-14' },
  { key: 'weiling', first: 'Wei Ling', last: 'Tan', gender: 'FEMALE', dept: 'SALES', title: 'Account Executive', loc: 'SGP', manager: 'william', joined: '2023-09-04' },
  { key: 'aditya', first: 'Aditya', last: 'Rao', gender: 'MALE', dept: 'SALES', title: 'Sales Development Representative', loc: 'BLR', manager: 'william', joined: '2025-01-13' },
  { key: 'olivia', first: 'Olivia', last: 'Martin', gender: 'FEMALE', dept: 'MKT', title: 'Marketing Manager', loc: 'LON', manager: 'william', joined: '2020-06-15' },
  { key: 'noah', first: 'Noah', last: 'Clarke', gender: 'MALE', dept: 'MKT', title: 'Content Strategist', loc: 'LON', manager: 'olivia', joined: '2023-02-06' },
  { key: 'pooja', first: 'Pooja', last: 'Bansal', gender: 'FEMALE', dept: 'MKT', title: 'Content Strategist', loc: 'BLR', manager: 'olivia', joined: '2024-09-02' },
  { key: 'emily', first: 'Emily', last: 'Chen', gender: 'FEMALE', dept: 'FIN', title: 'Finance Manager', loc: 'SGP', manager: 'ceo', joined: '2019-10-14', email: 'finance@segueit.com', roles: [Role.FINANCE] },
  { key: 'rahul', first: 'Rahul', last: 'Verma', gender: 'MALE', dept: 'FIN', title: 'Payroll Specialist', loc: 'BLR', manager: 'emily', joined: '2020-11-23', email: 'payroll@segueit.com', roles: [Role.PAYROLL_ADMIN] },
  { key: 'benjamin', first: 'Benjamin', last: 'Scott', gender: 'MALE', dept: 'FIN', title: 'Financial Analyst', loc: 'NYC', manager: 'emily', joined: '2022-05-23' },
  { key: 'laura', first: 'Laura', last: 'Schmidt', gender: 'FEMALE', dept: 'LEGAL', title: 'Legal Counsel', loc: 'LON', manager: 'ceo', joined: '2020-01-20' },
  { key: 'carlos', first: 'Carlos', last: 'Rodriguez', gender: 'MALE', dept: 'CS', title: 'Customer Success Lead', loc: 'NYC', manager: 'ceo', joined: '2020-08-03' },
  { key: 'mia', first: 'Mia', last: 'Robinson', gender: 'FEMALE', dept: 'CS', title: 'Customer Success Manager', loc: 'NYC', manager: 'carlos', joined: '2022-11-14' },
  { key: 'fatima', first: 'Fatima', last: 'Hassan', gender: 'FEMALE', dept: 'CS', title: 'Support Specialist', loc: 'LON', manager: 'carlos', joined: '2023-07-10' },
  { key: 'nikhil', first: 'Nikhil', last: 'Sharma', gender: 'MALE', dept: 'CS', title: 'Support Specialist', loc: 'BLR', manager: 'carlos', joined: '2025-04-07' },
  // Former employees (attrition history)
  { key: 'jason', first: 'Jason', last: 'Miller', gender: 'MALE', dept: 'ENG', title: 'Software Engineer', loc: 'NYC', manager: 'daniel', joined: '2021-06-14', exited: '2026-03-20' },
  { key: 'sara', first: 'Sara', last: 'Lopez', gender: 'FEMALE', dept: 'SALES', title: 'Account Executive', loc: 'NYC', manager: 'william', joined: '2022-02-07', exited: '2026-07-31' },
];

/** Annual base (USD) by level, adjusted by location cost factor. */
export const LEVEL_SALARY: Record<string, number> = {
  L1: 30000, L3: 52000, L4: 72000, L5: 98000, L6: 128000, L7: 155000, L8: 195000, L9: 260000,
};
export const LOCATION_FACTOR: Record<string, number> = { BLR: 0.45, NYC: 1, LON: 0.85, SGP: 0.8 };

export const HOLIDAYS: [date: string, name: string, type: 'PUBLIC' | 'COMPANY' | 'OPTIONAL', loc: string | null][] = [
  ['2026-01-01', "New Year's Day", 'PUBLIC', null],
  ['2026-01-26', 'Republic Day', 'PUBLIC', 'BLR'],
  ['2026-04-03', 'Good Friday', 'PUBLIC', 'LON'],
  ['2026-05-25', 'Memorial Day', 'PUBLIC', 'NYC'],
  ['2026-07-03', 'Independence Day (observed)', 'PUBLIC', 'NYC'],
  ['2026-08-10', 'National Day (observed)', 'PUBLIC', 'SGP'],
  ['2026-08-15', 'Independence Day', 'PUBLIC', 'BLR'],
  ['2026-09-07', 'Labor Day', 'PUBLIC', 'NYC'],
  ['2026-10-02', 'Gandhi Jayanti', 'PUBLIC', 'BLR'],
  ['2026-10-16', 'Segue Foundation Day', 'COMPANY', null],
  ['2026-11-26', 'Thanksgiving Day', 'PUBLIC', 'NYC'],
  ['2026-12-24', 'Christmas Eve', 'OPTIONAL', null],
  ['2026-12-25', 'Christmas Day', 'PUBLIC', null],
  ['2026-12-28', 'Boxing Day (substitute)', 'PUBLIC', 'LON'],
];

export const LEAVE_TYPES = [
  { code: 'AL', name: 'Annual Leave', annualQuota: 20, isPaid: true, carryForward: true, maxCarryForward: 5, color: '#6366f1', description: 'Planned vacation and personal time off.' },
  { code: 'SL', name: 'Sick Leave', annualQuota: 10, isPaid: true, color: '#ef4444', description: 'Illness or medical appointments. Certificate required beyond 2 days.' },
  { code: 'CL', name: 'Casual Leave', annualQuota: 6, isPaid: true, color: '#f59e0b', maxConsecutiveDays: 3, description: 'Short, unplanned personal needs.' },
  { code: 'PL', name: 'Parental Leave', annualQuota: 30, isPaid: true, allowHalfDay: false, color: '#ec4899', description: 'Birth or adoption of a child. Gender-neutral.' },
  { code: 'BL', name: 'Bereavement Leave', annualQuota: 5, isPaid: true, allowHalfDay: false, color: '#64748b', description: 'Loss of an immediate family member.' },
  { code: 'LWP', name: 'Leave Without Pay', annualQuota: 0, isPaid: false, color: '#94a3b8', description: 'Unpaid leave; deducted from payroll as loss of pay.' },
];

export const ONBOARDING_TASKS = [
  { title: 'Send welcome email and offer documents', category: 'Pre-boarding', assignee: 'HR', dueOffsetDays: -5 },
  { title: 'Provision laptop and peripherals', category: 'IT Setup', assignee: 'IT', dueOffsetDays: -2 },
  { title: 'Create email, SSO and VPN accounts', category: 'IT Setup', assignee: 'IT', dueOffsetDays: 0 },
  { title: 'Verify identity and employment documents', category: 'Compliance', assignee: 'HR', dueOffsetDays: 0 },
  { title: 'Assign an onboarding buddy', category: 'Team', assignee: 'MANAGER', dueOffsetDays: 0 },
  { title: 'Complete personal profile and bank details', category: 'Self-service', assignee: 'EMPLOYEE', dueOffsetDays: 1 },
  { title: 'Acknowledge Code of Conduct and policies', category: 'Compliance', assignee: 'EMPLOYEE', dueOffsetDays: 3 },
  { title: 'Enroll in payroll and benefits', category: 'Payroll', assignee: 'FINANCE', dueOffsetDays: 5 },
  { title: 'Complete Information Security training', category: 'Learning', assignee: 'EMPLOYEE', dueOffsetDays: 7 },
  { title: 'Agree 30-60-90 day goals', category: 'Team', assignee: 'MANAGER', dueOffsetDays: 10 },
  { title: '30-day check-in', category: 'Engagement', assignee: 'HR', dueOffsetDays: 30 },
] as const;

export const OFFBOARDING_TASKS = [
  { title: 'Prepare knowledge-transfer plan', category: 'Handover', assignee: 'MANAGER', dueOffsetDays: -14 },
  { title: 'Complete exit interview', category: 'Exit', assignee: 'EMPLOYEE', dueOffsetDays: -5 },
  { title: 'Collect laptop, badge and peripherals', category: 'Assets', assignee: 'IT', dueOffsetDays: 0 },
  { title: 'Revoke system and building access', category: 'Security', assignee: 'IT', dueOffsetDays: 0 },
  { title: 'Process full and final settlement', category: 'Payroll', assignee: 'FINANCE', dueOffsetDays: 7 },
  { title: 'Issue experience and relieving letters', category: 'Documents', assignee: 'HR', dueOffsetDays: 7 },
] as const;

export const COURSES = [
  { title: 'Information Security Awareness', category: 'Compliance', provider: 'Segue Academy', durationHours: 1.5, level: 'BEGINNER', format: 'INTERACTIVE', isMandatory: true, skills: ['Security'], description: 'Phishing, password hygiene, data classification and incident reporting.' },
  { title: 'Code of Conduct & Business Ethics', category: 'Compliance', provider: 'Segue Academy', durationHours: 1, level: 'BEGINNER', format: 'VIDEO', isMandatory: true, skills: ['Ethics'], description: 'Our values, conflicts of interest, anti-bribery and speaking up.' },
  { title: 'Preventing Workplace Harassment', category: 'Compliance', provider: 'Segue Academy', durationHours: 1, level: 'BEGINNER', format: 'VIDEO', isMandatory: true, skills: ['Inclusion'], description: 'Recognising, preventing and reporting harassment at work.' },
  { title: 'Data Privacy & GDPR Fundamentals', category: 'Compliance', provider: 'Segue Academy', durationHours: 2, level: 'INTERMEDIATE', format: 'INTERACTIVE', isMandatory: false, skills: ['Privacy', 'GDPR'], description: 'Handling personal data lawfully across regions.' },
  { title: 'Leadership Essentials for New Managers', category: 'Leadership', provider: 'Harvard ManageMentor', durationHours: 8, level: 'INTERMEDIATE', format: 'WEBINAR', isMandatory: false, skills: ['Leadership', 'Coaching'], description: 'Delegation, feedback, 1:1s and building high-performing teams.' },
  { title: 'Advanced TypeScript Patterns', category: 'Technical', provider: 'Frontend Masters', durationHours: 6, level: 'ADVANCED', format: 'VIDEO', isMandatory: false, skills: ['TypeScript'], description: 'Generics, conditional types and type-safe API design.' },
  { title: 'Kubernetes Fundamentals', category: 'Technical', provider: 'Linux Foundation', durationHours: 10, level: 'INTERMEDIATE', format: 'INTERACTIVE', isMandatory: false, skills: ['Kubernetes', 'DevOps'], description: 'Pods, deployments, services and production readiness.' },
  { title: 'Effective Business Communication', category: 'Soft Skills', provider: 'LinkedIn Learning', durationHours: 3, level: 'BEGINNER', format: 'VIDEO', isMandatory: false, skills: ['Communication'], description: 'Clear writing, presenting and stakeholder updates.' },
  { title: 'Consultative Selling', category: 'Sales', provider: 'Sandler Training', durationHours: 5, level: 'INTERMEDIATE', format: 'CLASSROOM', isMandatory: false, skills: ['Sales', 'Negotiation'], description: 'Discovery, value framing and closing enterprise deals.' },
  { title: 'Design Thinking Workshop', category: 'Product', provider: 'IDEO U', durationHours: 4, level: 'BEGINNER', format: 'CLASSROOM', isMandatory: false, skills: ['Design', 'Research'], description: 'Empathise, define, ideate, prototype and test.' },
] as const;

export const POLICIES = [
  { title: 'Employee Handbook 2026', category: 'HANDBOOK', version: '2026.1', requiresAcknowledgment: false, content: 'Welcome to Segue.\n\nThis handbook describes how we work together: our values, working hours, benefits, leave, conduct expectations and where to get help. It applies to all employees in every location, supplemented by local addenda where required by law.' },
  { title: 'Code of Conduct', category: 'POLICY', version: '3.0', requiresAcknowledgment: true, content: 'We act with integrity, treat everyone with respect and comply with the law.\n\n1. Avoid conflicts of interest and disclose any that arise.\n2. Never offer or accept bribes.\n3. Protect confidential information.\n4. Speak up — retaliation against good-faith reports is prohibited.' },
  { title: 'Information Security Policy', category: 'COMPLIANCE', version: '2.4', requiresAcknowledgment: true, content: 'All company devices must use full-disk encryption and screen lock. Use the corporate password manager and MFA for all systems. Report suspected incidents to security@ within one hour.' },
  { title: 'Leave & Time Off Policy', category: 'POLICY', version: '2026.1', requiresAcknowledgment: false, content: 'Employees accrue 20 days of annual leave per year (pro-rated in the joining year). Up to 5 unused days carry forward. Sick leave beyond 2 consecutive days requires a medical certificate. Leave is requested and approved in Segue HRMS.' },
  { title: 'Remote & Hybrid Work Policy', category: 'POLICY', version: '1.2', requiresAcknowledgment: false, content: 'Hybrid employees are expected in the office on anchor days agreed with their team. Remote employees must maintain a secure workspace and core collaboration hours of 10:00–15:00 local time.' },
  { title: 'Travel & Expense Reimbursement Policy', category: 'POLICY', version: '1.5', requiresAcknowledgment: false, content: 'Submit claims within 30 days with itemised receipts. Economy class for flights under 6 hours. Claims above 2,000 require skip-level approval; all claims are verified by Finance before reimbursement.' },
] as const;
