import { useState, useMemo } from "react";
import { ArrowLeft, Search, Check, AlertTriangle, FileArchive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, addDays } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import { isSecretLevel } from "@/types";
import type { Archive, ArchiveLevel } from "@/types";

const levels: (ArchiveLevel | "全部")[] = ["全部", "公开", "内部", "秘密", "机密", "绝密"];

export default function ApplicationNew() {
  const navigate = useNavigate();
  const searchArchives = useStore((s) => s.searchArchives);
  const createApplication = useStore((s) => s.createApplication);
  const currentUser = useStore((s) => s.getCurrentUser());

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [reason, setReason] = useState("");
  const [expectReadTime, setExpectReadTime] = useState(
    formatDate(addDays(new Date(), 1), "YYYY-MM-DDTHH:mm")
  );
  const [keyword, setKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState<ArchiveLevel | "全部">("全部");

  const archives = useMemo(() => {
    const lv = levelFilter === "全部" ? undefined : levelFilter;
    return searchArchives(keyword, lv).filter((a) => a.status === "in_shelf").slice(0, 30);
  }, [searchArchives, keyword, levelFilter]);

  const submit = () => {
    if (!selectedArchive || !reason.trim() || !expectReadTime) return;
    const res = createApplication({
      user_id: currentUser?.id || "u001",
      archive_id: selectedArchive.id,
      reason: reason.trim(),
      expect_read_time: new Date(expectReadTime).toISOString(),
    });
    if (res.success) {
      showToast(
        res.message +
          (isSecretLevel(selectedArchive.level) ? "，请等待审批人员审批" : "，可等待库房派单"),
        "success"
      );
      navigate("/application");
    } else {
      showToast(res.message, "error");
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
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
        <h1 className="text-2xl font-serif font-semibold text-archive-navy-700 mb-1">
          提交调阅申请
        </h1>
        <p className="text-sm text-slate-500">
          档案调阅请填写真实事由，涉密档案需经审批后方可调出
        </p>

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
                  {s === 1 ? "选择档案" : s === 2 ? "填写信息" : "确认提交"}
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
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[460px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="table-th w-14"></th>
                    <th className="table-th">档案编码</th>
                    <th className="table-th">题名</th>
                    <th className="table-th">分类</th>
                    <th className="table-th">密级</th>
                    <th className="table-th">架位</th>
                    <th className="table-th">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {archives.map((a) => {
                    const shelf = useStore.getState().getShelfById(a.shelf_id);
                    const checked = selectedArchive?.id === a.id;
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedArchive(a)}
                        className={`cursor-pointer table-tr-hover ${
                          checked ? "bg-archive-navy-50" : ""
                        }`}
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
                        <td className="table-td font-medium">{a.title}</td>
                        <td className="table-td text-slate-500">{a.category}</td>
                        <td className="table-td"><StatusBadge kind="level" value={a.level} /></td>
                        <td className="table-td text-slate-500 text-xs">
                          {shelf?.code} · {a.layer}层{a.cell}格
                        </td>
                        <td className="table-td"><StatusBadge kind="archive" value={a.status} /></td>
                      </tr>
                    );
                  })}
                  {archives.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <FileArchive className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <div className="text-slate-400 text-sm">未找到匹配档案</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                className="btn-primary"
                disabled={!selectedArchive}
                onClick={() => setStep(2)}
              >
                下一步
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-lg bg-archive-navy-50/60 border border-archive-navy-100">
              <div className="text-xs text-slate-500 mb-2">已选档案</div>
              <div className="font-serif text-lg font-semibold text-archive-navy-700">
                {selectedArchive?.title}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <span className="text-slate-500">{selectedArchive?.code}</span>
                <StatusBadge kind="level" value={selectedArchive?.level || "公开"} />
                {selectedArchive && isSecretLevel(selectedArchive.level) && (
                  <span className="flex items-center gap-1 text-amber-700 text-xs font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    涉密档案需审批
                  </span>
                )}
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
                事由将用于审批审核，请如实填写
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
                <div className="font-serif text-lg font-semibold">请核对以下信息</div>
              </div>
              <div className="divide-y divide-slate-100 p-5 space-y-4">
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500">档案</div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedArchive?.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{selectedArchive?.code}</span>
                      <StatusBadge kind="level" value={selectedArchive?.level || "公开"} />
                    </div>
                  </div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500">调阅事由</div>
                  <div className="flex-1 text-slate-700 whitespace-pre-wrap">{reason}</div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500">预约阅览</div>
                  <div className="flex-1">{formatDate(expectReadTime)}</div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500">应归还时间</div>
                  <div className="flex-1 text-amber-700">
                    {formatDate(addDays(new Date(expectReadTime), 3))}
                  </div>
                </div>
                <div className="flex">
                  <div className="w-28 text-sm text-slate-500">申请人</div>
                  <div className="flex-1">
                    {currentUser?.name} · {currentUser?.department}
                  </div>
                </div>
              </div>
            </div>

            {selectedArchive && isSecretLevel(selectedArchive.level) && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <div className="font-semibold">涉密审批提示</div>
                  <div className="mt-1">
                    您申请调阅的档案密级为【{selectedArchive.level}】，需经审批人员审批通过后方可派出。审批进度可在申请列表中查看。
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
    </div>
  );
}
