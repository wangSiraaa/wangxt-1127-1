import { useState, useMemo } from "react";
import { Plus, Search, Eye, XCircle, CheckCircle2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/utils/dateUtils";
import { applicationStatusMap } from "@/utils/statusMapper";
import type { ApplicationStatus } from "@/types";
import { showToast } from "@/components/ui/Toast";

const tabs: { key: "all" | ApplicationStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending_approval", label: "待审批" },
  { key: "approved", label: "已批准" },
  { key: "dispatching", label: "调卷中" },
  { key: "reading", label: "阅览中" },
  { key: "completed", label: "已完成" },
  { key: "rejected", label: "已驳回" },
  { key: "cancelled", label: "已取消" },
];

export default function ApplicationList() {
  const navigate = useNavigate();
  const applications = useStore((s) => s.applications);
  const archives = useStore((s) => s.archives);
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.getCurrentUser());
  const cancelApplication = useStore((s) => s.cancelApplication);

  const [activeTab, setActiveTab] = useState<"all" | ApplicationStatus>("all");
  const [keyword, setKeyword] = useState("");

  const list = useMemo(() => {
    let result = [...applications];
    if (currentUser?.role === "user") {
      result = result.filter((a) => a.user_id === currentUser.id);
    }
    if (activeTab !== "all") {
      result = result.filter((a) => a.status === activeTab);
    }
    if (keyword) {
      const k = keyword.toLowerCase();
      result = result.filter((a) => {
        const arc = archives.find((x) => x.id === a.archive_id);
        return (
          a.reason.toLowerCase().includes(k) ||
          arc?.title.toLowerCase().includes(k) ||
          arc?.code.toLowerCase().includes(k)
        );
      });
    }
    return result.sort(
      (a, b) => new Date(b.apply_time).getTime() - new Date(a.apply_time).getTime()
    );
  }, [applications, activeTab, keyword, currentUser, archives]);

  const handleCancel = (id: string) => {
    if (confirm("确认取消此申请？")) {
      cancelApplication(id);
      showToast("申请已取消", "success");
    }
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            调阅申请管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {list.length} 条申请记录
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/application/new")}
        >
          <Plus className="w-4 h-4" />
          提交新申请
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const count =
                t.key === "all"
                  ? applications.length
                  : applications.filter((a) => a.status === t.key).length;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-archive-navy-500 to-archive-navy-600 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      active ? "bg-white/20" : "bg-white"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索档案标题/编码/事由..."
              className="input pl-9"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">申请编号</th>
                <th className="table-th">档案信息</th>
                <th className="table-th">申请人</th>
                <th className="table-th">调阅事由</th>
                <th className="table-th">申请时间</th>
                <th className="table-th">预约时间</th>
                <th className="table-th">状态</th>
                <th className="table-th text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const arc = archives.find((x) => x.id === a.archive_id);
                const applicant = users.find((u) => u.id === a.user_id);
                const canCancel = ["pending_approval", "approved"].includes(a.status);
                return (
                  <tr key={a.id} className="table-tr-hover">
                    <td className="table-td font-mono text-xs text-slate-500">
                      {a.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="table-td">
                      <div className="font-medium text-slate-800 truncate max-w-[240px]" title={arc?.title}>
                        {arc?.title || "-"}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{arc?.code}</span>
                        {arc && <StatusBadge kind="level" value={arc.level} />}
                      </div>
                    </td>
                    <td className="table-td">{applicant?.name || "-"}</td>
                    <td className="table-td">
                      <div className="max-w-[200px] truncate text-slate-600" title={a.reason}>
                        {a.reason}
                      </div>
                    </td>
                    <td className="table-td text-slate-500 text-xs">
                      {formatDate(a.apply_time)}
                    </td>
                    <td className="table-td text-slate-500 text-xs">
                      {formatDate(a.expect_read_time)}
                    </td>
                    <td className="table-td">
                      <StatusBadge kind="application" value={a.status} pulse />
                    </td>
                    <td className="table-td text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-md text-slate-500 hover:bg-archive-navy-50 hover:text-archive-navy-600 transition"
                          onClick={() => navigate(`/application/${a.id}`)}
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canCancel && currentUser?.id === a.user_id && (
                          <button
                            className="p-1.5 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition"
                            onClick={() => handleCancel(a.id)}
                            title="取消申请"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <div className="text-slate-400 text-sm">暂无申请记录</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
