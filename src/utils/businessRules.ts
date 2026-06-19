import type {
  Archive,
  Shelf,
  Application,
  User,
  ReturnCheckItem,
  ApplicationPriority,
  SplitReason,
  ReadingSeat,
} from "@/types";
import {
  isSecretLevel,
  SECRET_LEVEL_RANK,
  needsSecondReview,
} from "@/types";

export interface RuleResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface SplitGroup {
  reason: SplitReason;
  detail: string;
  archiveIds: string[];
  approvalChain: string[];
  seatArea: "public" | "secret" | "confidential";
  priority: ApplicationPriority;
}

export interface SplitResult {
  groups: SplitGroup[];
  warnings: string[];
}

export const canCreateApplication = (
  user: User | undefined,
  archives: Archive | Archive[] | undefined,
  preserveApproved: boolean = false
): RuleResult => {
  if (!user) return { success: false, message: "未登录用户" };

  const archiveList = archives
    ? Array.isArray(archives)
      ? archives
      : [archives]
    : [];

  if (user.status === "suspended") {
    if (preserveApproved) {
      return {
        success: false,
        message:
          "您存在逾期未归还记录，已批准但未调出的申请将保留，但暂无法提交新申请",
      };
    }
    return {
      success: false,
      message: "您存在逾期未归还记录，暂无法提交新申请",
    };
  }

  if (archiveList.length === 0) {
    return { success: false, message: "请选择需要调阅的档案" };
  }

  for (const archive of archiveList) {
    if (!archive) {
      return { success: false, message: "存在档案不存在" };
    }
    if (archive.status !== "in_shelf") {
      return {
        success: false,
        message: `档案 [${archive.code}] 当前不在架上，无法申请调阅`,
      };
    }
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
  if (
    application.second_review_required &&
    (!application.secret_reviews || application.secret_reviews.length < 1)
  ) {
    return {
      success: false,
      message: "该档案涉密等级较高，需先完成初次涉密复核",
    };
  }
  return { success: true, message: "" };
};

export const canDispatchApplication = (
  application: Application | undefined,
  archive: Archive | undefined,
  shelf: Shelf | undefined
): RuleResult & { shouldSuspend?: boolean; suspendReason?: string } => {
  if (!application) return { success: false, message: "申请不存在" };
  if (!archive) return { success: false, message: "档案不存在" };
  if (!shelf) return { success: false, message: "架位不存在" };

  if (
    application.need_secret_review &&
    application.second_review_required &&
    (!application.secret_reviews ||
      application.secret_reviews.filter((r) => r.review_result === "pass")
        .length < 2)
  ) {
    return {
      success: false,
      message: "涉密档案尚未完成全部复核流程，无法派单",
    };
  }

  if (
    application.status === "pending_approval" &&
    isSecretLevel(archive.level)
  ) {
    return {
      success: false,
      message: "涉密档案尚未通过审批，无法派单",
    };
  }

  if (application.status === "suspended") {
    return {
      success: false,
      message: "申请已挂起，等待架位盘点完成",
    };
  }

  if (application.status !== "approved") {
    return { success: false, message: "该申请状态不允许派单" };
  }

  if (shelf.status === "inventory") {
    return {
      success: false,
      message: `密集架 [${shelf.code}] 正在盘点，暂无法派单调卷，可将申请挂起并保留优先级`,
      shouldSuspend: true,
      suspendReason: `架位 ${shelf.code} 盘点中`,
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

export const getApprovalChain = (archive: Archive): string[] => {
  if (!isSecretLevel(archive.level)) {
    return ["auto_approve"];
  }
  const chain: string[] = ["secret_reviewer_1"];
  if (needsSecondReview(archive.level)) {
    chain.push("secret_reviewer_2");
  }
  chain.push("final_approver");
  return chain;
};

export const getSeatArea = (archive: Archive): ReadingSeat["area"] => {
  const rank = SECRET_LEVEL_RANK[archive.level];
  if (rank <= 1) return "public";
  if (rank === 2) return "secret";
  return "confidential";
};

export const getPriorityForArchive = (
  archive: Archive,
  userPriority: ApplicationPriority = "normal"
): ApplicationPriority => {
  const baseRank = SECRET_LEVEL_RANK[archive.level];
  const userRank: Record<ApplicationPriority, number> = {
    low: 0,
    normal: 1,
    high: 2,
    urgent: 3,
  };
  const combined = baseRank + userRank[userPriority];
  if (combined >= 6) return "urgent";
  if (combined >= 4) return "high";
  if (combined >= 2) return "normal";
  return "low";
};

export const splitBatchApplication = (
  archives: Archive[],
  userPriority: ApplicationPriority = "normal"
): SplitResult => {
  const groups: SplitGroup[] = [];
  const warnings: string[] = [];

  const sameLevel = new Set(archives.map((a) => a.level));
  if (sameLevel.size > 1) {
    warnings.push(
      "检测到不同密级档案，将按密级拆分任务并分别走审批流程"
    );
  }

  const archiveMap = new Map<string, Archive[]>();
  for (const arc of archives) {
    const key = `${arc.level}_${getApprovalChain(arc).join("|")}_${getSeatArea(arc)}`;
    if (!archiveMap.has(key)) {
      archiveMap.set(key, []);
    }
    archiveMap.get(key)!.push(arc);
  }

  let splitReason: SplitReason;
  if (sameLevel.size > 1) {
    splitReason = "secret_level";
  } else {
    splitReason = "seat_availability";
  }

  archiveMap.forEach((groupArchives, key) => {
    const representative = groupArchives[0];
    const approvalChain = getApprovalChain(representative);
    const seatArea = getSeatArea(representative);
    const priority = getPriorityForArchive(representative, userPriority);

    const reasons: string[] = [];
    if (sameLevel.size > 1) {
      reasons.push(`密级统一为「${representative.level}」`);
    }
    if (approvalChain.length > 1) {
      reasons.push(`${approvalChain.length}级审批链`);
    }
    reasons.push(
      `${seatArea === "public" ? "普通阅览区" : seatArea === "secret" ? "涉密阅览区" : "核心涉密阅览区"}`
    );

    groups.push({
      reason: splitReason,
      detail: reasons.join(" · "),
      archiveIds: groupArchives.map((a) => a.id),
      approvalChain,
      seatArea,
      priority,
    });
  });

  groups.sort((a, b) => {
    const rank: Record<ApplicationPriority, number> = {
      urgent: 3,
      high: 2,
      normal: 1,
      low: 0,
    };
    return rank[b.priority] - rank[a.priority];
  });

  return { groups, warnings };
};

export const validateReturnCheckItems = (
  checkItems: ReturnCheckItem[]
): RuleResult & { hasAbnormal: boolean; abnormalItems: ReturnCheckItem[] } => {
  const abnormalItems = checkItems.filter((item) => !item.passed);
  const hasAbnormal = abnormalItems.length > 0;

  if (hasAbnormal) {
    return {
      success: false,
      message: `发现 ${abnormalItems.length} 项异常，需进入异常核对流程`,
      hasAbnormal: true,
      abnormalItems,
    };
  }

  return {
    success: true,
    message: "所有检查项通过",
    hasAbnormal: false,
    abnormalItems: [],
  };
};

export const getPriorityRank = (p: ApplicationPriority): number => {
  const rank: Record<ApplicationPriority, number> = {
    urgent: 3,
    high: 2,
    normal: 1,
    low: 0,
  };
  return rank[p];
};
