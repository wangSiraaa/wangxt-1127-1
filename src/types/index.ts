export type UserRole = "user" | "staff" | "reader" | "approver";
export type UserStatus = "normal" | "suspended";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  avatar?: string;
}

export type ArchiveLevel = "公开" | "内部" | "秘密" | "机密" | "绝密";
export type ArchiveStatus =
  | "in_shelf"
  | "dispatched"
  | "reading"
  | "overdue";

export interface Archive {
  id: string;
  code: string;
  title: string;
  level: ArchiveLevel;
  shelf_id: string;
  layer: number;
  cell: number;
  status: ArchiveStatus;
  create_year: number;
  category: string;
}

export type ShelfStatus = "normal" | "locked" | "inventory";

export interface Shelf {
  id: string;
  code: string;
  row: number;
  column: number;
  total_layers: number;
  total_cells: number;
  status: ShelfStatus;
  location: string;
}

export type ApplicationStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "dispatching"
  | "reading"
  | "completed"
  | "cancelled";

export interface Application {
  id: string;
  user_id: string;
  archive_id: string;
  reason: string;
  apply_time: string;
  expect_read_time: string;
  status: ApplicationStatus;
  approval_id?: string;
  approval_opinion?: string;
  approval_time?: string;
}

export type DispatchStatus = "pending" | "outbound";

export interface DispatchOrder {
  id: string;
  application_id: string;
  shelf_id: string;
  staff_id: string;
  dispatch_time: string;
  outbound_time?: string;
  status: DispatchStatus;
}

export type ReturnStatus = "received" | "reading" | "returned";

export interface ReturnRecord {
  id: string;
  application_id: string;
  reader_id: string;
  receive_time: string;
  start_read_time?: string;
  end_read_time?: string;
  return_time?: string;
  status: ReturnStatus;
  due_time: string;
  seat_no?: string;
}

export type OverdueStatus = "active" | "resolved";

export interface OverdueRecord {
  id: string;
  user_id: string;
  application_id: string;
  overdue_days: number;
  record_time: string;
  status: OverdueStatus;
  resolve_time?: string;
}

export type InventoryStatus = "ongoing" | "completed";

export interface InventoryTask {
  id: string;
  shelf_id: string;
  staff_id: string;
  start_time: string;
  end_time?: string;
  status: InventoryStatus;
  remark?: string;
}

export const SECRET_LEVELS: ArchiveLevel[] = ["秘密", "机密", "绝密"];

export const isSecretLevel = (level: ArchiveLevel): boolean =>
  SECRET_LEVELS.includes(level);
