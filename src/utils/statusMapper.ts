import type {
  ArchiveStatus,
  ShelfStatus,
  ApplicationStatus,
  DispatchStatus,
  ReturnStatus,
  UserStatus,
  ArchiveLevel,
  UserRole,
} from "@/types";

interface StatusMapItem {
  label: string;
  color: string;
  bgColor: string;
}

const createBadge = (label: string, color: string, bg: string): StatusMapItem => ({
  label,
  color,
  bgColor: bg,
});

export const archiveStatusMap: Record<ArchiveStatus, StatusMapItem> = {
  in_shelf: createBadge("在架", "text-emerald-700", "bg-emerald-50 border-emerald-200"),
  dispatched: createBadge("已调出", "text-blue-700", "bg-blue-50 border-blue-200"),
  reading: createBadge("阅览中", "text-amber-700", "bg-amber-50 border-amber-200"),
  overdue: createBadge("逾期未还", "text-red-700", "bg-red-50 border-red-200"),
};

export const shelfStatusMap: Record<ShelfStatus, StatusMapItem> = {
  normal: createBadge("正常", "text-emerald-700", "bg-emerald-50 border-emerald-200"),
  locked: createBadge("锁定", "text-slate-700", "bg-slate-100 border-slate-300"),
  inventory: createBadge("盘点中", "text-amber-700", "bg-amber-50 border-amber-200"),
};

export const applicationStatusMap: Record<ApplicationStatus, StatusMapItem> = {
  pending_approval: createBadge("待审批", "text-amber-700", "bg-amber-50 border-amber-200"),
  approved: createBadge("已批准", "text-blue-700", "bg-blue-50 border-blue-200"),
  rejected: createBadge("已驳回", "text-red-700", "bg-red-50 border-red-200"),
  dispatching: createBadge("调卷中", "text-indigo-700", "bg-indigo-50 border-indigo-200"),
  reading: createBadge("阅览中", "text-purple-700", "bg-purple-50 border-purple-200"),
  completed: createBadge("已完成", "text-emerald-700", "bg-emerald-50 border-emerald-200"),
  cancelled: createBadge("已取消", "text-slate-600", "bg-slate-100 border-slate-300"),
};

export const dispatchStatusMap: Record<DispatchStatus, StatusMapItem> = {
  pending: createBadge("待出库", "text-amber-700", "bg-amber-50 border-amber-200"),
  outbound: createBadge("已出库", "text-blue-700", "bg-blue-50 border-blue-200"),
};

export const returnStatusMap: Record<ReturnStatus, StatusMapItem> = {
  received: createBadge("已接收", "text-blue-700", "bg-blue-50 border-blue-200"),
  reading: createBadge("阅览中", "text-purple-700", "bg-purple-50 border-purple-200"),
  returned: createBadge("已归还", "text-emerald-700", "bg-emerald-50 border-emerald-200"),
};

export const userStatusMap: Record<UserStatus, StatusMapItem> = {
  normal: createBadge("正常", "text-emerald-700", "bg-emerald-50 border-emerald-200"),
  suspended: createBadge("暂停", "text-red-700", "bg-red-50 border-red-200"),
};

export const archiveLevelMap: Record<ArchiveLevel, StatusMapItem> = {
  公开: createBadge("公开", "text-slate-700", "bg-slate-100 border-slate-300"),
  内部: createBadge("内部", "text-blue-700", "bg-blue-50 border-blue-200"),
  秘密: createBadge("秘密", "text-amber-700", "bg-amber-50 border-amber-200"),
  机密: createBadge("机密", "text-orange-700", "bg-orange-50 border-orange-200"),
  绝密: createBadge("绝密", "text-red-700", "bg-red-50 border-red-200"),
};

export const userRoleMap: Record<UserRole, string> = {
  user: "利用者",
  staff: "库房管理员",
  reader: "阅览室管理员",
  approver: "审批人员",
};

export const getStatusBadge = <T extends string>(
  map: Record<T, StatusMapItem>,
  status: T
) => map[status];
