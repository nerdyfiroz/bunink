import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { TasksSection } from './components/TasksSection.tsx';
import { EligibilityChecker } from './components/EligibilityChecker.tsx';
import { RoadmapSection } from './components/RoadmapSection.tsx';
import { Footer } from './components/Footer.tsx';
import { Toast } from './components/Toast.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { Task, WhitelistApplication, WhitelistCheckResponse, ToastMessage, WhitelistSubmission } from './types.ts';
import { DEFAULT_TASKS, INITIAL_WHITELISTED_WALLETS, INITIAL_SUBMISSIONS } from './data/mockData.ts';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bunink_theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });

  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.hash === '#admin' ||
        window.location.search.includes('admin=true')
      );
    }
    return false;
  });

  const [whitelistedWallets, setWhitelistedWallets] = useState<Record<string, { status: 'WHITELISTED' | 'PENDING' | 'REJECTED'; tier: string; allocation: string }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bunink_wallets');
      if (saved) {
        try {
          return { ...INITIAL_WHITELISTED_WALLETS, ...JSON.parse(saved) };
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_WHITELISTED_WALLETS;
  });

  const [submissions, setSubmissions] = useState<WhitelistSubmission[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bunink_submissions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_SUBMISSIONS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bunink_tasks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Clean up any tasks saved with dummy/empty proofs like "Verified via X intent" or "Verified"
            return parsed.map((t: Task) => {
              if (
                t.userProof === 'Verified via X intent' ||
                t.userProof === 'Verified' ||
                !t.userProof ||
                !t.userProof.trim()
              ) {
                return { ...t, isCompleted: false, userProof: undefined };
              }
              return t;
            });
          }
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_TASKS;
  });


  const [application, setApplication] = useState<WhitelistApplication | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bunink_app');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return null;
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Sync dark mode class on documentElement
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bunink_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bunink_theme', 'light');
    }
  }, [darkMode]);

  // Listen for hash changes (#admin) or keyboard shortcut (Ctrl+Shift+A or Alt+A)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
        (e.altKey && (e.key === 'a' || e.key === 'A'))
      ) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };

    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Update document title based on status
  useEffect(() => {
    if (application) {
      if (application.status === 'WHITELISTED') {
        document.title = 'BunInk — Whitelist Approved';
      } else {
        document.title = 'BunInk — Whitelist Submitted';
      }
      return;
    }

    const totalTasks = tasks.length;
    const completedCount = tasks.filter((t) => t.isCompleted).length;

    if (totalTasks > 0 && completedCount === totalTasks) {
      document.title = 'BunInk — Tasks Completed (Ready to Submit)';
    } else if (completedCount > 0) {
      document.title = `BunInk — (${completedCount}/${totalTasks} Tasks Completed)`;
    } else {
      document.title = 'BunInk — Official Inkonchain Mint';
    }
  }, [application, tasks]);


  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  const showToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now().toString();
    setToast({ id, type, message });
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        closeToast();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast, closeToast]);

  // Attempt to fetch fresh tasks from /api/tasks if running in fullstack mode
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.tasks) && data.tasks.length > 0) {
            setTasks((currentTasks) => {
              // Preserve completion status
              return data.tasks.map((remoteTask: Task) => {
                const existing = currentTasks.find((t) => t.id === remoteTask.id);
                return {
                  ...remoteTask,
                  isCompleted: existing ? existing.isCompleted : false,
                  userProof: existing ? existing.userProof : undefined,
                };
              });
            });
          }
        }
      } catch {
        // Fallback already in place
      }
    };

    fetchTasks();
  }, []);

  // Save tasks to localStorage - requires actual typed proof
  const handleCompleteTask = (taskId: string, proof: string) => {
    const trimmedProof = proof.trim();
    if (!trimmedProof) return;

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, isCompleted: true, userProof: trimmedProof } : t
      );
      localStorage.setItem('bunink_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  // Reset/clear task proof so user can re-enter cleanly
  const handleResetTask = (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, isCompleted: false, userProof: undefined } : t
      );
      localStorage.setItem('bunink_tasks', JSON.stringify(updated));
      return updated;
    });
    showToast('info', 'Task proof cleared. You can now enter your proof.');
  };

  // Handle whitelist application submission
  const handleSubmitApplication = async (walletAddress: string, xHandle?: string): Promise<boolean> => {
    const normalized = walletAddress.toLowerCase();
    const newApp: WhitelistApplication = {
      walletAddress: walletAddress,
      xHandle,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      tier: 'Wave 1 Priority Candidate (Under Review)',
    };

    // Store in localStorage
    localStorage.setItem('bunink_app', JSON.stringify(newApp));
    setApplication(newApp);

    // Update local wallet database
    const updatedWallets = {
      ...whitelistedWallets,
      [normalized]: {
        status: 'PENDING' as const,
        tier: 'Wave 1 Priority Candidate (Under Review)',
        allocation: 'Up to 2 NFTs (Subject to Review)',
      },
    };
    setWhitelistedWallets(updatedWallets);
    localStorage.setItem('bunink_wallets', JSON.stringify(updatedWallets));

    // Also append to admin submissions log with submitted quest proofs
    const newSubmission: WhitelistSubmission = {
      id: `sub-${Date.now()}`,
      walletAddress: walletAddress,
      xHandle,
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      tier: 'Wave 1 Priority Candidate',
      allocation: 'Up to 2 NFTs (Subject to Review)',
      proofs: tasks
        .filter((t) => t.userProof)
        .map((t) => ({ taskId: t.id, taskTitle: t.title, proof: t.userProof || '' })),
    };

    setSubmissions((prev) => {
      const filtered = prev.filter((s) => s.walletAddress.toLowerCase() !== normalized);
      const updated = [newSubmission, ...filtered];
      localStorage.setItem('bunink_submissions', JSON.stringify(updated));
      return updated;
    });

    // Try submitting to /api/whitelist/submit if endpoint exists
    try {
      await fetch('/api/whitelist/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          proofs: tasks.map((t) => ({ id: t.id, proof: t.userProof })),
        }),
      });
    } catch {
      // Ignored since we persist locally
    }

    showToast('info', 'Application submitted! Note: Submission does not guarantee a whitelist slot; spots are subject to review.');
    return true;
  };

  // State handlers for Admin Panel
  const handleUpdateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('bunink_tasks', JSON.stringify(newTasks));
  };

  const handleUpdateWhitelistedWallets = (newWallets: Record<string, { status: 'WHITELISTED' | 'PENDING' | 'REJECTED'; tier: string; allocation: string }>) => {
    setWhitelistedWallets(newWallets);
    localStorage.setItem('bunink_wallets', JSON.stringify(newWallets));
  };

  const handleUpdateSubmissions = (newSubmissions: WhitelistSubmission[]) => {
    setSubmissions(newSubmissions);
    localStorage.setItem('bunink_submissions', JSON.stringify(newSubmissions));
  };

  // Handle checking wallet status
  const handleCheckStatus = async (walletAddress: string): Promise<WhitelistCheckResponse> => {
    const normalized = walletAddress.trim().toLowerCase();

    // 1. Check local wallet store first (updated via Admin Panel or user submission)
    if (whitelistedWallets[normalized]) {
      const match = whitelistedWallets[normalized];
      return {
        found: true,
        status: match.status,
        wallet: walletAddress,
        tier: match.tier,
        allocation: match.allocation,
      };
    }

    // 2. Check if user just submitted this
    if (application && application.walletAddress.toLowerCase() === normalized) {
      return {
        found: true,
        status: application.status,
        wallet: application.walletAddress,
        tier: application.tier || 'Wave 1 Priority (Pending Review)',
        allocation: application.status === 'WHITELISTED' ? '2 NFTs' : 'Up to 2 NFTs (Pending Review)',
        submittedAt: application.submittedAt,
      };
    }

    // 3. Try checking remote API /api/whitelist/check
    try {
      const res = await fetch(`/api/whitelist/check?wallet=${encodeURIComponent(walletAddress)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          return {
            found: true,
            status: data.status || 'WHITELISTED',
            wallet: walletAddress,
            tier: data.tier || 'Wave 1 Allocation',
            allocation: data.allocation || '1 NFT',
          };
        }
      }
    } catch {
      // fallback
    }

    return {
      found: false,
      status: 'NOT_FOUND',
      wallet: walletAddress,
    };
  };

  const scrollToTasks = () => {
    const el = document.getElementById('tasks');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openAdminPortal = () => {
    setIsAdminOpen(true);
  };

  const closeAdminPortal = () => {
    setIsAdminOpen(false);
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col justify-between overflow-x-hidden">
      {/* Existing Animated Background Theme with INKON chain logo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Soft atmospheric gradient orbs */}
        <div className="absolute top-[10%] right-[5%] w-[600px] h-[600px] bg-gradient-to-br from-[#7B3FE4]/25 via-purple-600/15 to-transparent blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-[-5%] left-[-5%] w-[650px] h-[650px] bg-gradient-to-br from-[#6D28D9]/25 via-[#7B3FE4]/15 to-transparent blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[750px] h-[750px] bg-gradient-to-tl from-[#7B3FE4]/20 via-[#00D2FF]/10 to-transparent blur-[160px] rounded-full pointer-events-none" />

        {/* Floating Inkonchain Theme Logo 1 (Top Left) */}
        <div className="absolute top-[5%] left-[2%] w-60 h-60 sm:w-80 sm:h-80 md:w-[420px] md:h-[420px] opacity-15 dark:opacity-40 animate-inkonchain-float-1 transform -rotate-12 pointer-events-none">
          <img
            src="/theme.png"
            alt="Inkonchain Theme Logo"
            className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(123,63,228,0.3)] dark:drop-shadow-[0_0_50px_rgba(123,63,228,0.6)]"
          />
        </div>

        {/* Floating Inkonchain Theme Logo 2 (Bottom Right) */}
        <div className="absolute bottom-[6%] right-[3%] w-64 h-64 sm:w-88 sm:h-88 md:w-[460px] md:h-[460px] opacity-15 dark:opacity-40 animate-inkonchain-float-2 transform rotate-12 pointer-events-none">
          <img
            src="/theme.png"
            alt="Inkonchain Theme Logo"
            className="w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(168,85,247,0.3)] dark:drop-shadow-[0_0_55px_rgba(168,85,247,0.6)]"
          />
        </div>

        {/* Ambient Center Subtle Inkonchain Glow */}
        <div className="hidden lg:block absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-5 dark:opacity-15 animate-roadmap-glow-breathe pointer-events-none">
          <img
            src="/theme.png"
            alt="Inkonchain Ambient Logo"
            className="w-full h-full object-contain filter blur-[3px]"
          />
        </div>
      </div>

      {/* Toast notifications */}
      <Toast toast={toast} onClose={closeToast} />

      {/* Navigation Header */}
      <div className="relative z-10 w-full">
        <Navbar
          onJoinWhitelistClick={scrollToTasks}
          onOpenAdmin={openAdminPortal}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
        {/* Hero Section with NFT Preview */}
        <Hero onJoinClick={scrollToTasks} />

        {/* Step 1: Community Tasks & Application Submission */}
        <TasksSection
          tasks={tasks}
          onCompleteTask={handleCompleteTask}
          onResetTask={handleResetTask}
          onSubmitApplication={handleSubmitApplication}
          application={application}
          showToast={showToast}
        />

        {/* Step 2: Eligibility Status Checker */}
        <EligibilityChecker
          onCheckStatus={handleCheckStatus}
          userSubmittedWallet={application?.walletAddress}
          showToast={showToast}
        />

        {/* Project Roadmap Section */}
        <RoadmapSection />
      </main>

      {/* Footer */}
      <div className="relative z-10 w-full">
        <Footer onOpenAdmin={openAdminPortal} />
      </div>

      {/* Admin Panel Portal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={closeAdminPortal}
        tasks={tasks}
        onUpdateTasks={handleUpdateTasks}
        whitelistedWallets={whitelistedWallets}
        onUpdateWhitelistedWallets={handleUpdateWhitelistedWallets}
        submissions={submissions}
        onUpdateSubmissions={handleUpdateSubmissions}
        showToast={showToast}
      />
    </div>
  );
}

