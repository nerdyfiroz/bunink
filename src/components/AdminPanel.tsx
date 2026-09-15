import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  Key,
  Layers,
  ArrowRight,
  Filter,
  Eye,
  FileJson,
  X,
} from 'lucide-react';
import { Task, WhitelistSubmission, WhitelistedWalletInfo } from '../types.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  whitelistedWallets: Record<string, WhitelistedWalletInfo>;
  onUpdateWhitelistedWallets: (wallets: Record<string, WhitelistedWalletInfo>) => void;
  submissions: WhitelistSubmission[];
  onUpdateSubmissions: (submissions: WhitelistSubmission[]) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

const DEFAULT_ADMIN_PASSKEY = 'bunink2026';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  tasks,
  onUpdateTasks,
  whitelistedWallets,
  onUpdateWhitelistedWallets,
  submissions,
  onUpdateSubmissions,
  showToast,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bunink_admin_auth') === 'true';
    }
    return false;
  });

  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'wallets' | 'tasks' | 'export'>('overview');

  // Submissions search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'WHITELISTED' | 'REJECTED'>('ALL');
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  // Direct Wallet Add & Bulk Import
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletTier, setNewWalletTier] = useState('Wave 1 Guaranteed');
  const [newWalletAllocation, setNewWalletAllocation] = useState('2 NFTs');
  const [bulkWalletsInput, setBulkWalletsInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // New Task form
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskUrl, setNewTaskUrl] = useState('');
  const [newTaskRequired, setNewTaskRequired] = useState(true);

  // Copy state helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('info', 'Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Auth submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPasskey = localStorage.getItem('bunink_admin_passkey') || DEFAULT_ADMIN_PASSKEY;
    if (passkeyInput.trim() === storedPasskey) {
      setIsAuthenticated(true);
      localStorage.setItem('bunink_admin_auth', 'true');
      setPasskeyError('');
      showToast('success', 'Admin session authenticated.');
    } else {
      setPasskeyError('Invalid passkey. Default is: bunink2026');
    }
  };

  const handleQuickLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('bunink_admin_auth', 'true');
    setPasskeyError('');
    showToast('success', 'Admin session authenticated via Quick Access.');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('bunink_admin_auth');
    showToast('info', 'Logged out of Admin Portal.');
  };

  // Metrics
  const stats = useMemo(() => {
    const totalSubmissions = submissions.length;
    const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;
    const whitelistedSubmissions = submissions.filter((s) => s.status === 'WHITELISTED').length;
    const rejectedCount = submissions.filter((s) => s.status === 'REJECTED').length;
    const totalWhitelistedWallets = (Object.values(whitelistedWallets) as WhitelistedWalletInfo[]).filter((w) => w.status === 'WHITELISTED').length;

    return {
      totalSubmissions,
      pendingCount,
      whitelistedSubmissions,
      rejectedCount,
      totalWhitelistedWallets,
      totalSupply: '2,222',
    };
  }, [submissions, whitelistedWallets]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.xHandle && item.xHandle.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [submissions, searchQuery, statusFilter]);

  // Submission actions
  const handleApproveSubmission = (id: string, walletAddress: string) => {
    const updated = submissions.map((sub) => {
      if (sub.id === id) {
        return {
          ...sub,
          status: 'WHITELISTED' as const,
          tier: 'Wave 1 Priority Whitelisted',
          allocation: '2 NFTs (Approved)',
        };
      }
      return sub;
    });
    onUpdateSubmissions(updated);

    // Also sync to whitelisted wallets dictionary
    const norm = walletAddress.toLowerCase();
    const updatedWallets = {
      ...whitelistedWallets,
      [norm]: {
        status: 'WHITELISTED' as const,
        tier: 'Wave 1 Priority Whitelisted',
        allocation: '2 NFTs (Approved)',
      },
    };
    onUpdateWhitelistedWallets(updatedWallets);

    // Sync user current app if same wallet
    const currentAppStr = localStorage.getItem('bunink_app');
    if (currentAppStr) {
      try {
        const cur = JSON.parse(currentAppStr);
        if (cur.walletAddress && cur.walletAddress.toLowerCase() === norm) {
          cur.status = 'WHITELISTED';
          cur.tier = 'Wave 1 Priority Whitelisted';
          localStorage.setItem('bunink_app', JSON.stringify(cur));
        }
      } catch {
        // ignore
      }
    }

    showToast('success', `Wallet approved and added to Whitelist!`);
  };

  const handleRejectSubmission = (id: string, walletAddress: string) => {
    const updated = submissions.map((sub) => {
      if (sub.id === id) {
        return { ...sub, status: 'REJECTED' as const };
      }
      return sub;
    });
    onUpdateSubmissions(updated);

    const norm = walletAddress.toLowerCase();
    if (whitelistedWallets[norm]) {
      const updatedWallets = { ...whitelistedWallets };
      updatedWallets[norm] = {
        ...updatedWallets[norm],
        status: 'REJECTED',
      };
      onUpdateWhitelistedWallets(updatedWallets);
    }

    showToast('warning', `Submission marked as rejected.`);
  };

  const handleResetSubmission = (id: string, walletAddress: string) => {
    const updated = submissions.map((sub) => {
      if (sub.id === id) {
        return { ...sub, status: 'PENDING' as const };
      }
      return sub;
    });
    onUpdateSubmissions(updated);

    const norm = walletAddress.toLowerCase();
    if (whitelistedWallets[norm]) {
      const updatedWallets = { ...whitelistedWallets };
      updatedWallets[norm] = {
        ...updatedWallets[norm],
        status: 'PENDING',
      };
      onUpdateWhitelistedWallets(updatedWallets);
    }

    showToast('info', `Submission reset to pending audit.`);
  };

  const handleDeleteSubmission = (id: string) => {
    if (!window.confirm('Delete this submission record?')) return;
    const updated = submissions.filter((s) => s.id !== id);
    onUpdateSubmissions(updated);
    showToast('info', 'Submission deleted.');
  };

  const handleApproveAllPending = () => {
    const pending = submissions.filter((s) => s.status === 'PENDING');
    if (pending.length === 0) {
      showToast('info', 'No pending applications to approve.');
      return;
    }

    if (!window.confirm(`Approve all ${pending.length} pending submissions to Whitelisted?`)) return;

    const newWallets = { ...whitelistedWallets };
    const updated = submissions.map((sub) => {
      if (sub.status === 'PENDING') {
        const norm = sub.walletAddress.toLowerCase();
        newWallets[norm] = {
          status: 'WHITELISTED',
          tier: 'Wave 1 Priority Whitelisted',
          allocation: '2 NFTs (Approved)',
        };
        return {
          ...sub,
          status: 'WHITELISTED' as const,
          tier: 'Wave 1 Priority Whitelisted',
          allocation: '2 NFTs (Approved)',
        };
      }
      return sub;
    });

    onUpdateSubmissions(updated);
    onUpdateWhitelistedWallets(newWallets);
    showToast('success', `Approved all ${pending.length} pending submissions!`);
  };

  // Direct Wallet Add
  const handleAddSingleWallet = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newWalletAddress.trim().toLowerCase();
    if (!clean.startsWith('0x') || clean.length !== 42) {
      showToast('error', 'Invalid EVM address format (must be 0x followed by 40 hex characters).');
      return;
    }

    const updated = {
      ...whitelistedWallets,
      [clean]: {
        status: 'WHITELISTED' as const,
        tier: newWalletTier,
        allocation: newWalletAllocation,
      },
    };
    onUpdateWhitelistedWallets(updated);
    setNewWalletAddress('');
    showToast('success', `Added ${clean.slice(0, 8)}... to whitelist!`);
  };

  const handleRemoveWallet = (address: string) => {
    if (!window.confirm(`Remove ${address} from whitelist?`)) return;
    const updated = { ...whitelistedWallets };
    delete updated[address.toLowerCase()];
    onUpdateWhitelistedWallets(updated);
    showToast('info', `Removed wallet ${address.slice(0, 8)}...`);
  };

  // Bulk Import Wallets
  const handleBulkImport = () => {
    const lines = bulkWalletsInput
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const validAddresses: string[] = [];
    for (const line of lines) {
      const addr = line.toLowerCase();
      if (addr.startsWith('0x') && addr.length === 42 && !validAddresses.includes(addr)) {
        validAddresses.push(addr);
      }
    }

    if (validAddresses.length === 0) {
      showToast('error', 'No valid EVM addresses found in input.');
      return;
    }

    const updated = { ...whitelistedWallets };
    for (const addr of validAddresses) {
      updated[addr] = {
        status: 'WHITELISTED',
        tier: 'Bulk Whitelisted (Wave 1)',
        allocation: '2 NFTs (Guaranteed)',
      };
    }

    onUpdateWhitelistedWallets(updated);
    setBulkWalletsInput('');
    setShowBulkModal(false);
    showToast('success', `Successfully imported and whitelisted ${validAddresses.length} wallets!`);
  };

  // Quest / Task management
  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, active: !t.active } : t));
    onUpdateTasks(updated);
    showToast('info', 'Quest status toggled.');
  };

  const handleDeleteTask = (taskId: string) => {
    if (tasks.length <= 1) {
      showToast('warning', 'You must maintain at least one community quest.');
      return;
    }
    if (!window.confirm('Delete this community quest?')) return;
    const updated = tasks.filter((t) => t.id !== taskId);
    onUpdateTasks(updated);
    showToast('info', 'Quest removed.');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskUrl.trim()) {
      showToast('error', 'Title and Action URL are required.');
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Complete this task to verify your whitelist eligibility.',
      type: 'custom',
      action_url: newTaskUrl.trim(),
      required: newTaskRequired,
      verification_method: 'instant',
      active: true,
      sort_order: tasks.length + 1,
      isCompleted: false,
    };

    onUpdateTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskUrl('');
    setShowNewTaskModal(false);
    showToast('success', 'New community quest created!');
  };

  // Export options
  const exportContractArray = useMemo(() => {
    const approved = (Object.entries(whitelistedWallets) as [string, WhitelistedWalletInfo][])
      .filter(([_, data]) => data.status === 'WHITELISTED')
      .map(([addr]) => addr);
    return JSON.stringify(approved, null, 2);
  }, [whitelistedWallets]);

  const handleExportCSV = () => {
    const headers = 'Wallet Address,X Handle,Status,Tier,Submitted At\n';
    const rows = submissions
      .map(
        (s) =>
          `"${s.walletAddress}","${s.xHandle || ''}","${s.status}","${s.tier}","${new Date(s.submittedAt).toISOString()}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bunink_whitelist_submissions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Submissions CSV downloaded.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-display">
                  BunInk Admin Portal
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Creator Console
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage Inkonchain L2 whitelist submissions, proofs, and smart contract snapshots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer hidden sm:block"
              >
                Lock Session
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Admin Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Authentication Gate Screen */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center my-auto space-y-6 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-xl shadow-purple-950/50">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white font-display">
                Admin Authentication Required
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Enter your project admin passkey to inspect whitelist proofs, approve applicants, or export contract snapshot arrays.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-3">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter admin passkey (default: bunink2026)"
                  value={passkeyInput}
                  onChange={(e) => {
                    setPasskeyInput(e.target.value);
                    setPasskeyError('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 font-mono"
                  autoFocus
                />
              </div>

              {passkeyError && (
                <p className="text-xs text-rose-400 text-left font-mono">{passkeyError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Admin Portal</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800 w-full">
              <button
                type="button"
                onClick={handleQuickLogin}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Access as Project Creator (1-Click)</span>
              </button>
              <p className="text-[11px] text-slate-500 mt-1">Default passkey: <code className="text-purple-300">bunink2026</code></p>
            </div>
          </div>
        ) : (
          <>
            {/* Nav Tabs */}
            <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'submissions'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Applications & Proofs</span>
                {stats.pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {stats.pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('wallets')}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'wallets'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Whitelist Wallets</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                  {stats.totalWhitelistedWallets}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'tasks'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Quest Manager ({tasks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'export'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileJson className="w-4 h-4" />
                <span>Contract Export</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/20 space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Collection</span>
                      <p className="text-2xl font-black text-white font-mono">{stats.totalSupply}</p>
                      <p className="text-[11px] text-purple-300">Inkonchain Genesis Cap</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/20 space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Whitelisted Wallets</span>
                      <p className="text-2xl font-black text-emerald-400 font-mono">{stats.totalWhitelistedWallets}</p>
                      <p className="text-[11px] text-slate-400">Snapshot Ready</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/20 space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Pending Applications</span>
                      <p className="text-2xl font-black text-amber-400 font-mono">{stats.pendingCount}</p>
                      <p className="text-[11px] text-slate-400">Awaiting Audit</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Applications</span>
                      <p className="text-2xl font-black text-purple-300 font-mono">{stats.totalSubmissions}</p>
                      <p className="text-[11px] text-slate-400">Registered Submissions</p>
                    </div>
                  </div>

                  {/* Quick Action Hero Deck */}
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-950/90 to-purple-900/30 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Ready for Snapshot Generation</h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                        Review pending applicant proofs, approve verified community members, and export the final cryptographic EVM address array for deployment.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      <button
                        onClick={() => setActiveTab('submissions')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Review Submissions ({stats.pendingCount})</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('export')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <FileJson className="w-3.5 h-3.5" />
                        <span>Copy Merkle JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Recent Submissions Snapshot */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Recent Applicant Submissions
                      </h4>
                      <button
                        onClick={() => setActiveTab('submissions')}
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All Submissions</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-950/70 border border-slate-800 overflow-hidden">
                      {submissions.slice(0, 5).map((sub) => (
                        <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-white font-medium">
                                {sub.walletAddress}
                              </span>
                              <button
                                onClick={() => handleCopy(sub.walletAddress, sub.id)}
                                className="text-slate-500 hover:text-purple-300 transition-colors cursor-pointer"
                                title="Copy EVM Address"
                              >
                                {copiedKey === sub.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>Proofs: {sub.proofs.length} quests</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                sub.status === 'WHITELISTED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : sub.status === 'REJECTED'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {sub.status}
                            </span>

                            {sub.status === 'PENDING' && (
                              <button
                                onClick={() => handleApproveSubmission(sub.id, sub.walletAddress)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {submissions.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-xs">
                          No submissions logged yet. When users submit their addresses on the frontend, they will appear here.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: APPLICATIONS & PROOFS */}
              {activeTab === 'submissions' && (
                <div className="space-y-4">
                  {/* Controls Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search wallet 0x... or handle"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Filter Chips */}
                      <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                        {(['ALL', 'PENDING', 'WHITELISTED', 'REJECTED'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setStatusFilter(filter)}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                              statusFilter === filter
                                ? 'bg-purple-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>

                      {/* Action buttons */}
                      {stats.pendingCount > 0 && (
                        <button
                          onClick={handleApproveAllPending}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve All Pending ({stats.pendingCount})</span>
                        </button>
                      )}

                      <button
                        onClick={handleExportCSV}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Submissions List */}
                  <div className="space-y-3">
                    {filteredSubmissions.map((sub) => {
                      const isExpanded = expandedSubmissionId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 transition-all hover:border-slate-700 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-bold text-white">
                                  {sub.walletAddress}
                                </span>
                                <button
                                  onClick={() => handleCopy(sub.walletAddress, sub.id)}
                                  className="text-slate-500 hover:text-purple-300 cursor-pointer"
                                  title="Copy address"
                                >
                                  {copiedKey === sub.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <a
                                  href={`https://explorer.inkonchain.com/address/${sub.walletAddress}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-0.5"
                                  title="View on Inkonchain Explorer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                                <span>•</span>
                                <span>Tier: <strong className="text-purple-300">{sub.tier}</strong></span>
                              </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                  sub.status === 'WHITELISTED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : sub.status === 'REJECTED'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {sub.status}
                              </span>

                              {sub.status !== 'WHITELISTED' && (
                                <button
                                  onClick={() => handleApproveSubmission(sub.id, sub.walletAddress)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}

                              {sub.status !== 'REJECTED' && (
                                <button
                                  onClick={() => handleRejectSubmission(sub.id, sub.walletAddress)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}

                              {sub.status !== 'PENDING' && (
                                <button
                                  onClick={() => handleResetSubmission(sub.id, sub.walletAddress)}
                                  className="px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Reset to Pending"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{isExpanded ? 'Hide Proofs' : `Proofs (${sub.proofs.length})`}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteSubmission(sub.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete submission"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Proof Details */}
                          {isExpanded && (
                            <div className="pt-3 border-t border-slate-800/80 space-y-2.5 bg-slate-900/50 p-3 rounded-xl">
                              <p className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                                Submitted Quest Proofs:
                              </p>
                              {sub.proofs && sub.proofs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {sub.proofs.map((p, idx) => (
                                    <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                                      <span className="text-[11px] font-semibold text-purple-300 block">
                                        {p.taskTitle || p.taskId}
                                      </span>
                                      <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-300 break-all">
                                        <span>{p.proof}</span>
                                        {p.proof.startsWith('http') && (
                                          <a
                                            href={p.proof}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-purple-400 hover:text-purple-300 shrink-0"
                                            title="Open link to verify"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic">No specific proofs recorded.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredSubmissions.length === 0 && (
                      <div className="p-12 text-center rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-sm font-semibold text-slate-400">No submissions found</p>
                        <p className="text-xs text-slate-500">Try adjusting your search query or status filter.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: WHITELIST WALLETS (DIRECT STORAGE) */}
              {activeTab === 'wallets' && (
                <div className="space-y-6">
                  {/* Top Bar: Add & Bulk Import */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/20 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white font-display">Add Whitelisted Address</h4>
                        <p className="text-xs text-slate-400">Directly grant mint allocation to team, partner, or VIP addresses.</p>
                      </div>

                      <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Bulk Import Addresses</span>
                      </button>
                    </div>

                    <form onSubmit={handleAddSingleWallet} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <input
                        type="text"
                        placeholder="0x... (EVM Address)"
                        value={newWalletAddress}
                        onChange={(e) => setNewWalletAddress(e.target.value)}
                        className="sm:col-span-6 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Tier (e.g. Wave 1 Guaranteed)"
                        value={newWalletTier}
                        onChange={(e) => setNewWalletTier(e.target.value)}
                        className="sm:col-span-3 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="submit"
                        className="sm:col-span-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Wallet</span>
                      </button>
                    </form>
                  </div>

                  {/* Registered Wallets Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-mono">
                      <span>Total Registered: {Object.keys(whitelistedWallets).length}</span>
                      <span>Cap: 2,222</span>
                    </div>

                    <div className="divide-y divide-slate-800 rounded-2xl bg-slate-950/70 border border-slate-800 overflow-hidden">
                      {(Object.entries(whitelistedWallets) as [string, WhitelistedWalletInfo][]).map(([addr, item]) => (
                        <div key={addr} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-white">{addr}</span>
                              <button
                                onClick={() => handleCopy(addr, addr)}
                                className="text-slate-500 hover:text-purple-300 cursor-pointer"
                              >
                                {copiedKey === addr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {item.tier} • <strong className="text-purple-300">{item.allocation}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                item.status === 'WHITELISTED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {item.status}
                            </span>
                            <button
                              onClick={() => handleRemoveWallet(addr)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Remove from whitelist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: QUEST / TASK MANAGER */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white font-display">Community Verification Quests</h4>
                      <p className="text-xs text-slate-400">Configure the exact tasks required before applicants can unlock EVM submission.</p>
                    </div>

                    <button
                      onClick={() => setShowNewTaskModal(true)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Quest</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {tasks.map((task, index) => (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          task.active
                            ? 'bg-slate-950/80 border-slate-800'
                            : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Quest 0{index + 1}
                              </span>
                              <h5 className="text-sm font-bold text-white">{task.title}</h5>
                              {task.required && (
                                <span className="text-[10px] font-semibold text-amber-400 uppercase">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{task.description}</p>
                            <a
                              href={task.action_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono"
                            >
                              <span>{task.action_url}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                task.active
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {task.active ? 'Active' : 'Disabled'}
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete quest"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: CONTRACT EXPORT */}
              {activeTab === 'export' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white font-display">Inkonchain Whitelist Snapshot Array</h4>
                    <p className="text-xs text-slate-400">
                      Copy this clean JSON array of approved EVM addresses to feed into your Merkle tree generator or Solidity smart contract.
                    </p>
                  </div>

                  <div className="relative">
                    <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-purple-300 font-mono text-xs max-h-80 overflow-y-auto">
                      {exportContractArray}
                    </pre>

                    <button
                      onClick={() => handleCopy(exportContractArray, 'merkle')}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      {copiedKey === 'merkle' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'merkle' ? 'Copied Array' : 'Copy JSON Array'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                    <span>Format: Standard EVM string array (`string[]` / `address[]`)</span>
                    <button
                      onClick={handleExportCSV}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Applicant CSV File</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </>
        )}

      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-display">Bulk Import Whitelist Addresses</h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste EVM addresses separated by commas or newlines. Any invalid addresses will be automatically skipped.
            </p>

            <textarea
              rows={6}
              placeholder="0x71C8413204c38fF240097621f37e42d713c72B22&#10;0x1234567890123456789012345678901234567890"
              value={bulkWalletsInput}
              onChange={(e) => setBulkWalletsInput(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 font-mono text-xs focus:outline-none focus:border-purple-500"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
              >
                Import Wallets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-display">Create Community Quest</h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Quest Title</label>
                <input
                  type="text"
                  placeholder="e.g. Join Official BunInk Discord"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Action URL</label>
                <input
                  type="url"
                  placeholder="https://discord.gg/..."
                  value={newTaskUrl}
                  onChange={(e) => setNewTaskUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Explain what the user must do..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newTaskRequired"
                  checked={newTaskRequired}
                  onChange={(e) => setNewTaskRequired(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="newTaskRequired" className="text-xs text-slate-300">
                  Required quest (must be verified before submitting address)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                >
                  Create Quest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
