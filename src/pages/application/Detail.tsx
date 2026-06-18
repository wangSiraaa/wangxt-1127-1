import { useState } from "react";
import { ArrowLeft, Clock, User, CheckCircle2, XCircle, ShieldAlert, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import { isSecretLevel } from "@/types";

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const getApplicationById = useStore((s) => s.getApplicationById);
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getShelfById = useStore((s) => s.getShelfById);
  const getUserById = useStore((s) => s.getUserById);
  const getDispatchByApplication = useStore((s) => s.getDispatchByApplication);
  const getReturnByApplication = useStore((s) => s.getReturnByApplication);
  const approveApplication = useStore((s) => s.approveApplication);
  const rejectApplication = useStore((s) => s.rejectApplication);
  const currentUser = useStore((s) => s.getCurrentUser());

  const app = getApplicationById(id || "");
  const archive = app ? getArchiveById(app.archive_id) : undefined;
  const shelf = archive ? getShelfById(archive.shelf_id) : undefined;
  const applicant = app ? getUserById(app.user_id) : undefined;
  const approver = app?.approval_id ? getUserById(app.approval_id) : undefined;
  const dispatch = app ? getDispatchByApplication(app.id) : undefined;
  const dispatchStaff = dispatch ? getUserById(dispatch.staff_id) : undefined;
  const returnRecord = app ? getReturnByApplication(app.id) : undefined;
  const reader = returnRecord ? getUserById(returnRecord.reader_id) : undefined;

  const [opinion, setOpinion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!app) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="text-slate-400">申请不存在</div>
        <button className="btn-primary mt-6" onClick={() => navigate("/application")}>
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
      </div>
    );
  }

  const isApprover = currentUser?.role === "approver";
  const canApprove = isApprover && app.status === "pending_approval";

  const handleApprove = () => {
    if (!currentUser) return;
    setSubmitting(true);
    setTimeout(() => {
      approveApplication(app.id, currentUser.id, opinion || "审批通过");
      showToast("申请已批准", "success");
      setSubmitting(false);
    }, 500);
  };

  const handleReject = () => {
    if (!currentUser) return;
    if (!opinion.trim()) {
      showToast("驳回请填写审批意见", "warning");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      rejectApplication(app.id, currentUser.id, opinion);
      showToast("申请已驳回", "info");
      setSubmitting(false);
    }, 500);
  };

  const timeline = [
    {
      title: "提交申请",
      time: app.apply_time,
      user: applicant?.name,
      status: "done",
      description: `事由：${app.reason}`,
    },
    ...(app.approval_time || app.status !== "pending_approval"
      ? [
          {
            title: app.status === "rejected" ? "申请驳回" : "审批通过",
            time: app.approval_time || "",
            user: approver?.name,
            status: app.status === "rejected" ? ("error" as const) : ("done" as const),
            description: app.approval_opinion,
          },
        ]
      : []),
    ...(dispatch
      ? [
          {
            title: "库房派单",
            time: dispatch.dispatch_time,
            user: dispatchStaff?.name,
            status: "done" as const,
            description: `架位：${shelf?.code} · ${archive?.layer}层${archive?.cell}格`,
          },
        ]
      : []),
    ...(dispatch?.outbound_time
      ? [
          {
            title: "档案出库",
            time: dispatch.outbound_time,
            user: dispatchStaff?.name,
            status: "done" as const,
            description: `档案编码：${archive?.code}`,
          },
        ]
      : []),
    ...(returnRecord
      ? [
          {
            title: "阅览室接收",
            time: returnRecord.receive_time,
            user: reader?.name,
            status: "done" as const,
            description: `阅览位：${returnRecord.seat_no}`,
          },
        ]
      : []),
    ...(returnRecord?.start_read_time
      ? [
          {
            title: "开始阅览",
            time: returnRecord.start_read_time,
            user: applicant?.name,
            status: "done" as const,
            description: "",
          },
        ]
      : []),
    ...(returnRecord?.return_time
      ? [
          {
            title: "已归还",
            time: returnRecord.return_time,
            user: reader?.name,
            status: "done" as const,
            description: `归档至 ${shelf?.code}`,
          },
        ]
      : []),
    ...(app.status === "pending_approval"
      ? [
          {
            title: "等待审批",
            time: "",
            user: "",
            status: "current" as const,
            description: "",
          },
        ]
      : []),
    ...(app.status === "approved"
      ? [
          {
            title: "等待库房派单",
            time: "",
            user: "",
            status: "current" as const,
            description: "",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => navigate("/application")}>
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
        <StatusBadge kind="application" value={app.status} pulse />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs text-slate-400 font-mono">
                  申请编号 #{app.id.slice(-8).toUpperCase()}
                </div>
                <h2 className="font-serif text-xl font-semibold text-archive-navy-700 mt-1">
                  {archive?.title}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-500">{archive?.code}</span>
                  {archive && <StatusBadge kind="level" value={archive.level} />}
                  {archive && isSecretLevel(archive.level) && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      涉密
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500 text-xs mb-1">分类</div>
                <div>{archive?.category}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">形成年份</div>
                <div>{archive?.create_year} 年</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">存放架位</div>
                <div>
                  {shelf?.code} · {archive?.layer}层{archive?.cell}格
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">库房位置</div>
                <div>{shelf?.location}</div>
              </div>
              <div className="col-span-2">
                <div className="text-slate-500 text-xs mb-1">调阅事由</div>
                <div className="text-slate-700 whitespace-pre-wrap">{app.reason}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">预约阅览时间</div>
                <div>{formatDate(app.expect_read_time)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-xs mb-1">申请人</div>
                <div>
                  {applicant?.name} · {applicant?.department}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-serif text-lg font-semibold text-archive-navy-700 mb-5">
              流程时间线
            </h3>
            <div className="relative">
              <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-slate-200" />
              <div className="space-y-5">
                {timeline.map((t, i) => {
                  const colors = {
                    done: "bg-emerald-500",
                    current: "bg-archive-navy-500 animate-pulse",
                    error: "bg-red-500",
                  } as const;
                  return (
                    <div key={i} className="relative pl-12">
                      <div
                        className={`absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center ${colors[t.status]} text-white shadow-md`}
                      >
                        {t.status === "done" ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : t.status === "error" ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-slate-800">{t.title}</div>
                          {t.description && (
                            <div className="text-sm text-slate-500 mt-1">{t.description}</div>
                          )}
                          {t.user && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                              <User className="w-3 h-3" />
                              {t.user}
                            </div>
                          )}
                        </div>
                        {t.time && (
                          <div className="text-xs text-slate-400 whitespace-nowrap ml-4">
                            {formatDate(t.time)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {canApprove && (
            <div className="card p-5 border-2 border-amber-200 bg-gradient-to-b from-amber-50/50 to-white">
              <div className="flex items-center gap-2 text-amber-700 font-semibold mb-3">
                <ShieldAlert className="w-5 h-5" />
                审批操作
              </div>
              <div className="space-y-3">
                <div>
                  <label className="input-label text-xs">审批意见</label>
                  <textarea
                    className="input min-h-[88px] text-sm"
                    placeholder="请填写审批意见（驳回时必填）"
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-success flex-1"
                    onClick={handleApprove}
                    disabled={submitting}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    批准
                  </button>
                  <button
                    className="btn-danger flex-1"
                    onClick={handleReject}
                    disabled={submitting}
                  >
                    <XCircle className="w-4 h-4" />
                    驳回
                  </button>
                </div>
              </div>
            </div>
          )}

          {app.status === "rejected" && app.approval_opinion && (
            <div className="card p-5 border-2 border-red-200 bg-red-50/40">
              <div className="text-xs text-red-500 font-semibold mb-1">驳回意见</div>
              <div className="text-sm text-red-800">{app.approval_opinion}</div>
              <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <User className="w-3 h-3" />
                {approver?.name} · {app.approval_time && formatDate(app.approval_time)}
              </div>
            </div>
          )}

          {returnRecord && (
            <div className="card p-5">
              <div className="flex items-center gap-2 text-archive-navy-700 font-semibold mb-3">
                <Send className="w-5 h-5" />
                阅览信息
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">阅览位</span>
                  <span className="font-medium">{returnRecord.seat_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">接收时间</span>
                  <span>{formatDate(returnRecord.receive_time)}</span>
                </div>
                {returnRecord.start_read_time && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">开始阅览</span>
                    <span>{formatDate(returnRecord.start_read_time)}</span>
                  </div>
                )}
                {returnRecord.return_time ? (
                  <div className="flex justify-between">
                    <span className="text-slate-500">归还时间</span>
                    <span className="text-emerald-600">{formatDate(returnRecord.return_time)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-amber-700">
                    <span>应归还时间</span>
                    <span className="font-medium">{formatDate(returnRecord.due_time)}</span>
                  </div>
                )}
              </div>
              <StatusBadge
                kind="return"
                value={returnRecord.status}
                pulse
                className="mt-3"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
