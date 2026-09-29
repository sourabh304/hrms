export type EmployeeStatus = 'ONBOARDING' | 'PROBATION' | 'ACTIVE' | 'NOTICE_PERIOD' | 'EXITED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type Gender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'UNDISCLOSED';
export type WorkMode = 'ONSITE' | 'REMOTE' | 'HYBRID';

export interface Ref {
  id: string;
  name: string;
}

export interface DesignationRef {
  id: string;
  title: string;
  level: string;
}

export interface LocationRef {
  id: string;
  name: string;
  city: string;
  country: string;
}

/** Minimal employee shape embedded in other resources. */
export interface EmployeeMini {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  workEmail: string;
  avatarUrl: string | null;
  managerId: string | null;
  designation?: DesignationRef | null;
  department?: Ref | null;
}

export interface Employee extends EmployeeMini {
  preferredName: string | null;
  personalEmail: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender;
  maritalStatus: string | null;
  nationality: string | null;
  bloodGroup: string | null;
  address: { line1?: string; line2?: string; city?: string; state?: string; country?: string; postalCode?: string } | null;
  emergencyContact: { name: string; relationship: string; phone: string } | null;
  bankDetails: { bankName: string; accountHolder: string; accountNumber: string; routingCode?: string } | null;
  bio: string | null;
  skills: string[] | null;
  departmentId: string | null;
  designationId: string | null;
  locationId: string | null;
  shiftId: string | null;
  location: LocationRef | null;
  manager: EmployeeMini | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  workMode: WorkMode;
  dateOfJoining: string;
  probationEndDate: string | null;
  dateOfExit: string | null;
  createdAt: string;
}

export interface EmployeeDetail extends Employee {
  directReports: EmployeeMini[];
  account: { id: string; email: string; roles: string[]; isActive: boolean } | null;
  temporaryPassword?: string;
}

export interface LookupEmployee {
  id: string;
  fullName: string;
  employeeCode: string;
  designation: string | null;
  avatarUrl: string | null;
}

export interface EmploymentEvent {
  id: string;
  type: 'HIRE' | 'PROMOTION' | 'TRANSFER' | 'MANAGER_CHANGE' | 'STATUS_CHANGE' | 'COMPENSATION_CHANGE' | 'EXIT';
  effectiveDate: string;
  summary: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrgChartNode {
  id: string;
  fullName: string;
  employeeCode: string;
  avatarUrl: string | null;
  managerId: string | null;
  designation: string | null;
  level: string | null;
  department: string | null;
  location: string | null;
}

export interface Celebration {
  type: 'BIRTHDAY' | 'ANNIVERSARY';
  date: string;
  years?: number;
  employee: { id: string; fullName: string; avatarUrl: string | null; designation: string | null };
}
