import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Package,
  Search,
  ShieldCheck,
  MapPin,
  Clock,
  Archive,
  FileText,
  FolderOpen,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Pencil,
  Save,
  ArrowRight,
  ThumbsUp,
  Ban,
  UserCheck,
} from "lucide-react";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import type {
  ReturnRecord,
  ReturnCheckItem,
  AbnormalCheckRecord,
} from "@/types";

type CheckFormState = {
  pages: { passed: boolean; actual: string; remark: string };
  envelope: { passed: boolean; condition: "good" | "damaged" | "missing"; remark: string };
  attachments: { passed: boolean; missingItems: string[]; extraItems: string; remark: string };
  intact: { passed: boolean; remark: string };
  noMark: { passed: boolean; remark: string };
};

const initialCheckForm = (): CheckFormState => ({
  pages: { passed: true, actual: "", remark: "" },
  envelope: { passed: true, condition: "good", remark: "" },
  attachments: { passed: true, missingItems: [], extraItems: "", remark: "" },
  intact: { passed: true, remark: "" },
  noMark: { passed: true, remark: "" },
});

export default function ReturnConfirm() {
  const returnRecords = useStore((s) => s.returnRecords);
  const getApplicationById = useStore((s) => s.getApplicationById);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getShelfById = useStore((s) => s.getShelfById);
  const getUserById = useStore((s) => s.getUserById);
  const getAbnormalCheckById = useStore((s) => s.getAbnormalCheckById);
  const submitReturnCheck = useStore((s) => s.submitReturnCheck);
  const confirmReturn = useStore((s) => s.confirmReturn);
  const createAbnormalCheck = useStore((s) => s.createAbnormalCheck);
  const handleAbnormalCheck = useStore((s) => s.handleAbnormalCheck);
  const resolveAbnormalAndReturn = useStore((s) => s.resolveAbnormalAndReturn);
  const resolveOverdue = useStore((s) => s.resolveOverdue);
  const overdueRecords = useStore((s) => s.overdueRecords);
  const currentUser = useStore((s) => s.getCurrentUser());
  const abnormalChecks = useStore((s) => s.abnormalChecks);

  const [selected, setSelected] = useState<ReturnRecord | null>(null);
  const [checkForm, setCheckForm] = useState<CheckFormState>(initialCheckForm());
  const [showAttachments, setShowAttachments] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "abnormal">("pending");
  const [abnormalStep, setAbnormalStep] = useState<1 | 2 | 3>(1);
  const [handleOpinion, setHandleOpinion] = useState("");
  const [handleResult, setHandleResult] = useState<
    "resolved" | "pending" | "escalated"
  >("resolved");

  const list = useMemo(() => {
    const filtered = returnRecords
      .filter((r) =>
        activeTab === "pending"
          ? r.status !== "returned" && r.status !== "abnormal_check"
          : r.status === "abnormal_check"
      )
      .filter((r) => {
        if (!keyword) return true;
        const app = getApplicationById(r.application_id);
        const arc = app ? getArchiveById(app.archive_id) : undefined;
        const applicant = app ? getUserById(app.user_id) : undefined;
        const k = keyword.toLowerCase();
        return (
          arc?.title.toLowerCase().includes(k) ||
          arc?.code.toLowerCase().includes(k) ||
          applicant?.name.toLowerCase().includes(k)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.receive_time).getTime() - new Date(a.receive_time).getTime()
      );
    return filtered;
  }, [
    returnRecords,
    keyword,
    activeTab,
    getApplicationById,
    getArchiveById,
    getUserById,
  ]);

  const pendingCount = returnRecords.filter(
    (r) => r.status !== "returned" && r.status !== "abnormal_check"
  ).length;
  const abnormalCount = returnRecords.filter(
    (r) => r.status === "abnormal_check"
  ).length;

  const openReturnCheck = (r: ReturnRecord) => {
    setSelected(r);
    setCheckForm(initialCheckForm());
    setShowAttachments(false);
    setAbnormalStep(1);
    setHandleOpinion("");
    setHandleResult("resolved");
  };

  const buildCheckItems = (): ReturnCheckItem[] => {
    const app = selected ? getApplicationById(selected.application_id) : null;
    const arc = app ? getArchiveById(app.archive_id) : null;
    const physical = arc?.physical;

    const items: ReturnCheckItem[] = [
      {
        key: "pages",
        label: "页码核对",
        passed: checkForm.pages.passed,
        expected_value: physical?.total_pages.toString(),
        actual_value: checkForm.pages.actual || physical?.total_pages.toString(),
        remark: checkForm.pages.remark,
      },
      {
        key: "envelope",
        label: "封套状态",
        passed: checkForm.envelope.passed,
        expected_value:
          physical?.envelope_condition === "damaged"
            ? "已破损（调出前）"
            : physical?.envelope_condition === "missing"
            ? "缺失（调出前）"
            : "完好",
        actual_value:
          checkForm.envelope.condition === "damaged"
            ? "破损"
            : checkForm.envelope.condition === "missing"
            ? "缺失"
            : "完好",
        remark: checkForm.envelope.remark,
      },
      {
        key: "attachments",
        label: "附件清单",
        passed: checkForm.attachments.passed,
        expected_value: `${physical?.attachment_count || 0}个: ${physical?.attachments.join("、") || "无"}`,
        actual_value:
          checkForm.attachments.missingItems.length > 0 || checkForm.attachments.extraItems
            ? `缺失: ${checkForm.attachments.missingItems.join("、") || "无"}；多出: ${checkForm.attachments.extraItems || "无"}`
            : `共 ${physical?.attachment_count || 0} 个，核对一致`,
        remark: checkForm.attachments.remark,
      },
      {
        key: "intact",
        label: "载体完好度",
        passed: checkForm.intact.passed,
        actual_value: checkForm.intact.passed ? "载体完好无损" : "存在破损/褶皱/污渍",
        remark: checkForm.intact.remark,
      },
      {
        key: "noMark",
        label: "污损/涂改检查",
        passed: checkForm.noMark.passed,
        actual_value: checkForm.noMark.passed ? "无污损涂改痕迹" : "发现涂改/勾划/批注痕迹",
        remark: checkForm.noMark.remark,
      },
    ];
    return items;
  };

  const handleSubmitCheck = () => {
    if (!selected) return;
    const items = buildCheckItems();
    const res = submitReturnCheck(selected.id, items);

    if (res.hasAbnormal) {
      showToast(
        "检查发现异常项，请填写异常核对记录，档案将进入异常核对流程",
        "warning"
      );
      setAbnormalStep(2);
    } else {
      // 无异常，直接归还
      doConfirmReturn(selected.id);
    }
  };

  const doConfirmReturn = (returnId: string) => {
    confirmReturn(returnId);
    const rec = returnRecords.find((r) => r.id === returnId);
    if (rec) {
      const od = overdueRecords.find(
        (o) => o.application_id === rec.application_id && o.status === "active"
      );
      if (od) {
        resolveOverdue(od.id);
        showToast("归还确认成功，逾期已解除，用户权限恢复，档案已归档", "success");
      } else {
        showToast("归还确认成功，档案已归档", "success");
      }
    } else {
      showToast("归还确认成功，档案已归档", "success");
    }
    setSelected(null);
  };

  const handleCreateAbnormal = () => {
    if (!selected) return;
    const items = buildCheckItems();
    const abnormalItems = items.filter((i) => !i.passed);
    if (abnormalItems.length === 0) {
      showToast("未检测到异常项，可直接归还", "warning");
      return;
    }
    createAbnormalCheck(
      selected.id,
      currentUser?.id || "u003",
      abnormalItems,
      "异常核对创建，等待处理"
    );
    showToast("异常核对单已创建，请填写处理意见", "success");
    setAbnormalStep(3);
  };

  const handleResolveAbnormal = () => {
    if (!selected || !handleOpinion.trim()) {
      showToast("请填写处理意见", "warning");
      return;
    }
    const abnormal = abnormalChecks.find(
      (c) => c.return_record_id === selected.id
    );
    if (!abnormal) {
      showToast("异常核对记录不存在", "error");
      return;
    }
    if (handleResult === "resolved") {
      resolveAbnormalAndReturn(
        selected.id,
        abnormal.id,
        handleOpinion.trim()
      );
      const od = overdueRecords.find(
        (o) => o.application_id === selected.application_id && o.status === "active"
      );
      if (od) resolveOverdue(od.id);
      showToast("异常已解决，档案已完成归还归档", "success");
    } else {
      handleAbnormalCheck(abnormal.id, handleResult, handleOpinion.trim());
      showToast(
        handleResult === "escalated"
          ? "已提交升级处理，请联系上级主管"
          : "处理意见已记录，可稍后继续处理",
        handleResult === "escalated" ? "warning" : "info"
      );
    }
    setSelected(null);
  };

  const openExistingAbnormal = (r: ReturnRecord) => {
    setSelected(r);
    setAbnormalStep(3);
    setHandleOpinion("");
    setHandleResult("resolved");
  };

  return (
    <div className="space-y-5 max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            归还确认
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            五维完整性检查 · 异常核对闭环 · 待归还 {pendingCount} 份 · 异常核对中 {abnormalCount} 份
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === "pending"
                  ? "bg-white text-archive-navy-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              待归还
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "pending"
                    ? "bg-archive-navy-100 text-archive-navy-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("abnormal")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === "abnormal"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              异常核对中
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === "abnormal"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {abnormalCount}
              </span>
            </button>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="搜索档案/利用者..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[720px] overflow-y-auto">
          {list.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Archive className="w-14 h-14 mx-auto text-slate-300 mb-3" />
              <div className="text-slate-400">
                {activeTab === "pending" ? "暂无待归还档案" : "暂无异常核对中的档案"}
              </div>
            </div>
          )}
          {list.map((r) => {
            const app = getApplicationById(r.application_id);
            const arc = app ? getArchiveById(app.archive_id) : undefined;
            const shelf = arc ? getShelfById(arc.shelf_id) : undefined;
            const applicant = app ? getUserById(app.user_id) : undefined;
            const isOverdue = r.due_time && new Date() > new Date(r.due_time);
            const od = overdueRecords.find(
              (o) => o.application_id === r.application_id && o.status === "active"
            );
            const abnormal = abnormalChecks.find((c) => c.return_record_id === r.id);
            return (
              <div
                key={r.id}
                className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                  isOverdue
                    ? "border-red-300 bg-gradient-to-br from-white to-red-50/40"
                    : r.status === "abnormal_check"
                    ? "border-amber-300 bg-gradient-to-br from-amber-50/40 to-white"
                    : "border-slate-200 hover:border-emerald-300"
                }`}
              >
                {isOverdue && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-red-100 border border-red-200 text-xs text-red-700 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    已逾期 {od?.overdue_days || 0} 天
                    {od?.preserve_approved && (
                      <span className="ml-auto text-[10px] text-red-600/80 bg-red-50 px-1.5 py-0.5 rounded">
                        已保留批准单据
                      </span>
                    )}
                  </div>
                )}
                {r.status === "abnormal_check" && abnormal && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-200 text-xs text-amber-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    异常核对中 · {abnormal.check_items.filter((i) => !i.passed).length} 项待处理
                    <span className="ml-auto text-[10px] text-amber-700/80 bg-amber-50 px-1.5 py-0.5 rounded">
                      {abnormal.handle_result === "escalated" ? "已升级" : abnormal.handle_result === "pending" ? "待处理" : "处理中"}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{arc?.title}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-slate-400 font-mono">{arc?.code}</span>
                      {arc && <StatusBadge kind="level" value={arc.level} />}
                    </div>
                  </div>
                  <StatusBadge kind="return" value={r.status} pulse />
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>归档架位：{shelf?.code} · {arc?.layer}层{arc?.cell}格</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>利用者：{applicant?.name} · {applicant?.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      物理信息：{arc?.physical.total_pages}页 · {arc?.physical.attachment_count}附件 · 
                      封套{arc?.physical.envelope_condition === "damaged" ? "破损" : arc?.physical.envelope_condition === "missing" ? "缺失" : "完好"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>接收：{formatRelativeTime(r.receive_time)}</span>
                  </div>
                  {r.start_read_time && r.end_read_time && (
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        阅览时长：
                        {Math.round(
                          (new Date(r.end_read_time).getTime() -
                            new Date(r.start_read_time).getTime()) /
                            60000
                        )}{" "}
                        分钟
                      </span>
                    </div>
                  )}
                  {r.seat_no && (
                    <div className="flex items-center gap-2">
                      <span>💺</span>
                      <span>阅览席位：{r.seat_no}</span>
                    </div>
                  )}
                </div>

                <button
                  className="w-full btn-primary py-2"
                  onClick={() =>
                    r.status === "abnormal_check"
                      ? openExistingAbnormal(r)
                      : openReturnCheck(r)
                  }
                >
                  {r.status === "abnormal_check" ? (
                    <>
                      <Pencil className="w-4 h-4" />
                      处理异常核对
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      五维检查与归还
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!selected && activeTab === "pending"}
        onClose={() => setSelected(null)}
        title={
          abnormalStep === 1
            ? "档案归还 · 五维完整性检查"
            : abnormalStep === 2
            ? "发现异常 · 创建异常核对单"
            : "异常核对处理"
        }
        width="max-w-3xl"
        footer={
          selected && abnormalStep === 1 ? (
            <>
              <button className="btn-secondary" onClick={() => setSelected(null)}>
                取消
              </button>
              <button className="btn-gold" onClick={handleSubmitCheck}>
                <ShieldCheck className="w-4 h-4" />
                提交检查
              </button>
            </>
          ) : selected && abnormalStep === 2 ? (
            <>
              <button className="btn-secondary" onClick={() => setAbnormalStep(1)}>
                返回修改
              </button>
              <button className="btn-primary" onClick={handleCreateAbnormal}>
                <Save className="w-4 h-4" />
                创建异常核对单
              </button>
            </>
          ) : selected && abnormalStep === 3 ? (
            <>
              <button className="btn-secondary" onClick={() => setSelected(null)}>
                稍后处理
              </button>
              <button
                className="btn-success"
                onClick={handleResolveAbnormal}
                disabled={!handleOpinion.trim()}
              >
                {handleResult === "resolved" ? (
                  <>
                    <ThumbsUp className="w-4 h-4" />
                    解决并完成归还
                  </>
                ) : handleResult === "pending" ? (
                  <>
                    <Save className="w-4 h-4" />
                    保存处理意见
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    提交升级处理
                  </>
                )}
              </button>
            </>
          ) : undefined
        }
      >
        {selected && (() => {
          const app = getApplicationById(selected.application_id);
          const arc = app ? getArchiveById(app.archive_id) : undefined;
          const shelf = arc ? getShelfById(arc.shelf_id) : undefined;
          const applicant = app ? getUserById(app.user_id) : undefined;
          const physical = arc?.physical;
          const existingAbnormal = abnormalChecks.find(
            (c) => c.return_record_id === selected.id
          );
          const abnItems = existingAbnormal?.check_items || [];
          const hasAbnormal = abnItems.some((i) => !i.passed);

          const updateCheck = <K extends keyof CheckFormState>(
            key: K,
            patch: Partial<CheckFormState[K]>
          ) => {
            setCheckForm((prev) => ({
              ...prev,
              [key]: { ...prev[key], ...patch },
            }));
          };

          return (
            <div className="space-y-5">
              {(abnormalStep === 1 || (!hasAbnormal && abnormalStep < 3)) && (
                <div className="p-4 rounded-xl bg-archive-navy-50/60 border border-archive-navy-100">
                  <div className="text-xs text-slate-500 mb-1">档案信息</div>
                  <div className="font-serif text-lg font-semibold text-archive-navy-700">
                    {arc?.title}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                    <span className="text-slate-500 font-mono">{arc?.code}</span>
                    {arc && <StatusBadge kind="level" value={arc.level} />}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {shelf?.location} · {shelf?.code} · {arc?.layer}层{arc?.cell}格
                    </div>
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      利用者：{applicant?.name}
                    </div>
                  </div>
                </div>
              )}

              {abnormalStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-archive-navy-600" />
                    <h3 className="font-semibold text-slate-800">
                      五维完整性检查清单
                    </h3>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-emerald-100 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-slate-800">1. 页码数量核对</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checkForm.pages.passed}
                          onChange={(e) =>
                            updateCheck("pages", { passed: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span
                          className={`text-sm font-medium ${
                            checkForm.pages.passed
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {checkForm.pages.passed ? "一致" : "不一致"}
                        </span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">调出时页码</div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-700">
                          {physical?.total_pages} 页
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">归还时页码（必填如不一致）</div>
                        <input
                          type="number"
                          className={`input text-sm ${
                            !checkForm.pages.passed
                              ? "border-red-300 bg-red-50"
                              : ""
                          }`}
                          placeholder="填写实际归还页码"
                          value={checkForm.pages.actual}
                          onChange={(e) =>
                            updateCheck("pages", { actual: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    {!checkForm.pages.passed && (
                      <div className="mt-3">
                        <input
                          className="input text-sm w-full"
                          placeholder="请说明页码差异原因（缺页/多页/重页等）"
                          value={checkForm.pages.remark}
                          onChange={(e) =>
                            updateCheck("pages", { remark: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border-2 border-violet-100 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-violet-600" />
                        <span className="font-medium text-slate-800">2. 封套状态检查</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checkForm.envelope.passed}
                          onChange={(e) =>
                            updateCheck("envelope", { passed: e.target.checked })
                          }
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span
                          className={`text-sm font-medium ${
                            checkForm.envelope.passed
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {checkForm.envelope.passed ? "正常" : "异常"}
                        </span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">调出时状态</div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                          {physical?.envelope_condition === "damaged"
                            ? "已破损（调出前标记）"
                            : physical?.envelope_condition === "missing"
                            ? "缺失（调出前标记）"
                            : physical?.has_envelope
                            ? "完好 ✓"
                            : "无封套"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">归还时状态</div>
                        <select
                          className={`input text-sm ${
                            !checkForm.envelope.passed
                              ? "border-red-300 bg-red-50"
                              : ""
                          }`}
                          value={checkForm.envelope.condition}
                          onChange={(e) =>
                            updateCheck("envelope", {
                              condition: e.target.value as "good" | "damaged" | "missing",
                            })
                          }
                        >
                          <option value="good">完好</option>
                          <option value="damaged">破损</option>
                          <option value="missing">缺失</option>
                        </select>
                      </div>
                    </div>
                    {!checkForm.envelope.passed && (
                      <div className="mt-3">
                        <input
                          className="input text-sm w-full"
                          placeholder="请说明封套异常情况"
                          value={checkForm.envelope.remark}
                          onChange={(e) =>
                            updateCheck("envelope", { remark: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border-2 border-amber-100 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-slate-800">
                          3. 附件清单核对
                          <span className="ml-2 text-xs text-slate-400">
                            共 {physical?.attachment_count || 0} 个附件
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          className="text-xs text-archive-navy-600 hover:underline flex items-center gap-1"
                          onClick={() => setShowAttachments((s) => !s)}
                        >
                          {showAttachments ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              收起清单
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              展开清单
                            </>
                          )}
                        </button>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checkForm.attachments.passed}
                            onChange={(e) =>
                              updateCheck("attachments", { passed: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-slate-300"
                          />
                          <span
                            className={`text-sm font-medium ${
                              checkForm.attachments.passed
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {checkForm.attachments.passed ? "完整" : "异常"}
                          </span>
                        </label>
                      </div>
                    </div>

                    {showAttachments && (
                      <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200 max-h-40 overflow-y-auto">
                        {physical?.attachments.length === 0 ? (
                          <div className="text-xs text-slate-400 text-center py-3">
                            该档案无附件
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {physical?.attachments.map((att, idx) => {
                              const missing =
                                checkForm.attachments.missingItems.includes(att);
                              return (
                                <label
                                  key={idx}
                                  className={`flex items-center gap-2 p-2 rounded-md text-xs cursor-pointer transition ${
                                    missing
                                      ? "bg-red-50 border border-red-200"
                                      : "bg-white border border-slate-200 hover:border-emerald-200"
                                  }`}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      updateCheck("attachments", {
                                        missingItems: missing
                                          ? checkForm.attachments.missingItems.filter(
                                              (x) => x !== att
                                            )
                                          : [
                                              ...checkForm.attachments.missingItems,
                                              att,
                                            ],
                                      });
                                    }}
                                    className={
                                      missing
                                        ? "text-red-500"
                                        : "text-emerald-500"
                                    }
                                  >
                                    {missing ? (
                                      <Square className="w-3.5 h-3.5" />
                                    ) : (
                                      <CheckSquare className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <span
                                    className={
                                      missing ? "text-red-700 line-through" : "text-slate-700"
                                    }
                                  >
                                    {att}
                                  </span>
                                  {missing && (
                                    <span className="ml-auto text-[10px] text-red-600 font-medium bg-red-100 px-1.5 py-0.5 rounded">
                                      标记缺失
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {!checkForm.attachments.passed && (
                      <div className="space-y-2">
                        {checkForm.attachments.missingItems.length > 0 && (
                          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            已标记缺失附件：
                            <strong className="ml-1">
                              {checkForm.attachments.missingItems.join("、")}
                            </strong>
                          </div>
                        )}
                        <input
                          className="input text-sm w-full"
                          placeholder="如有多出附件请在此描述，或补充其他附件异常"
                          value={checkForm.attachments.extraItems}
                          onChange={(e) =>
                            updateCheck("attachments", { extraItems: e.target.value })
                          }
                        />
                        <input
                          className="input text-sm w-full"
                          placeholder="附件异常说明"
                          value={checkForm.attachments.remark}
                          onChange={(e) =>
                            updateCheck("attachments", { remark: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border-2 border-sky-100 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-sky-600" />
                          <span className="font-medium text-slate-800">
                            4. 载体完好度
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checkForm.intact.passed}
                            onChange={(e) =>
                              updateCheck("intact", { passed: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-slate-300"
                          />
                          <span
                            className={`text-sm font-medium ${
                              checkForm.intact.passed
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {checkForm.intact.passed ? "完好" : "异常"}
                          </span>
                        </label>
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        检查纸张/磁带/光盘等载体有无破损、褶皱、污渍、霉变、水渍等
                      </div>
                      {!checkForm.intact.passed && (
                        <input
                          className="input text-sm w-full mt-2"
                          placeholder="请描述载体异常情况"
                          value={checkForm.intact.remark}
                          onChange={(e) =>
                            updateCheck("intact", { remark: e.target.value })
                          }
                        />
                      )}
                    </div>

                    <div className="p-4 rounded-xl border-2 border-rose-100 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Ban className="w-4 h-4 text-rose-600" />
                          <span className="font-medium text-slate-800">
                            5. 污损/涂改检查
                          </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checkForm.noMark.passed}
                            onChange={(e) =>
                              updateCheck("noMark", { passed: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-slate-300"
                          />
                          <span
                            className={`text-sm font-medium ${
                              checkForm.noMark.passed
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {checkForm.noMark.passed ? "正常" : "异常"}
                          </span>
                        </label>
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        检查有无涂改、勾划、批注、指印、污痕等人为痕迹
                      </div>
                      {!checkForm.noMark.passed && (
                        <input
                          className="input text-sm w-full mt-2"
                          placeholder="请描述污损/涂改位置和内容"
                          value={checkForm.noMark.remark}
                          onChange={(e) =>
                            updateCheck("noMark", { remark: e.target.value })
                          }
                        />
                      )}
                    </div>
                  </div>

                  {Object.values(checkForm).some((v) => !v.passed) && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-red-50 border border-amber-200 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-900">
                        <div className="font-semibold mb-1">检测到异常项</div>
                        <div className="text-amber-800/90">
                          以下检查项存在异常，提交后将进入
                          <strong className="mx-1">异常核对流程</strong>
                          ，需填写处理意见后方可完成归还：
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {!checkForm.pages.passed && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              页码异常
                            </span>
                          )}
                          {!checkForm.envelope.passed && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              封套异常
                            </span>
                          )}
                          {!checkForm.attachments.passed && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              附件异常
                            </span>
                          )}
                          {!checkForm.intact.passed && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              载体异常
                            </span>
                          )}
                          {!checkForm.noMark.passed && (
                            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                              污损涂改
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {abnormalStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-900">
                        检查未通过，存在 {buildCheckItems().filter((i) => !i.passed).length} 项异常
                      </div>
                      <div className="text-sm text-red-800/90 mt-1">
                        系统将创建异常核对单，请与利用者确认后填写处理意见，完成闭环后方可归档
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-medium text-slate-700 text-sm">
                      异常项明细
                    </div>
                    <div className="divide-y divide-slate-100">
                      {buildCheckItems()
                        .filter((i) => !i.passed)
                        .map((item) => (
                          <div key={item.key} className="px-4 py-3 bg-red-50/40">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="font-medium text-red-900 text-sm">
                                  {item.label}
                                </span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                异常
                              </span>
                            </div>
                            <div className="ml-6 text-xs text-slate-600 space-y-0.5">
                              <div>
                                <span className="text-slate-500">期望值：</span>
                                {item.expected_value || "—"}
                              </div>
                              <div>
                                <span className="text-slate-500">实际值：</span>
                                <span className="text-red-700 font-medium">
                                  {item.actual_value || "—"}
                                </span>
                              </div>
                              {item.remark && (
                                <div>
                                  <span className="text-slate-500">备注：</span>
                                  {item.remark}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {abnormalStep === 3 && (
                <div className="space-y-4">
                  {existingAbnormal && hasAbnormal && (
                    <div className="border border-amber-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                        <div className="font-medium text-amber-900 text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          异常核对单 #{existingAbnormal.id.slice(-6)} · {abnItems.filter((i) => !i.passed).length} 项待处理
                        </div>
                        <StatusBadge
                          kind="shelf"
                          value={
                            existingAbnormal.handle_result === "resolved"
                              ? "normal"
                              : existingAbnormal.handle_result === "escalated"
                              ? "locked"
                              : "inventory"
                          }
                        />
                      </div>
                      <div className="divide-y divide-slate-100">
                        {abnItems
                          .filter((i) => !i.passed)
                          .map((item) => (
                            <div key={item.key} className="px-4 py-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  <span className="font-medium text-slate-800 text-sm">
                                    {item.label}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-6 text-xs text-slate-600 space-y-0.5">
                                <div>
                                  <span className="text-slate-500">期望值：</span>
                                  {item.expected_value || "—"}
                                </div>
                                <div>
                                  <span className="text-slate-500">实际值：</span>
                                  <span className="text-red-700 font-medium">
                                    {item.actual_value || "—"}
                                  </span>
                                </div>
                                {item.remark && (
                                  <div>
                                    <span className="text-slate-500">差异说明：</span>
                                    {item.remark}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                      {existingAbnormal.handle_opinion && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">已有处理意见：</div>
                          <div className="text-sm text-slate-700">
                            {existingAbnormal.handle_opinion}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-slate-700">处理结果选择</div>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        {
                          value: "resolved",
                          label: "已解决",
                          desc: "异常已处理，可完成归还",
                          icon: ThumbsUp,
                          color: "emerald",
                        },
                        {
                          value: "pending",
                          label: "待跟进",
                          desc: "保存意见，稍后处理",
                          icon: Save,
                          color: "blue",
                        },
                        {
                          value: "escalated",
                          label: "升级处理",
                          desc: "提交上级主管介入",
                          icon: ArrowRight,
                          color: "orange",
                        },
                      ] as const).map((opt) => (
                        <label
                          key={opt.value}
                          className={`cursor-pointer rounded-xl border-2 p-3 transition ${
                            handleResult === opt.value
                              ? `border-${opt.color}-400 bg-${opt.color}-50`
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                          style={{
                            borderColor:
                              handleResult === opt.value
                                ? opt.color === "emerald"
                                  ? "#34d399"
                                  : opt.color === "blue"
                                  ? "#60a5fa"
                                  : "#fb923c"
                                : undefined,
                            backgroundColor:
                              handleResult === opt.value
                                ? opt.color === "emerald"
                                  ? "#ecfdf5"
                                  : opt.color === "blue"
                                  ? "#eff6ff"
                                  : "#fff7ed"
                                : undefined,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <opt.icon
                              className={`w-4 h-4 ${
                                handleResult === opt.value
                                  ? opt.color === "emerald"
                                    ? "text-emerald-600"
                                    : opt.color === "blue"
                                    ? "text-blue-600"
                                    : "text-orange-600"
                                  : "text-slate-400"
                              }`}
                            />
                            <span className="text-sm font-semibold text-slate-800">
                              {opt.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 ml-6">
                            {opt.desc}
                          </div>
                          <input
                            type="radio"
                            name="handleResult"
                            checked={handleResult === opt.value}
                            onChange={() => setHandleResult(opt.value)}
                            className="hidden"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="input-label">
                      处理意见 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="input min-h-[110px] resize-y"
                      placeholder={
                        handleResult === "resolved"
                          ? "请描述异常处理经过、利用者确认情况、最终处理方案等..."
                          : handleResult === "escalated"
                          ? "请说明升级原因、需上级主管介入处理的具体事项..."
                          : "请记录当前处理进展、后续跟进计划..."
                      }
                      value={handleOpinion}
                      onChange={(e) => setHandleOpinion(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
