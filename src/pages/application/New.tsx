import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  Check,
  AlertTriangle,
  FileArchive,
  Layers,
  ShieldCheck,
  Users,
  Building2,
  ChevronRight,
  Info,
  Zap,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, addDays } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import { isSecretLevel, needsSecondReview, SECRET_LEVEL_RANK } from "@/types";
import type { Archive, ArchiveLevel, ApplicationPriority } from "@/types";
import { splitBatchApplication, getPriorityRank } from "@/utils/businessRules";
import Modal from "@/components/ui/Modal";

const levels: (ArchiveLevel | "全部")[] = ["全部", "公开", "内部", "秘密", "机密", "绝密"];

const priorities: { value: ApplicationPriority; label: string; desc: string; color: string }[] = [
  { value: "low", label: "低优先级", desc: "普通调阅需求，按常规顺序处理", color: "text-slate-600 bg-slate-50 border-slate-200" },
  { value: "normal", label: "普通", desc: "标准优先级处理", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "high", label: "高优先级", desc: "重要事项，优先处理", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { value: "urgent", label: "特急", desc: "紧急事项，立即处理", color: "text-red-600 bg-red-50 border-red-200" },
];

export default function ApplicationNew() {
  const navigate = useNavigate();
  const searchArchives = useStore((s) => s.searchArchives);
  const createBatchApplication = useStore((s) => s.createBatchApplication);
  const currentUser = useStore((s) => s.getCurrentUser());
  const getShelfById = useStore((s) => s.getShelfById);
  const shelves = useStore((s) => s.shelves);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedArchives, setSelectedArchives] = useState<Archive[]>([]);
  const [priority, setPriority] = useState<ApplicationPriority>("normal");
  const [reason, setReason] = useState("");
  const [expectReadTime, setExpectReadTime] = useState(
    formatDate(addDays(new Date(), 1), "YYYY-MM-DDTHH:mm")
  );
  const [keyword, setKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState<ArchiveLevel | "全部">("全部");
  const [showSplitPreview, setShowSplitPreview] = useState(false);

  const archives = useMemo(() => {
    const lv = levelFilter === "全部" ? undefined : levelFilter;
    return searchArchives(keyword, lv)
      .filter((a) => a.status === "in_shelf")
      .slice(0, 50);
  }, [searchArchives, keyword, levelFilter]);

  const splitPreview = useMemo(() => {
    if (selectedArchives.length === 0) return null;
    return splitBatchApplication(selectedArchives, priority);
  }, [selectedArchives, priority]);

  const toggleArchive = (arc: Archive) => {
    setSelectedArchives((prev) => {
      const exists = prev.find((a) => a.id === arc.id);
      if (exists) {
        return prev.filter((a) => a.id !== arc.id);
      }
      return [...prev, arc];
    });
  };

  const selectAllVisible = () => {
    if (selectedArchives.length === archives.length) {
      setSelectedArchives([]);
    } else {
      setSelectedArchives(archives);
    }
  };

  const getApprovalChainDesc = (level: ArchiveLevel) => {
    if (!isSecretLevel(level)) return "自动批准（非涉密）";
    if (level === "秘密") return "部门负责人审批 → 档案科复核（2级）";
    if (level === "机密") return "部门负责人 → 保密办 → 涉密复核（3级，含二次复核）";
    return "部门负责人 → 保密办 → 分管领导 → 双重涉密复核（4级）";
  };

  const getSeatAreaDesc = (level: ArchiveLevel) => {
    if (level === "公开" || level === "内部") return "公开阅览区";
    if (level === "秘密") return "涉密阅览区";
    return "核心涉密阅览区（独立席位）";
  };

  const submit = () => {
    if (selectedArchives.length === 0 || !reason.trim() || !expectReadTime) return;
    const res = createBatchApplication({
      user_id: currentUser?.id || "u001",
      archive_ids: selectedArchives.map((a) => a.id),
      reason: reason.trim(),
      expect_read_time: new Date(expectReadTime).toISOString(),
      priority,
    });
    if (res.success) {
      const hasSecret = selectedArchives.some((a) => isSecretLevel(a.level));
      const splitInfo =
        splitPreview && splitPreview.groups.length > 1
          ? `，已按密级/审批链/席位拆分为 ${splitPreview.groups.length} 个任务`
          : "";
      showToast(
        res.message +
          splitInfo +
          (hasSecret ? "，涉密档案请等待审批人员审批" : "，可等待库房派单"),
        "success"
      );
      navigate("/application");
    } else {
      showToast(res.message, "error");
    }
  };

  const stats = useMemo(() => {
    if (selectedArchives.length === 0) return null;
    const byLevel = new Map<ArchiveLevel, number>();
    selectedArchives.forEach((a) => {
      byLevel.set(a.level, (byLevel.get(a.level) || 0) + 1);
    });
    const needReview = selectedArchives.filter((a) => isSecretLevel(a.level)).length;
    const needSecond = selectedArchives.filter((a) => needsSecondReview(a.level)).length;
    return { byLevel, needReview, needSecond };
  }, [selectedArchives]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          className="btn-ghost"
          onClick={() => navigate("/application")}
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-archive-navy-700 mb-1">
              提交调阅申请
            </h1>
            <p className="text-sm text-slate-500">
              支持批量选择档案，系统将按密级、审批链和阅览席位自动拆分调卷任务
            </p>
          </div>
          {selectedArchives.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded-full bg-archive-navy-100 text-archive-navy-700 font-medium">
                已选 <strong>{selectedArchives.length}</strong> 份档案
              </span>
              {splitPreview && splitPreview.groups.length > 1 && (
                <button
                  className="btn-secondary text-xs py-1.5"
                  onClick={() => setShowSplitPreview(true)}
                >
                  <Layers className="w-3.5 h-3.5" />
                  拆分预览
                </button>
              )}
            </div>
          )}
        </div>

        <div className="my-8 flex items-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step >= s
                    ? "bg-gradient-to-br from-archive-navy-500 to-archive-gold-500 text-white shadow-lg"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              <div>
                <div
                  className={`text-sm font-medium ${
                    step >= s ? "text-archive-navy-700" : "text-slate-400"
                  }`}
                >
                  {s === 1 ? "选择档案（可多选）" : s === 2 ? "填写信息与优先级" : "确认拆分与提交"}
                </div>
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 rounded-full ${
                    step > s ? "bg-archive-navy-400" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="搜索档案标题、编码..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <select
                className="input w-36"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as ArchiveLevel | "全部")}
              >
                {levels.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <button className="btn-secondary text-sm" onClick={selectAllVisible}>
                {selectedArchives.length === archives.length ? "取消全选" : "全选当前页"}
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="table-th w-14"></th>
                    <th className="table-th">档案编码</th>
                    <th className="table-th">题名</th>
                    <th className="table-th">分类</th>
                    <th className="table-th">密级</th>
                    <th className="table-th">架位</th>
                    <th className="table-th">页码</th>
                    <th className="table-th">附件</th>
                    <th className="table-th">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {archives.map((a) => {
                    const shelf = getShelfById(a.shelf_id);
                    const checked = selectedArchives.some((x) => x.id === a.id);
                    const isInventory = shelf?.status === "inventory";
                    return (
                      <tr
                        key={a.id}
                        onClick={() => !isInventory && toggleArchive(a)}
                        className={`table-tr-hover ${
                          checked ? "bg-archive-navy-50" : ""
                        } ${isInventory ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <td className="table-td">
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                              checked
                                ? "bg-archive-navy-500 border-archive-navy-500"
                                : "border-slate-300"
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </td>
                        <td className="table-td font-mono text-xs">{a.code}</td>
                        <td className="table-td font-medium max-w-[260px] truncate">{a.title}</td>
                        <td className="table-td text-slate-500 text-xs">{a.category}</td>
                        <td className="table-td"><StatusBadge kind="level" value={a.level} /></td>
                        <td className="table-td text-slate-500 text-xs">
                          {shelf?.code} · {a.layer}层{a.cell}格
                          {isInventory && (
                            <span className="ml-1 text-amber-600">（盘点中）</span>
                          )}
                        </td>
                        <td className="table-td text-slate-500 text-xs">{a.physical.total_pages}页</td>
                        <td className="table-td text-slate-500 text-xs">{a.physical.attachment_count}个</td>
                        <td className="table-td"><StatusBadge kind="archive" value={a.status} /></td>
                      </tr>
                    );
                  })}
                  {archives.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <FileArchive className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <div className="text-slate-400 text-sm">未找到匹配档案</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center">
              {selectedArchives.length > 0 && stats && (
                <div className="flex flex-wrap gap-3 text-xs">
                  {Array.from(stats.byLevel.entries()).map(([lv, cnt]) => (
                    <span key={lv} className="flex items-center gap-1">
                      <StatusBadge kind="level" value={lv} />
                      <span className="text-slate-500">×{cnt}</span>
                    </span>
                  ))}
                  {stats.needReview > 0 && (
                    <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {stats.needReview} 份需涉密复核
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  disabled={selectedArchives.length === 0}
                  onClick={() => setStep(2)}
                >
                  下一步
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-lg bg-archive-navy-50/60 border border-archive-navy-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-500">已选档案（{selectedArchives.length} 份）</div>
                <button className="text-xs text-archive-navy-600 hover:underline" onClick={() => setStep(1)}>
                  重新选择
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                {selectedArchives.map((a) => (
                  <div key={a.id} className="bg-white rounded-md p-2 border border-slate-200 text-xs">
                    <div className="font-medium text-slate-700 truncate">{a.title}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-slate-400 font-mono">{a.code}</span>
                      <StatusBadge kind="level" value={a.level} />
                    </div>
                  </div>
                ))}
              </div>
              {splitPreview && splitPreview.groups.length > 1 && (
                <div className="mt-3 p-3 rounded-md bg-white border border-archive-navy-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-archive-navy-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600">
                    检测到所选档案存在密级或审批链差异，提交后将自动拆分为
                    <strong className="text-archive-navy-700 mx-1">{splitPreview.groups.length}</strong>
                    个调卷任务。每组将独立流转审批、派单和阅览。
                    <button
                      className="ml-2 text-archive-navy-600 hover:underline font-medium"
                      onClick={() => setShowSplitPreview(true)}
                    >
                      查看拆分详情 →
                    </button>
                  </div>
                </div>
              )}
              {splitPreview?.warnings && splitPreview.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {splitPreview.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      ⚠️ {w}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="input-label">任务优先级</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {priorities.map((p) => {
                  const active = priority === p.value;
                  return (
                    <label
                      key={p.value}
                      className={`cursor-pointer rounded-xl border-2 p-3 transition ${
                        active
                          ? "border-archive-navy-500 bg-archive-navy-50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            active ? "border-archive-navy-500" : "border-slate-300"
                          }`}
                        >
                          {active && <div className="w-2 h-2 rounded-full bg-archive-navy-500" />}
                        </div>
                        <span className={`text-sm font-semibold ${p.color.split(" ")[0]}`}>
                          {p.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1.5 pl-6">{p.desc}</div>
                      <input
                        type="radio"
                        name="priority"
                        className="hidden"
                        checked={active}
                        onChange={() => setPriority(p.value)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="input-label">调阅事由 <span className="text-red-500">*</span></label>
              <textarea
                className="input min-h-[120px] resize-y"
                placeholder="请详细描述调阅档案的目的和使用范围..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="text-xs text-slate-400 mt-1">
                事由将用于审批审核，请如实填写，将应用于所有已选档案
              </div>
            </div>

            <div>
              <label className="input-label">预约阅览时间 <span className="text-red-500">*</span></label>
              <input
                type="datetime-local"
                className="input"
                value={expectReadTime}
                onChange={(e) => setExpectReadTime(e.target.value)}
                min={formatDate(new Date(), "YYYY-MM-DDTHH:mm")}
              />
              <div className="text-xs text-slate-400 mt-1">
                档案归还期限默认为阅览时间起 3 个工作日
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                上一步
              </button>
              <button
                className="btn-primary"
                disabled={!reason.trim() || !expectReadTime}
                onClick={() => setStep(3)}
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-xl border border-archive-navy-100 overflow-hidden">
              <div className="bg-gradient-to-r from-archive-navy-500 to-archive-navy-600 px-5 py-3 text-white">
                <div className="text-white/80 text-xs">申请确认</div>
                <div className="font-serif text-lg font-semibold">
                  批量调阅 · 共 {selectedArchives.length} 份档案
                </div>
              </div>
              <div className="divide-y divide-slate-100 p-5 space-y-4">
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500 flex-shrink-0">档案数量</div>
                  <div className="flex-1 font-medium">
                    <span className="text-lg text-archive-navy-700">{selectedArchives.length}</span>
                    <span className="text-sm text-slate-500 ml-1">份</span>
                  </div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500 flex-shrink-0">密级分布</div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {stats &&
                      Array.from(stats.byLevel.entries()).map(([lv, cnt]) => (
                        <span key={lv} className="flex items-center gap-1 text-sm">
                          <StatusBadge kind="level" value={lv} />
                          <span className="text-slate-600">×{cnt}</span>
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500 flex-shrink-0">任务优先级</div>
                  <div className="flex-1">
                    {(() => {
                      const p = priorities.find((x) => x.value === priority)!;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${p.color}`}>
                          <Zap className="w-3 h-3" />
                          {p.label}（综合分 {getPriorityRank(priority, selectedArchives[0]?.level || "公开")}）
                        </span>
                      );
                    })()}
                  </div>
                </div>
                {splitPreview && (
                  <div className="flex">
                    <div className="w-28 text-sm text-slate-500 flex-shrink-0">拆分任务数</div>
                    <div className="flex-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium">
                        <Layers className="w-3 h-3" />
                        {splitPreview.groups.length} 个独立任务
                      </span>
                      <button
                        className="ml-2 text-xs text-archive-navy-600 hover:underline"
                        onClick={() => setShowSplitPreview(true)}
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500 flex-shrink-0">调阅事由</div>
                  <div className="flex-1 text-slate-700 whitespace-pre-wrap">{reason}</div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500 flex-shrink-0">预约阅览</div>
                  <div className="flex-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {formatDate(expectReadTime)}
                  </div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500 flex-shrink-0">应归还时间</div>
                  <div className="flex-1 text-amber-700 font-medium">
                    {formatDate(addDays(new Date(expectReadTime), 3))}
                  </div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500 flex-shrink-0">申请人</div>
                  <div className="flex-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    {currentUser?.name} · {currentUser?.department}
                  </div>
                </div>
              </div>
            </div>

            {splitPreview && splitPreview.groups.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-600" />
                  拆分任务预览（共 {splitPreview.groups.length} 组）
                </div>
                <div className="grid gap-3">
                  {splitPreview.groups.map((g, idx) => {
                    const groupArcs = g.archiveIds
                      .map((id) => selectedArchives.find((a) => a.id === id))
                      .filter((x): x is Archive => !!x);
                    const maxLevel = groupArcs.reduce(
                      (acc, a) => (SECRET_LEVEL_RANK[a.level] > SECRET_LEVEL_RANK[acc] ? a.level : acc),
                      "公开" as ArchiveLevel
                    );
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-slate-800">
                              {g.detail}
                            </span>
                          </div>
                          <StatusBadge kind="level" value={maxLevel} />
                        </div>
                        <div className="ml-9 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {g.archiveIds.length} 份档案
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <ShieldCheck className="w-3 h-3 text-slate-400" />
                            {g.approvalChain.length} 级审批链
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Users className="w-3 h-3 text-slate-400" />
                            {g.seatArea === "public"
                              ? "公开阅览区"
                              : g.seatArea === "secret"
                              ? "涉密阅览区"
                              : "核心涉密区"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {stats && stats.needReview > 0 && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <div className="font-semibold">涉密审批提示</div>
                  <div className="mt-1">
                    本次申请包含
                    <strong className="mx-1">{stats.needReview}</strong>
                    份涉密档案（其中
                    <strong className="mx-1">{stats.needSecond}</strong>
                    份机密/绝密需二次复核），均需经审批人员审批通过后方可派出。
                    各任务审批进度可在申请列表中独立查看。
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                上一步
              </button>
              <button className="btn-gold" onClick={submit}>
                <Check className="w-4 h-4" />
                确认提交申请
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={showSplitPreview}
        onClose={() => setShowSplitPreview(false)}
        title="批量拆分规则预览"
        width="max-w-2xl"
      >
        {splitPreview && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              系统将按<strong>「密级 + 审批链 + 阅览席位区域」</strong>三维度对
              {selectedArchives.length} 份档案进行分组，确保相同流转规则的档案归入同一调卷任务。
              拆分维度说明：
            </div>
            <div className="grid gap-3">
              {splitPreview.groups.map((g, idx) => {
                const groupArcs = g.archiveIds
                  .map((id) => selectedArchives.find((a) => a.id === id))
                  .filter((x): x is Archive => !!x);
                const maxLevel = groupArcs.reduce(
                  (acc, a) => (SECRET_LEVEL_RANK[a.level] > SECRET_LEVEL_RANK[acc] ? a.level : acc),
                  "公开" as ArchiveLevel
                );
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-archive-navy-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-white border border-violet-200 text-violet-700 flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800">{g.detail}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            拆分原因：
                            {g.reason === "secret_level"
                              ? "密级不同"
                              : g.reason === "approval_chain"
                              ? "审批链不同"
                              : g.reason === "seat_availability"
                              ? "阅览席位区域不同"
                              : "手动拆分"}
                          </div>
                        </div>
                      </div>
                      <StatusBadge kind="level" value={maxLevel} />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="p-2.5 rounded-lg bg-slate-50">
                          <div className="text-xs text-slate-500 mb-1">档案数量</div>
                          <div className="font-semibold text-slate-800">{groupArcs.length} 份</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50">
                          <div className="text-xs text-slate-500 mb-1">审批链</div>
                          <div className="text-xs font-medium text-slate-700 leading-tight">
                            {getApprovalChainDesc(maxLevel)}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50">
                          <div className="text-xs text-slate-500 mb-1">阅览席位</div>
                          <div className="text-xs font-medium text-slate-700">
                            {getSeatAreaDesc(maxLevel)}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1.5">档案明细</div>
                        <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                          {groupArcs.map((a) => (
                            <div key={a.id} className="px-3 py-2 text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-slate-400">{a.code}</span>
                                <span className="text-slate-700 truncate max-w-[260px]">{a.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                <StatusBadge kind="level" value={a.level} />
                                <span className="text-slate-400">
                                  {getShelfById(a.shelf_id)?.code}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {splitPreview.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                {splitPreview.warnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-800">⚠️ {w}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
