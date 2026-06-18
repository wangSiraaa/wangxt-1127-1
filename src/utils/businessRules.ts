import type { Archive, Shelf, Application, User } from "@/types";
import { isSecretLevel } from "@/types";

export interface RuleResult {
  success: boolean;
  message: string;
}

export const canCreateApplication = (
  user: User | undefined,
  archive: Archive | undefined
): RuleResult => {
  if (!user) return { success: false, message: "未登录用户" };
  if (user.status === "suspended") {
    return { success: false, message: "您存在逾期未归还记录，暂无法提交新申请" };
  }
  if (!archive) return { success: false, message: "档案不存在" };
  if (archive.status !== "in_shelf") {
    return { success: false, message: "该档案当前不在架上，无法申请调阅" };
  }
  return { success: true, message: "" };
};

export const canApproveApplication = (
  application: Application | undefined
): RuleResult => {
  if (!application) return { success: false, message: "申请不存在" };
  if (application.status !== "pending_approval") {
    return { success: false, message: "该申请无需审批" };
  }
  return { success: true, message: "" };
};

export const canDispatchApplication = (
  application: Application | undefined,
  archive: Archive | undefined,
  shelf: Shelf | undefined
): RuleResult => {
  if (!application) return { success: false, message: "申请不存在" };
  if (!archive) return { success: false, message: "档案不存在" };
  if (!shelf) return { success: false, message: "架位不存在" };

  if (application.status === "pending_approval" && isSecretLevel(archive.level)) {
    return { success: false, message: "涉密档案尚未通过审批，无法派单" };
  }
  if (application.status !== "approved") {
    return { success: false, message: "该申请状态不允许派单" };
  }
  if (shelf.status === "inventory") {
    return {
      success: false,
      message: `密集架 [${shelf.code}] 正在盘点，暂无法派单调卷`,
    };
  }
  if (shelf.status === "locked") {
    return {
      success: false,
      message: `密集架 [${shelf.code}] 已锁定，暂无法操作`,
    };
  }
  if (archive.status !== "in_shelf") {
    return { success: false, message: "档案已不在架上" };
  }
  return { success: true, message: "" };
};

export const canReceiveArchive = (
  application: Application | undefined
): RuleResult => {
  if (!application) return { success: false, message: "申请不存在" };
  if (application.status !== "dispatching") {
    return { success: false, message: "该档案尚未出库，无法接收" };
  }
  return { success: true, message: "" };
};

export const canStartReading = (
  status: Application["status"]
): RuleResult => {
  if (status !== "dispatching" && status !== "reading") {
    return { success: false, message: "当前状态无法开始阅览" };
  }
  return { success: true, message: "" };
};

export const canReturnArchive = (
  applicationStatus: Application["status"]
): RuleResult => {
  if (applicationStatus !== "reading") {
    return { success: false, message: "当前状态无法归还" };
  }
  return { success: true, message: "" };
};
