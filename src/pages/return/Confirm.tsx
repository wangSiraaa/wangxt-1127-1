import { useState } from "react";
import { CheckCircle2, Package, Search, ShieldCheck, MapPin, Clock, Archive } from "lucide-react";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatRelativeTime } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import type { ReturnRecord } from "@/types";

export default function ReturnConfirm() {
  const returnRecords = useStore((s) => s.returnRecords);
  const getApplicationById = useStore((s) => s.getApplicationById);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getShelfById = useStore((s) => s.getShelfById);
  const getUserById = useStore((s) => s.getUserById);
  const confirmReturn = useStore((s) => s.confirmReturn);
  const resolveOverdue = useStore((s) => s.resolveOverdue);
  const overdueRecords = useStore((s) => s.overdueRecords);

  const [selected, setSelected] = useState<ReturnRecord | null>(null);
  const [checked, setChecked] = useState({ intact: true, complete: true, noMark: true });
  const [keyword, setKeyword] = useState("");

  const list = returnRecords
    .filter((r) => r.status !== "returned")
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
    .sort((a, b) => new Date(b.receive_time).getTime() - new Date(a.receive_time).getTime());

  const handleReturn = () => {
    if (!selected) return;
    if (!(checked.intact && checked.complete && checked.noMark)) {
      showToast("请完成完整性检查后再确认归还", "warning");
      return;
    }
    confirmReturn(selected.id);

    // 检查是否存在逾期记录并处理
    const od = overdueRecords.find(
      (o) => o.application_id === selected.application_id && o.status === "active"
    );
    if (od) {
      resolveOverdue(od.id);
      showToast("归还确认成功，逾期已解除，用户权限恢复", "success");
    } else {
      showToast("归还确认成功，档案已归档", "success");
    }
    setSelected(null);
  };

  const isAllChecked = checked.intact && checked.complete && checked.noMark;

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
          归还确认
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          档案完整性检查后确认归还 · 待归还 {list.length} 份
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-end">
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
              <div className="text-slate-400">暂无待归还档案</div>
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
            return (
              <div
                key={r.id}
                className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                  isOverdue
                    ? "border-red-300 bg-gradient-to-br from-white to-red-50/40"
                    : "border-slate-200 hover:border-emerald-300"
                }`}
              >
                {isOverdue && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-red-100 border border-red-200 text-xs text-red-700 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    已逾期 {od?.overdue_days || 0} 天
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{arc?.title}</div>
                    <div className="flex items-center gap-2 mt-1.5">
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
                    <span className="text-slate-400">👤</span>
                    <span>利用者：{applicant?.name}</span>
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
                </div>

                <button
                  className="w-full btn-primary py-2"
                  onClick={() => {
                    setSelected(r);
                    setChecked({ intact: false, complete: false, noMark: false });
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  确认归还
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="归还档案检查"
        width="max-w-xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSelected(null)}>
              取消
            </button>
            <button
              className="btn-success"
              disabled={!isAllChecked}
              onClick={handleReturn}
            >
              <CheckCircle2 className="w-4 h-4" />
              确认归还
            </button>
          </>
        }
      >
        {selected && (() => {
          const app = getApplicationById(selected.application_id);
          const arc = app ? getArchiveById(app.archive_id) : undefined;
          const shelf = arc ? getShelfById(arc.shelf_id) : undefined;
          return (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-archive-navy-50/60 border border-archive-navy-100">
                <div className="text-xs text-slate-500 mb-1">档案信息</div>
                <div className="font-serif text-lg font-semibold text-archive-navy-700">
                  {arc?.title}
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="text-slate-500 font-mono">{arc?.code}</span>
                  {arc && <StatusBadge kind="level" value={arc.level} />}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  归档位置：{shelf?.location} · {shelf?.code} · {arc?.layer}层{arc?.cell}格
                </div>
              </div>

              <div>
                <div className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-archive-navy-500" />
                  档案完整性检查
                </div>
                <div className="space-y-2">
                  {[
                    {
                      key: "intact",
                      label: "档案载体完好，无破损、褶皱、污渍",
                    },
                    {
                      key: "complete",
                      label: "附件、页码齐全，无缺页漏页",
                    },
                    {
                      key: "noMark",
                      label: "无涂改、勾划、批注等污损痕迹",
                    },
                  ].map((item) => {
                    const k = item.key as keyof typeof checked;
                    return (
                      <label
                        key={k}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          checked[k]
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                            checked[k]
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-slate-300"
                          }`}
                        >
                          {checked[k] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={checked[k]}
                          onChange={(e) =>
                            setChecked((prev) => ({ ...prev, [k]: e.target.checked }))
                          }
                          className="hidden"
                        />
                        <span
                          className={`text-sm ${
                            checked[k] ? "text-emerald-700 font-medium" : "text-slate-600"
                          }`}
                        >
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {!isAllChecked && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  请完成所有检查项后再确认归还
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
