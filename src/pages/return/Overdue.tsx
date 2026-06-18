import { useState } from "react";
import { AlertTriangle, User, Mail, Search, Clock, Ban, CheckCircle2, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatRelativeTime, daysBetween } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import type { OverdueRecord } from "@/types";

export default function ReturnOverdue() {
  const navigate = useNavigate();
  const overdueRecords = useStore((s) => s.overdueRecords);
  const getApplicationById = useStore((s) => s.getApplicationById);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getUserById = useStore((s) => s.getUserById);
  const suspendUser = useStore((s) => s.suspendUser);
  const restoreUser = useStore((s) => s.restoreUser);
  const users = useStore((s) => s.users);

  const [selected, setSelected] = useState<OverdueRecord | null>(null);
  const [showUserConfirm, setShowUserConfirm] = useState<{ action: "suspend" | "restore"; userId: string } | null>(null);
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState<"active" | "resolved">("active");

  const activeList = overdueRecords.filter((o) => o.status === tab);
  const filtered = activeList.filter((o) => {
    if (!keyword) return true;
    const app = getApplicationById(o.application_id);
    const arc = app ? getArchiveById(app.archive_id) : undefined;
    const u = getUserById(o.user_id);
    const k = keyword.toLowerCase();
    return (
      u?.name.toLowerCase().includes(k) ||
      arc?.title.toLowerCase().includes(k) ||
      arc?.code.toLowerCase().includes(k)
    );
  });

  const activeCount = overdueRecords.filter((o) => o.status === "active").length;
  const resolvedCount = overdueRecords.filter((o) => o.status === "resolved").length;

  const suspendedUsers = users.filter((u) => u.status === "suspended");

  const handleSendReminder = (r: OverdueRecord) => {
    const u = getUserById(r.user_id);
    showToast(`已向 ${u?.name || "利用者"} 发送逾期提醒通知`, "info");
    setSelected(null);
  };

  const handleConfirmUserAction = () => {
    if (!showUserConfirm) return;
    if (showUserConfirm.action === "suspend") {
      suspendUser(showUserConfirm.userId);
      showToast("已暂停该利用者的申请权限", "warning");
    } else {
      restoreUser(showUserConfirm.userId);
      showToast("已恢复该利用者的申请权限", "success");
    }
    setShowUserConfirm(null);
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            逾期管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            管理逾期未归还档案 · 逾期自动暂停利用者申请权限
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-red-400">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-1">待处理逾期</div>
              <div className="text-3xl font-bold text-red-600">{activeCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-400">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-1">已解决逾期</div>
              <div className="text-3xl font-bold text-amber-600">{resolvedCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-slate-400">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-1">累计超期天数</div>
              <div className="text-3xl font-bold text-slate-600">
                {overdueRecords.reduce((s, o) => s + (o.overdue_days || 0), 0)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-orange-400">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-1">已暂停用户</div>
              <div className="text-3xl font-bold text-orange-600">{suspendedUsers.length}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Ban className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {suspendedUsers.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold text-archive-navy-700 flex items-center gap-2">
              <Ban className="w-5 h-5 text-orange-500" />
              已暂停用户
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {suspendedUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.department}</div>
                </div>
                <button
                  className="btn-success text-xs py-1 px-3"
                  onClick={() =>
                    setShowUserConfirm({ action: "restore", userId: u.id })
                  }
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  恢复
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5">
          <div className="flex">
            <button
              onClick={() => setTab("active")}
              className={`px-5 py-4 text-sm font-medium transition relative ${
                tab === "active" ? "text-red-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                待处理
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  tab === "active" ? "bg-red-500 text-white" : "bg-slate-200"
                }`}>
                  {activeCount}
                </span>
              </span>
              {tab === "active" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setTab("resolved")}
              className={`px-5 py-4 text-sm font-medium transition relative ${
                tab === "resolved"
                  ? "text-emerald-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                已解决
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  tab === "resolved" ? "bg-emerald-500 text-white" : "bg-slate-200"
                }`}>
                  {resolvedCount}
                </span>
              </span>
              {tab === "resolved" && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 w-64 text-sm"
              placeholder="搜索档案/利用者..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">利用者</th>
                <th className="table-th">档案信息</th>
                <th className="table-th">逾期天数</th>
                <th className="table-th">应还时间</th>
                <th className="table-th">记录时间</th>
                <th className="table-th">状态</th>
                {tab === "resolved" && <th className="table-th">解决时间</th>}
                <th className="table-th text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const app = getApplicationById(r.application_id);
                const arc = app ? getArchiveById(app.archive_id) : undefined;
                const u = getUserById(r.user_id);
                const isSuspended = u?.status === "suspended";
                return (
                  <tr key={r.id} className="table-tr-hover">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          isSuspended
                            ? "bg-gradient-to-br from-orange-400 to-red-400"
                            : "bg-gradient-to-br from-archive-navy-400 to-archive-gold-500"
                        }`}>
                          {u?.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{u?.name}</span>
                            {isSuspended && <StatusBadge kind="user" value="suspended" />}
                          </div>
                          <div className="text-xs text-slate-400">{u?.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="font-medium text-slate-800 max-w-[240px] truncate">
                        {arc?.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 font-mono">{arc?.code}</span>
                        {arc && <StatusBadge kind="level" value={arc.level} />}
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 font-bold text-lg tabular-nums">
                        {r.overdue_days}
                        <span className="text-xs font-normal">天</span>
                      </span>
                    </td>
                    <td className="table-td text-slate-500 text-xs">
                      {app && formatDate(app.expect_read_time)}
                    </td>
                    <td className="table-td text-slate-500 text-xs">
                      <div>{formatDate(r.record_time)}</div>
                      <div className="mt-0.5">{formatRelativeTime(r.record_time)}</div>
                    </td>
                    <td className="table-td">
                      {r.status === "active" ? (
                        <span className="badge bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          逾期中
                        </span>
                      ) : (
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                          已解决
                        </span>
                      )}
                    </td>
                    {tab === "resolved" && (
                      <td className="table-td text-xs text-emerald-600">
                        {r.resolve_time && formatDate(r.resolve_time)}
                      </td>
                    )}
                    <td className="table-td text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="btn-ghost text-xs py-1 px-2"
                          onClick={() => navigate(`/application/${r.application_id}`)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          详情
                        </button>
                        {r.status === "active" && (
                          <>
                            <button
                              className="btn-secondary text-xs py-1 px-2"
                              onClick={() => setSelected(r)}
                            >
                              <Mail className="w-3.5 h-3.5" />
                              提醒
                            </button>
                            {!isSuspended && (
                              <button
                                className="btn-danger text-xs py-1 px-2"
                                onClick={() =>
                                  setShowUserConfirm({ action: "suspend", userId: r.user_id })
                                }
                              >
                                <Ban className="w-3.5 h-3.5" />
                                暂停
                              </button>
                            )}
                            <button
                              className="btn-gold text-xs py-1 px-2"
                              onClick={() => navigate("/return/confirm")}
                            >
                              去归还
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={tab === "resolved" ? 8 : 7} className="py-20 text-center">
                    <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <div className="text-slate-400">
                      {tab === "active" ? "暂无逾期记录" : "暂无已解决记录"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="发送逾期提醒"
        width="max-w-md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSelected(null)}>
              取消
            </button>
            <button
              className="btn-gold"
              onClick={() => selected && handleSendReminder(selected)}
            >
              <Mail className="w-4 h-4" />
              发送通知
            </button>
          </>
        }
      >
        {selected && (() => {
          const u = getUserById(selected.user_id);
          const app = getApplicationById(selected.application_id);
          const arc = app ? getArchiveById(app.archive_id) : undefined;
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  档案严重逾期
                </div>
                <div className="text-sm text-red-700">
                  已逾期 <strong>{selected.overdue_days}</strong> 天，请尽快归还
                </div>
              </div>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">通知对象</span>
                  <span className="font-medium">{u?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">档案名称</span>
                  <span className="font-medium max-w-[60%] text-right">{arc?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">应还时间</span>
                  <span>{app && formatDate(app.expect_read_time)}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 text-sm text-slate-600">
                系统将通过站内消息 + 邮件 + 短信 的方式通知利用者尽快归还档案。
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        open={!!showUserConfirm}
        onClose={() => setShowUserConfirm(null)}
        title={showUserConfirm?.action === "suspend" ? "暂停用户确认" : "恢复用户确认"}
        width="max-w-md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowUserConfirm(null)}>
              取消
            </button>
            <button
              className={showUserConfirm?.action === "suspend" ? "btn-danger" : "btn-success"}
              onClick={handleConfirmUserAction}
            >
              {showUserConfirm?.action === "suspend" ? (
                <>
                  <Ban className="w-4 h-4" />
                  确认暂停
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  确认恢复
                </>
              )}
            </button>
          </>
        }
      >
        <div
          className={`p-4 rounded-xl border ${
            showUserConfirm?.action === "suspend"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {showUserConfirm?.action === "suspend"
            ? "确认暂停该利用者的调阅申请权限？暂停期间，该用户将无法提交新的调阅申请，直至所有逾期档案归还后解除。"
            : "确认恢复该利用者的调阅申请权限？恢复后该用户可正常提交新的调阅申请。"}
        </div>
      </Modal>
    </div>
  );
}
