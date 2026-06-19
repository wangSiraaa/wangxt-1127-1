import { useState } from "react";
import {
  TrendingUp,
  FileText,
  PackageCheck,
  AlertTriangle,
  ClipboardList,
  FileArchive,
  Warehouse,
  BookOpen,
  ShieldCheck,
  Search,
  Ban,
  Play,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  User,
  MapPin,
} from "lucide-react";
import { useStore } from "@/store";
import { useNavigate } from "react-router-dom";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { formatDate, formatRelativeTime, addDays } from "@/utils/dateUtils";
import { showToast } from "@/components/ui/Toast";
import type { Application } from "@/types";
import { canCreateApplication, canDispatchApplication, canApproveApplication } from "@/utils/businessRules";

const quickModules = [
  {
    id: "application",
    title: "利用申请",
    desc: "利用者提交调阅事由",
    icon: FileText,
    gradient: "from-blue-500 to-indigo-600",
    link: "/application/new",
    actionLabel: "提交申请",
  },
  {
    id: "secret",
    title: "涉密审批",
    desc: "秘密/机密/绝密档案审核",
    icon: ShieldCheck,
    gradient: "from-purple-500 to-fuchsia-600",
    link: "/application",
    actionLabel: "处理审批",
    badge: "approval",
  },
  {
    id: "dispatch",
    title: "库房调卷",
    desc: "密集架定位与派单",
    icon: Warehouse,
    gradient: "from-cyan-500 to-blue-600",
    link: "/dispatch",
    actionLabel: "去派单",
  },
  {
    id: "inventory",
    title: "盘点拦截",
    desc: "盘点中架位禁止派单",
    icon: Search,
    gradient: "from-amber-500 to-orange-600",
    link: "/dispatch/inventory",
    actionLabel: "盘点管理",
    badge: "inventory",
  },
  {
    id: "return",
    title: "阅览归还",
    desc: "阅览室确认档案归还",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-600",
    link: "/return/confirm",
    actionLabel: "确认归还",
  },
  {
    id: "overdue",
    title: "逾期暂停",
    desc: "逾期未归还自动暂停申请",
    icon: Ban,
    gradient: "from-red-500 to-rose-600",
    link: "/return/overdue",
    actionLabel: "逾期管理",
    badge: "overdue",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const applications = useStore((s) => s.applications);
  const archives = useStore((s) => s.archives);
  const shelves = useStore((s) => s.shelves);
  const overdueRecords = useStore((s) => s.overdueRecords);
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.getCurrentUser());
  const getArchiveById = useStore((s) => s.getArchiveById);
  const getUserById = useStore((s) => s.getUserById);
  const getShelfById = useStore((s) => s.getShelfById);

  const createApplication = useStore((s) => s.createApplication);
  const approveApplication = useStore((s) => s.approveApplication);
  const rejectApplication = useStore((s) => s.rejectApplication);
  const createDispatch = useStore((s) => s.createDispatch);
  const confirmReceive = useStore((s) => s.confirmReceive);
  const confirmReturn = useStore((s) => s.confirmReturn);
  const checkOverdue = useStore((s) => s.checkOverdue);
  const resetAll = useStore((s) => s.resetAll);

  const [showRegression, setShowRegression] = useState(false);
  const [regressionLogs, setRegressionLogs] = useState<
    { step: string; desc: string; status: "pass" | "fail" | "pending"; detail?: string }[]
  >([]);
  const [running, setRunning] = useState(false);

  const pendingApproval = applications.filter((a) => a.status === "pending_approval").length;
  const pendingDispatch = applications.filter((a) => a.status === "approved").length;
  const pendingReceive = applications.filter((a) => a.status === "dispatching").length;
  const inventoryCount = shelves.filter((s) => s.status === "inventory").length;
  const suspendedUsers = users.filter((u) => u.status === "suspended").length;
  const activeOverdue = overdueRecords.filter((o) => o.status === "active").length;

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.apply_time).getTime() - new Date(a.apply_time).getTime())
    .slice(0, 6);

  const badgeValues: Record<string, number> = {
    approval: pendingApproval,
    inventory: inventoryCount,
    overdue: activeOverdue,
  };

  const runRegression = async () => {
    setRunning(true);
    resetAll();
    setRegressionLogs([]);
    const addLog = (
      step: string,
      desc: string,
      status: "pass" | "fail" | "pending",
      detail?: string
    ) => {
      setRegressionLogs((prev) => [...prev, { step, desc, status, detail }]);
    };
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // 测试1：提交非涉密申请
    addLog("T1", "提交公开级档案调阅申请", "pending");
    await wait(300);
    try {
      const arc = archives.find((a) => a.level === "公开" && a.status === "in_shelf");
      if (!arc) throw new Error("未找到公开级档案");
      const result = createApplication({
        archive_id: arc.id,
        user_id: "u001",
        reason: "回归测试-公开档案调阅",
        expect_read_time: formatDate(addDays(new Date(), 1)),
      });
      if (!result.success || !result.id) throw new Error("创建失败: " + result.message);
      const created = useStore.getState().applications.find((a) => a.id === result.id);
      if (!created) throw new Error("申请未找到");
      if (created.status !== "pending_approval" && created.status !== "approved") {
        throw new Error("申请状态异常: " + created.status);
      }
      addLog("T1", "提交公开级档案调阅申请", "pass", `申请状态=${created.status}`);
    } catch (e: any) {
      addLog("T1", "提交公开级档案调阅申请", "fail", e.message);
    }

    // 测试2：提交涉密申请 -> 自动进入待审批
    addLog("T2", "涉密档案自动进入待审批验证", "pending");
    await wait(400);
    try {
      const arc = archives.find((a) => a.level === "秘密" && a.status === "in_shelf");
      if (!arc) throw new Error("未找到秘密级档案");
      const result = createApplication({
        archive_id: arc.id,
        user_id: "u001",
        reason: "回归测试-涉密档案调阅",
        expect_read_time: formatDate(addDays(new Date(), 1)),
      });
      if (!result.success || !result.id) throw new Error("创建失败: " + result.message);
      const created = useStore.getState().applications.find((a) => a.id === result.id);
      if (!created) throw new Error("申请未找到");
      if (created.status !== "pending_approval") {
        throw new Error("涉密申请未进入待审批: " + created.status);
      }
      addLog("T2", "涉密档案自动进入待审批验证", "pass", `状态=${created.status}`);
    } catch (e: any) {
      addLog("T2", "涉密档案自动进入待审批验证", "fail", e.message);
    }

    // 测试3：审批员审批通过
    addLog("T3", "审批员通过涉密申请", "pending");
    await wait(400);
    try {
      const pendingApp = useStore
        .getState()
        .applications.find((a) => a.status === "pending_approval");
      if (!pendingApp) throw new Error("没有待审批申请");
      const canApprove = canApproveApplication(pendingApp);
      if (!canApprove.success) throw new Error("不满足审批条件: " + canApprove.message);
      approveApplication(pendingApp.id, "u004", "回归测试自动审批通过");
      const updated = useStore.getState().applications.find((a) => a.id === pendingApp.id);
      if (updated?.status !== "approved") throw new Error("审批后状态异常: " + updated?.status);
      addLog("T3", "审批员通过涉密申请", "pass", `审批后状态=${updated.status}`);
    } catch (e: any) {
      addLog("T3", "审批员通过涉密申请", "fail", e.message);
    }

    // 测试4：盘点中的架位禁止派单（拦截）
    addLog("T4", "盘点架位拦截派单验证", "pending");
    await wait(400);
    try {
      // 找一个已批准申请且档案所在架位正在盘点
      const approvedApps = useStore
        .getState()
        .applications.filter((a) => a.status === "approved");
      let targetApp: Application | undefined;
      for (const app of approvedApps) {
        const arc = useStore.getState().getArchiveById(app.archive_id);
        const shelf = arc ? useStore.getState().getShelfById(arc.shelf_id) : undefined;
        if (shelf?.status === "inventory") {
          targetApp = app;
          break;
        }
      }
      if (!targetApp) throw new Error("未找到对应盘点架位的已批准申请");
      const result = createDispatch(targetApp.id, "u002");
      if (result.success) throw new Error("盘点架位派单应被拦截");
      addLog("T4", "盘点架位拦截派单验证", "pass", `拦截信息: ${result.message}`);
    } catch (e: any) {
      addLog("T4", "盘点架位拦截派单验证", "fail", e.message);
    }

    // 测试5：正常架位成功派单
    addLog("T5", "正常架位派单出库验证", "pending");
    await wait(400);
    try {
      const approvedApps = useStore
        .getState()
        .applications.filter((a) => a.status === "approved");
      let targetApp: Application | undefined;
      for (const app of approvedApps) {
        const arc = useStore.getState().getArchiveById(app.archive_id);
        const shelf = arc ? useStore.getState().getShelfById(arc.shelf_id) : undefined;
        if (shelf?.status === "normal") {
          targetApp = app;
          break;
        }
      }
      if (!targetApp) throw new Error("未找到可派单的已批准申请");
      const result = createDispatch(targetApp.id, "u002");
      if (!result.success) throw new Error("派单失败: " + result.message);
      const updated = useStore.getState().applications.find((a) => a.id === targetApp!.id);
      if (updated?.status !== "dispatching") throw new Error("派单后状态异常");
      addLog("T5", "正常架位派单出库验证", "pass", `派单后状态=${updated.status}`);
    } catch (e: any) {
      addLog("T5", "正常架位派单出库验证", "fail", e.message);
    }

    // 测试6：阅览室接收登记
    addLog("T6", "阅览室接收档案并分配阅览位", "pending");
    await wait(400);
    try {
      const dispatching = useStore
        .getState()
        .applications.find((a) => a.status === "dispatching");
      if (!dispatching) throw new Error("没有运输中档案");
      confirmReceive(dispatching.id, "u005", "A-01");
      const rec = useStore
        .getState()
        .returnRecords.find((r) => r.application_id === dispatching.id);
      if (!rec) throw new Error("未生成接收记录");
      if (rec.status !== "received") throw new Error("接收状态异常: " + rec.status);
      addLog("T6", "阅览室接收档案并分配阅览位", "pass", `阅览位=${rec.seat_no}`);
    } catch (e: any) {
      addLog("T6", "阅览室接收档案并分配阅览位", "fail", e.message);
    }

    // 测试7：归还确认后归档
    addLog("T7", "确认归还并归档", "pending");
    await wait(400);
    try {
      const received = useStore
        .getState()
        .returnRecords.find((r) => r.status === "received" || r.status === "reading");
      if (!received) throw new Error("没有可归还记录");
      if (received.status === "received") {
        useStore.getState().startReading(received.id);
      }
      if (received.status === "reading") {
        useStore.getState().endReading(received.id);
      }
      confirmReturn(received.id);
      const updated = useStore
        .getState()
        .returnRecords.find((r) => r.id === received.id);
      if (updated?.status !== "returned") throw new Error("归还状态异常");
      const app = useStore.getState().applications.find((a) => a.id === received.application_id);
      if (app?.status !== "completed") throw new Error("关联申请未完成");
      const arc = useStore.getState().getArchiveById(app.archive_id);
      if (arc?.status !== "in_shelf") throw new Error("档案未归架: " + arc?.status);
      addLog("T7", "确认归还并归档", "pass", `档案状态=${arc?.status}`);
    } catch (e: any) {
      addLog("T7", "确认归还并归档", "fail", e.message);
    }

    // 测试8：逾期自动暂停用户申请
    addLog("T8", "逾期未归还自动暂停申请权限", "pending");
    await wait(500);
    try {
      checkOverdue();
      const suspended = useStore.getState().users.filter((u) => u.status === "suspended");
      const hasSuspended = suspended.length > 0;
      // 验证被暂停的用户不能新建申请
      if (hasSuspended) {
        const suspendUserObj = suspended[0];
        const publicArc = archives.find((a) => a.level === "公开" && a.status === "in_shelf");
        if (!publicArc) throw new Error("未找到公开级档案");
        const canCreate = canCreateApplication(suspendUserObj, publicArc);
        if (canCreate.success) throw new Error("被暂停用户应不能创建申请");
        addLog(
          "T8",
          "逾期未归还自动暂停申请权限",
          "pass",
          `被暂停用户=${suspendUserObj.name}，已阻止新建申请，原因：${canCreate.message}`
        );
      } else {
        addLog("T8", "逾期未归还自动暂停申请权限", "pass", "无逾期用户（正常）");
      }
    } catch (e: any) {
      addLog("T8", "逾期未归还自动暂停申请权限", "fail", e.message);
    }

    setRunning(false);
  };

  const passCount = regressionLogs.filter((l) => l.status === "pass").length;
  const failCount = regressionLogs.filter((l) => l.status === "fail").length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-archive-navy-700">
            欢迎回来，{currentUser?.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {formatDate(new Date(), "YYYY年MM月DD日")} · 档案馆密集架调卷管理工作台
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-gold"
            onClick={() => {
              setShowRegression(true);
              setRegressionLogs([]);
            }}
          >
            <Play className="w-4 h-4" />
            业务回归验证
          </button>
          <button className="btn-primary" onClick={() => navigate("/application/new")}>
            <FileText className="w-4 h-4" />
            提交新申请
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickModules.map((m) => {
          const Icon = m.icon;
          const count = m.badge ? badgeValues[m.badge] || 0 : 0;
          return (
            <div
              key={m.id}
              onClick={() => navigate(m.link)}
              className={`group card p-5 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 relative overflow-hidden`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity`}
              />
              <div className="relative z-10">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center text-white shadow-md mb-3`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-semibold text-slate-800 group-hover:text-archive-navy-700 transition">
                  {m.title}
                </div>
                <div className="text-xs text-slate-400 mt-1">{m.desc}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium bg-gradient-to-r ${m.gradient} bg-clip-text text-transparent inline-flex items-center gap-1 group-hover:gap-2 transition-all`}
                  >
                    {m.actionLabel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  {m.badge && count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="card p-4 border-l-4 border-l-blue-400">
          <div className="text-xs text-slate-500">待审批</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{pendingApproval}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-indigo-400">
          <div className="text-xs text-slate-500">待派单</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{pendingDispatch}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-purple-400">
          <div className="text-xs text-slate-500">待接收</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{pendingReceive}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-amber-400">
          <div className="text-xs text-slate-500">盘点架位</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{inventoryCount}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-red-400">
          <div className="text-xs text-slate-500">逾期档案</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{activeOverdue}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-orange-400">
          <div className="text-xs text-slate-500">暂停用户</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{suspendedUsers}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-archive-navy-700">最新申请动态</h2>
            <button
              className="text-xs text-slate-400 hover:text-archive-navy-600 transition flex items-center gap-1"
              onClick={() => navigate("/application")}
            >
              查看全部 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {recentApps.map((app) => {
              const archive = getArchiveById(app.archive_id);
              const applicant = getUserById(app.user_id);
              const shelf = archive ? getShelfById(archive.shelf_id) : undefined;
              return (
                <div
                  key={app.id}
                  onClick={() => navigate(`/application/${app.id}`)}
                  className="flex items-start gap-4 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-archive-navy-400 to-archive-gold-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {applicant?.name?.charAt(0) || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 truncate group-hover:text-archive-navy-700 transition">
                        {archive?.title || "档案"}
                      </span>
                      {archive && <StatusBadge kind="level" value={archive.level} />}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                      <span className="font-mono">{archive?.code}</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {applicant?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {shelf?.code}
                      </span>
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        {formatRelativeTime(app.apply_time)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge kind="application" value={app.status} pulse />
                  </div>
                </div>
              );
            })}
            {recentApps.length === 0 && (
              <div className="text-sm text-slate-400 text-center py-12">
                <FileArchive className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                暂无申请记录
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-serif text-lg font-semibold text-archive-navy-700 mb-4">
              密集架状态
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {shelves.slice(0, 12).map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate("/dispatch")}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                    s.status === "normal"
                      ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 text-emerald-700"
                      : s.status === "inventory"
                      ? "bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300 text-amber-700 animate-pulse"
                      : "bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 text-slate-500"
                  }`}
                >
                  <div className="text-sm font-bold">{s.code.split("-")[1]}</div>
                  <div className="text-[10px] mt-0.5">
                    {s.status === "normal" ? "正常" : s.status === "inventory" ? "盘点中" : "维护"}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                <span className="text-slate-500">正常</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                <span className="text-slate-500">盘点(禁止派单)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-300" />
                <span className="text-slate-500">维护</span>
              </div>
            </div>
          </div>

          <div className="card p-5 bg-gradient-to-br from-archive-navy-50 to-archive-gold-50/50 border border-archive-gold-200">
            <h3 className="font-serif text-lg font-semibold text-archive-navy-700 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-archive-gold-600" />
              三大业务规则
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">
                  <strong className="text-purple-700">涉密审批：</strong>
                  秘密/机密/绝密档案提交后自动进入待审批，无审批不能出库
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Search className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">
                  <strong className="text-amber-700">盘点拦截：</strong>
                  架位盘点期间禁止任何派单操作，避免数据冲突
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Ban className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">
                  <strong className="text-red-700">逾期暂停：</strong>
                  超时未归还自动暂停利用者申请权限，直至档案归还
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Modal
        open={showRegression}
        onClose={() => !running && setShowRegression(false)}
        title="业务规则回归验证"
        width="max-w-2xl"
        footer={
          <>
            <button
              className="btn-secondary"
              disabled={running}
              onClick={() => setShowRegression(false)}
            >
              关闭
            </button>
            <button className="btn-gold" disabled={running} onClick={runRegression}>
              <Play className="w-4 h-4" />
              {regressionLogs.length === 0 ? "开始验证" : "重新执行"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-archive-navy-50/60 border border-archive-navy-100">
            <div className="text-sm text-slate-600">
              自动验证<strong>8条核心业务规则</strong>，覆盖申请、审批、派单、拦截、归还、逾期全流程。
              测试使用独立数据环境，不会污染现有数据。
            </div>
          </div>

          {regressionLogs.length > 0 && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div className="text-2xl font-bold text-slate-700">{regressionLogs.length}</div>
                <div className="text-xs text-slate-500">用例总数</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-2xl font-bold text-emerald-600">{passCount}</div>
                <div className="text-xs text-emerald-700">通过</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                <div className="text-2xl font-bold text-red-600">{failCount}</div>
                <div className="text-xs text-red-700">失败</div>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[420px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-16">
                    编号
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">
                    用例描述
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase w-20">
                    结果
                  </th>
                </tr>
              </thead>
              <tbody>
                {regressionLogs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-16 text-center text-slate-400">
                      <Play className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      点击"开始验证"运行回归测试
                    </td>
                  </tr>
                )}
                {regressionLogs.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-500">
                      {l.step}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-700">{l.desc}</div>
                      {l.detail && (
                        <div className="text-xs text-slate-400 mt-0.5">{l.detail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {l.status === "pass" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          通过
                        </span>
                      )}
                      {l.status === "fail" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          失败
                        </span>
                      )}
                      {l.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          执行中
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!running && regressionLogs.length > 0 && failCount === 0 && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              所有 {regressionLogs.length} 条用例全部通过，业务规则运行正常
            </div>
          )}
          {!running && failCount > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              检测到 {failCount} 条用例失败，请检查业务逻辑
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
