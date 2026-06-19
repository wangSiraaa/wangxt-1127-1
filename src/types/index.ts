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

export interface ArchivePhysicalInfo {
  total_pages: number;
  has_envelope: boolean;
  envelope_condition?: "good" | "damaged" | "missing";
  attachments: string[];
  attachment_count: number;
}

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
  physical: ArchivePhysicalInfo;
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
  zone?: string;
}

export type ApplicationPriority = "low" | "normal" | "high" | "urgent";
export type SplitReason =
  | "secret_level"
  | "approval_chain"
  | "seat_availability"
  | "manual";

export type ApplicationStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "dispatching"
  | "reading"
  | "completed"
  | "cancelled"
  | "suspended";

export interface SplitRecord {
  id: string;
  parent_application_id?: string;
  split_reason: SplitReason;
  split_detail: string;
  split_time: string;
  split_by?: string;
}

export interface SecretReviewRecord {
  id: string;
  application_id: string;
  reviewer_id: string;
  review_result: "pass" | "reject" | "pending";
  review_opinion?: string;
  review_time: string;
  is_second_review: boolean;
}

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
  priority: ApplicationPriority;
  group_id?: string;
  split_record?: SplitRecord;
  secret_reviews?: SecretReviewRecord[];
  need_secret_review: boolean;
  second_review_required: boolean;
  suspend_reason?: string;
  suspend_time?: string;
}

export type DispatchStatus = "pending" | "outbound" | "suspended";

export interface DispatchOrder {
  id: string;
  application_id: string;
  shelf_id: string;
  staff_id: string;
  dispatch_time: string;
  outbound_time?: string;
  status: DispatchStatus;
  batch_id?: string;
}

export interface ReadingSeat {
  id: string;
  seat_no: string;
  area: "public" | "secret" | "confidential";
  max_secret_level: ArchiveLevel;
  status: "available" | "occupied" | "maintenance";
  reader_id?: string;
  current_application_id?: string;
}

export type ReturnStatus =
  | "received"
  | "reading"
  | "returned"
  | "abnormal_check";

export interface ReturnCheckItem {
  key: "pages" | "envelope" | "attachments" | "intact" | "noMark";
  label: string;
  passed: boolean;
  actual_value?: string;
  expected_value?: string;
  remark?: string;
}

export interface AbnormalCheckRecord {
  id: string;
  return_record_id: string;
  check_items: ReturnCheckItem[];
  handler_id: string;
  handle_result: "resolved" | "pending" | "escalated";
  handle_opinion: string;
  handle_time?: string;
}

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
  check_items?: ReturnCheckItem[];
  abnormal_check_record_id?: string;
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
  preserve_approved: boolean;
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
  affected_zone?: string;
}

export const SECRET_LEVELS: ArchiveLevel[] = ["秘密", "机密", "绝密"];

export const SECRET_LEVEL_RANK: Record<ArchiveLevel, number> = {
  公开: 0,
  内部: 1,
  秘密: 2,
  机密: 3,
  绝密: 4,
};

export const isSecretLevel = (level: ArchiveLevel): boolean =>
  SECRET_LEVELS.includes(level);

export const needsSecondReview = (level: ArchiveLevel): boolean =>
  level === "机密" || level === "绝密";

export const LEVEL_PRIORITY_RANK: Record<ArchiveLevel, number> = {
  公开: 0,
  内部: 1,
  秘密: 2,
  机密: 3,
  绝密: 4,
};
