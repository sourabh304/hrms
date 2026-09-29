export const EMPLOYEE_CREATED = 'employee.created';

export interface EmployeeCreatedEvent {
  employeeId: string;
  createdByEmployeeId: string | null;
}
