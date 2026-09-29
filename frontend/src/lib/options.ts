import { humanize } from './utils';

/** Build select options from enum-like string lists. */
export const enumOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: humanize(v) }));

export const EMPLOYEE_STATUSES = ['ONBOARDING', 'PROBATION', 'ACTIVE', 'NOTICE_PERIOD', 'EXITED'] as const;
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const;
export const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
export const GENDERS = ['FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED'] as const;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
