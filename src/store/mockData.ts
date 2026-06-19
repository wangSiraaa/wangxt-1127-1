import type {
  User,
  Archive,
  Shelf,
  Application,
  DispatchOrder,
  ReturnRecord,
  OverdueRecord,
  InventoryTask,
  ReadingSeat,
  AbnormalCheckRecord,
  SplitRecord,
  SecretReviewRecord,
  ReturnCheckItem,
} from "@/types";
import { addDays, addHours } from "@/utils/dateUtils";

const now = new Date();

export const mockUsers: User[] = [
  { id: "u001", name: "张明远", role: "user", status: "normal", department: "历史研究所" },
  { id: "u002", name: "李思琪", role: "user", status: "suspended", department: "经济学院" },
  { id: "u003", name: "王建国", role: "staff", status: "normal", department: "档案库房" },
  { id: "u004", name: "赵晓峰", role: "staff", status: "normal", department: "档案库房" },
  { id: "u005", name: "陈雅婷", role: "reader", status: "normal", department: "阅览室" },
  { id: "u006", name: "刘春梅", role: "reader", status: "normal", department: "阅览室" },
  { id: "u007", name: "孙文博", role: "approver", status: "normal", department: "档案处" },
  { id: "u008", name: "周德华", role: "approver", status: "normal", department: "保密处" },
];

export const mockShelves: Shelf[] = Array.from({ length: 12 }, (_, i) => {
  const row = Math.floor(i / 4) + 1;
  const col = (i % 4) + 1;
  const zone = row <= 1 ? "A区" : row <= 2 ? "B区" : "C区";
  return {
    id: `shelf_${String(i + 1).padStart(3, "0")}`,
    code: `MJJ-${row}-${String(col).padStart(2, "0")}`,
    row,
    column: col,
    total_layers: 6,
    total_cells: 4,
    status: i === 2 ? "inventory" : "normal",
    location: `A区库房 ${row}排${col}列`,
    zone,
  };
});

const categories = ["人事档案", "合同档案", "财务档案", "工程档案", "科研档案", "文书档案"];
const levels: Archive["level"][] = ["公开", "内部", "秘密", "机密", "绝密"];
const titles = [
  "2019年度工作总结报告",
  "XX项目施工合同正本",
  "2020年财务审计报告",
  "人才引进审批表",
  "科研课题立项申请书",
  "基建工程验收文档",
  "党组会议纪要第12期",
  "员工培训档案汇总",
  "对外合作协议备案",
  "固定资产盘点清册",
  "学术期刊投稿原稿",
  "专利申请受理通知书",
  "干部任免审批材料",
  "重大决策风险评估",
  "国际交流合作纪要",
  "预算执行情况分析",
];

export const mockArchives: Archive[] = Array.from({ length: 84 }, (_, i) => {
  const shelfIdx = i % 12;
  const layer = Math.floor((i % 24) / 4) + 1;
  const cell = (i % 4) + 1;
  const levelIdx = [0, 0, 1, 1, 2, 2, 3, 4][i % 8];
  const statuses: Archive["status"][] = ["in_shelf", "in_shelf", "in_shelf", "in_shelf", "in_shelf"];
  if (i === 5) statuses[i % 5] = "dispatched";
  if (i === 10) statuses[i % 5] = "reading";
  if (i === 17) statuses[i % 5] = "overdue";

  return {
    id: `arc_${String(i + 1).padStart(4, "0")}`,
    code: `DA-${2015 + (i % 10)}-${String(i + 1).padStart(5, "0")}`,
    title: titles[i % titles.length] + `（${i + 1}号）`,
    level: levels[levelIdx],
    shelf_id: mockShelves[shelfIdx].id,
    layer,
    cell,
    status: statuses[i % 5],
    create_year: 2015 + (i % 10),
    category: categories[i % categories.length],
    physical: {
      total_pages: 50 + (i % 20) * 10,
      has_envelope: true,
      envelope_condition: "good",
      attachments: i % 3 === 0 ? ["附件1.pdf", "附件2.docx"] : ["附件说明.pdf"],
      attachment_count: i % 3 === 0 ? 2 : 1,
    },
  };
});

const genSplitRecord = (
  parentId: string,
  reason: SplitRecord["split_reason"],
  detail: string
): SplitRecord => ({
  id: `spl_${parentId.slice(-4)}_01`,
  parent_application_id: parentId,
  split_reason: reason,
  split_detail: detail,
  split_time: addHours(now, -25).toISOString(),
});

const genSecretReviews = (
  appId: string,
  passed: boolean = true
): SecretReviewRecord[] => [
  {
    id: `sr1_${appId.slice(-4)}`,
    application_id: appId,
    reviewer_id: "u007",
    review_result: passed ? "pass" : "pending",
    review_opinion: passed ? "初次复核通过" : "等待初次复核",
    review_time: addHours(now, -20).toISOString(),
    is_second_review: false,
  },
  {
    id: `sr2_${appId.slice(-4)}`,
    application_id: appId,
    reviewer_id: "u008",
    review_result: passed ? "pass" : "pending",
    review_opinion: passed ? "二次复核通过" : "等待二次复核",
    review_time: addHours(now, -19).toISOString(),
    is_second_review: true,
  },
];

export const mockApplications: Application[] = [
  {
    id: "app_001",
    user_id: "u001",
    archive_id: mockArchives[0].id,
    reason: "撰写学术论文需要查阅相关历史资料",
    apply_time: addHours(now, -48).toISOString(),
    expect_read_time: addDays(now, 1).toISOString(),
    status: "completed",
    approval_id: "u007",
    approval_opinion: "同意调阅",
    approval_time: addHours(now, -47).toISOString(),
    priority: "normal",
    need_secret_review: false,
    second_review_required: false,
  },
  {
    id: "app_002",
    user_id: "u001",
    archive_id: mockArchives[4].id,
    reason: "课题研究需要对比参考数据",
    apply_time: addHours(now, -24).toISOString(),
    expect_read_time: addDays(now, 2).toISOString(),
    status: "pending_approval",
    priority: "high",
    group_id: "grp_001",
    split_record: genSplitRecord("grp_001", "secret_level", "按密级拆分"),
    need_secret_review: true,
    second_review_required: false,
  },
  {
    id: "app_003",
    user_id: "u001",
    archive_id: mockArchives[5].id,
    reason: "编写年度报告需要合同执行数据",
    apply_time: addHours(now, -20).toISOString(),
    expect_read_time: addDays(now, 1).toISOString(),
    status: "dispatching",
    approval_id: "u007",
    approval_opinion: "同意",
    approval_time: addHours(now, -19).toISOString(),
    priority: "normal",
    need_secret_review: false,
    second_review_required: false,
  },
  {
    id: "app_004",
    user_id: "u001",
    archive_id: mockArchives[10].id,
    reason: "案例分析需要查阅原始档案",
    apply_time: addHours(now, -36).toISOString(),
    expect_read_time: addDays(now, 0).toISOString(),
    status: "reading",
    approval_id: "u007",
    approval_opinion: "同意",
    approval_time: addHours(now, -35).toISOString(),
    priority: "high",
    need_secret_review: true,
    second_review_required: false,
    secret_reviews: genSecretReviews("app_004", true),
  },
  {
    id: "app_005",
    user_id: "u002",
    archive_id: mockArchives[17].id,
    reason: "毕业论文相关数据采集",
    apply_time: addDays(now, -7).toISOString(),
    expect_read_time: addDays(now, -2).toISOString(),
    status: "reading",
    approval_id: "u007",
    approval_opinion: "同意，按期归还",
    approval_time: addDays(now, -6).toISOString(),
    priority: "normal",
    need_secret_review: true,
    second_review_required: true,
    secret_reviews: genSecretReviews("app_005", true),
  },
  {
    id: "app_006",
    user_id: "u001",
    archive_id: mockArchives[20].id,
    reason: "政策法规研究需要原文核对",
    apply_time: addHours(now, -8).toISOString(),
    expect_read_time: addDays(now, 3).toISOString(),
    status: "rejected",
    approval_id: "u008",
    approval_opinion: "涉及敏感内容，请提交更详细的使用说明",
    approval_time: addHours(now, -6).toISOString(),
    priority: "normal",
    need_secret_review: true,
    second_review_required: true,
    secret_reviews: genSecretReviews("app_006", false),
  },
  {
    id: "app_007",
    user_id: "u001",
    archive_id: mockArchives[22].id,
    reason: "内部审计查阅",
    apply_time: addHours(now, -2).toISOString(),
    expect_read_time: addDays(now, 1).toISOString(),
    status: "approved",
    approval_id: "u007",
    approval_opinion: "同意",
    approval_time: addHours(now, -1).toISOString(),
    priority: "urgent",
    group_id: "grp_002",
    split_record: genSplitRecord("grp_002", "approval_chain", "按审批链拆分"),
    need_secret_review: false,
    second_review_required: false,
  },
  {
    id: "app_008",
    user_id: "u001",
    archive_id: mockArchives[25].id,
    reason: "项目验收资料准备",
    apply_time: addHours(now, -1).toISOString(),
    expect_read_time: addDays(now, 2).toISOString(),
    status: "suspended",
    approval_id: "u007",
    approval_opinion: "同意，等待架位可用",
    approval_time: addHours(now, -0.5).toISOString(),
    priority: "normal",
    need_secret_review: false,
    second_review_required: false,
    suspend_reason: "架位 MJJ-1-03 盘点中",
    suspend_time: addHours(now, -0.3).toISOString(),
  },
  {
    id: "app_009",
    user_id: "u001",
    archive_id: mockArchives[30].id,
    reason: "课题中期检查",
    apply_time: addHours(now, -12).toISOString(),
    expect_read_time: addDays(now, 1).toISOString(),
    status: "cancelled",
    priority: "low",
    need_secret_review: false,
    second_review_required: false,
  },
  {
    id: "app_010",
    user_id: "u001",
    archive_id: mockArchives[35].id,
    reason: "人员背景核查",
    apply_time: addHours(now, -6).toISOString(),
    expect_read_time: addDays(now, 2).toISOString(),
    status: "pending_approval",
    priority: "urgent",
    need_secret_review: true,
    second_review_required: true,
    secret_reviews: genSecretReviews("app_010", false),
  },
];

export const mockDispatchOrders: DispatchOrder[] = [
  {
    id: "dis_001",
    application_id: "app_003",
    shelf_id: mockArchives[5].shelf_id,
    staff_id: "u003",
    dispatch_time: addHours(now, -18).toISOString(),
    outbound_time: addHours(now, -16).toISOString(),
    status: "outbound",
  },
  {
    id: "dis_002",
    application_id: "app_004",
    shelf_id: mockArchives[10].shelf_id,
    staff_id: "u003",
    dispatch_time: addHours(now, -32).toISOString(),
    outbound_time: addHours(now, -30).toISOString(),
    status: "outbound",
  },
  {
    id: "dis_003",
    application_id: "app_005",
    shelf_id: mockArchives[17].shelf_id,
    staff_id: "u004",
    dispatch_time: addDays(now, -6).toISOString(),
    outbound_time: addDays(now, -5).toISOString(),
    status: "outbound",
  },
  {
    id: "dis_004",
    application_id: "app_001",
    shelf_id: mockArchives[0].shelf_id,
    staff_id: "u003",
    dispatch_time: addHours(now, -46).toISOString(),
    outbound_time: addHours(now, -44).toISOString(),
    status: "outbound",
  },
  {
    id: "dis_005",
    application_id: "app_007",
    shelf_id: mockArchives[22].shelf_id,
    staff_id: "u004",
    dispatch_time: addHours(now, -0.5).toISOString(),
    status: "pending",
    batch_id: "batch_001",
  },
];

export const mockReadingSeats: ReadingSeat[] = [
  { id: "seat_001", seat_no: "A-01", area: "public", max_secret_level: "内部", status: "occupied", reader_id: "u006", current_application_id: "app_004" },
  { id: "seat_002", seat_no: "A-02", area: "public", max_secret_level: "内部", status: "occupied", reader_id: "u005" },
  { id: "seat_003", seat_no: "A-03", area: "public", max_secret_level: "内部", status: "available" },
  { id: "seat_004", seat_no: "A-04", area: "public", max_secret_level: "内部", status: "maintenance" },
  { id: "seat_005", seat_no: "B-01", area: "secret", max_secret_level: "秘密", status: "occupied", reader_id: "u005", current_application_id: "app_003" },
  { id: "seat_006", seat_no: "B-02", area: "secret", max_secret_level: "秘密", status: "available" },
  { id: "seat_007", seat_no: "C-01", area: "confidential", max_secret_level: "机密", status: "occupied", reader_id: "u005", current_application_id: "app_005" },
  { id: "seat_008", seat_no: "C-02", area: "confidential", max_secret_level: "绝密", status: "available" },
];

const genCheckItems = (allPassed: boolean = true): ReturnCheckItem[] => [
  { key: "pages", label: "页码完整性", passed: allPassed, expected_value: "完整无缺", actual_value: allPassed ? "完整无缺" : "缺失第15页", remark: allPassed ? "" : "需进一步核对" },
  { key: "envelope", label: "封套状态", passed: allPassed, expected_value: "完好", actual_value: allPassed ? "完好" : "封套破损", remark: allPassed ? "" : "封套有撕裂痕迹" },
  { key: "attachments", label: "附件齐全", passed: allPassed, expected_value: "2份附件", actual_value: allPassed ? "2份附件" : "缺少附件2", remark: allPassed ? "" : "对照清单缺失" },
  { key: "intact", label: "载体完好", passed: allPassed, expected_value: "无破损", actual_value: allPassed ? "无破损" : "无破损", remark: "" },
  { key: "noMark", label: "无污损", passed: allPassed, expected_value: "无涂改", actual_value: allPassed ? "无涂改" : "无涂改", remark: "" },
];

export const mockReturnRecords: ReturnRecord[] = [
  {
    id: "ret_001",
    application_id: "app_001",
    reader_id: "u005",
    receive_time: addHours(now, -42).toISOString(),
    start_read_time: addHours(now, -40).toISOString(),
    end_read_time: addHours(now, -28).toISOString(),
    return_time: addHours(now, -26).toISOString(),
    status: "returned",
    due_time: addHours(now, -10).toISOString(),
    seat_no: "A-03",
    check_items: genCheckItems(true),
  },
  {
    id: "ret_002",
    application_id: "app_003",
    reader_id: "u005",
    receive_time: addHours(now, -15).toISOString(),
    status: "received",
    due_time: addDays(now, 2).toISOString(),
    seat_no: "B-01",
  },
  {
    id: "ret_003",
    application_id: "app_004",
    reader_id: "u006",
    receive_time: addHours(now, -28).toISOString(),
    start_read_time: addHours(now, -26).toISOString(),
    status: "reading",
    due_time: addHours(now, 8).toISOString(),
    seat_no: "A-01",
  },
  {
    id: "ret_004",
    application_id: "app_005",
    reader_id: "u005",
    receive_time: addDays(now, -5).toISOString(),
    start_read_time: addDays(now, -4).toISOString(),
    status: "abnormal_check",
    due_time: addDays(now, -2).toISOString(),
    seat_no: "C-01",
    check_items: genCheckItems(false),
    abnormal_check_record_id: "abn_001",
  },
];

export const mockAbnormalChecks: AbnormalCheckRecord[] = [
  {
    id: "abn_001",
    return_record_id: "ret_004",
    check_items: genCheckItems(false).filter((i) => !i.passed),
    handler_id: "u003",
    handle_result: "pending",
    handle_opinion: "页码缺失和封套破损，正在与利用者核实情况",
  },
];

export const mockOverdueRecords: OverdueRecord[] = [
  {
    id: "ovd_001",
    user_id: "u002",
    application_id: "app_005",
    overdue_days: 2,
    record_time: addDays(now, -2).toISOString(),
    status: "active",
    preserve_approved: true,
  },
];

export const mockInventoryTasks: InventoryTask[] = [
  {
    id: "inv_001",
    shelf_id: mockShelves[2].id,
    staff_id: "u003",
    start_time: addHours(now, -3).toISOString(),
    status: "ongoing",
    remark: "季度例行盘点",
    affected_zone: "A区",
  },
  {
    id: "inv_002",
    shelf_id: mockShelves[0].id,
    staff_id: "u004",
    start_time: addDays(now, -7).toISOString(),
    end_time: addDays(now, -6).toISOString(),
    status: "completed",
    remark: "月度盘点完成",
  },
];
