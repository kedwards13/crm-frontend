import React, { useContext, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  LayoutGrid,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PieChart,
  Plus,
  Search,
  Settings as SettingsIcon,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { AuthContext } from '../../App';

type IconType = React.ComponentType<{ className?: string }>;

type NavItem = {
  name: string;
  icon: IconType;
};

type DockAction = {
  name: string;
  icon: IconType;
  active?: boolean;
};

type ActionCardProps = {
  icon: IconType;
  label: string;
  sub: string;
  delay: number;
};

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

type ActivityItem = {
  name: string;
  action: string;
  time: string;
  type: 'call' | 'email' | 'missed' | 'calendar';
};

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: LayoutGrid },
  { name: 'Leads', icon: Zap },
  { name: 'Customers', icon: Users },
  { name: 'Schedule', icon: Calendar },
  { name: 'Communications', icon: MessageSquare },
  { name: 'Analytics', icon: PieChart },
  { name: 'Finance', icon: Wallet },
  { name: 'Marketing', icon: TrendingUp },
];

const dockActions: DockAction[] = [
  { name: 'Messages', icon: MessageSquare, active: true },
  { name: 'Calls', icon: Phone },
  { name: 'Schedule', icon: Calendar },
  { name: 'Insights', icon: TrendingUp },
];

const activityItems: ActivityItem[] = [
  { name: 'Lisa Matthews', action: 'Called and left a voicemail', time: '2m ago', type: 'call' },
  { name: 'Mark Sanderson', action: 'Replied to email campaign', time: '15m ago', type: 'email' },
  { name: 'Unknown Caller', action: 'Missed call from (239)...', time: '1h ago', type: 'missed' },
  { name: 'Julie Parker', action: 'Scheduled consultation', time: '2h ago', type: 'calendar' },
];

const getDisplayName = (user: any) => {
  const raw =
    user?.first_name ||
    user?.firstName ||
    user?.name ||
    user?.full_name ||
    user?.email ||
    'Operator';

  return String(raw).split('@')[0].split(' ')[0] || 'Operator';
};

const AGIDashboard = () => {
  const { user } = useContext(AuthContext) || {};
  const displayName = useMemo(() => getDisplayName(user), [user]);
  const userInitial = displayName.charAt(0).toUpperCase();
  const [isListening, setIsListening] = useState(false);
  const [dockInput, setDockInput] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <div className='relative min-h-[calc(100vh-var(--topbar-height)-14px)] w-full overflow-hidden rounded-3xl bg-[#060b17] font-["SF_Pro_Display","Manrope","Segoe_UI",sans-serif] text-white selection:bg-amber-200/30'>
      <div className='fixed inset-0 pointer-events-none'>
        <div
          className='absolute right-[-8%] top-[-16%] h-[760px] w-[760px] animate-pulse rounded-full bg-amber-300/20 blur-[130px] mix-blend-screen'
          style={{ animationDuration: '9s' }}
        />
        <div className='absolute bottom-[-20%] left-[-12%] h-[880px] w-[880px] rounded-full bg-cyan-300/15 blur-[150px] mix-blend-screen' />
        <div className='absolute left-[22%] top-[10%] h-[220px] w-[52%] rounded-full bg-gradient-to-r from-cyan-200/15 via-amber-100/20 to-transparent blur-[70px]' />
        <div className='absolute left-[34%] top-[24%] h-[520px] w-[520px] rounded-full bg-slate-300/10 blur-[100px] mix-blend-overlay' />
      </div>

      <div className='relative z-10 flex h-[calc(100vh-var(--topbar-height)-14px)] gap-4 p-4 md:gap-6 md:p-6'>
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className='hidden h-full w-72 flex-col rounded-3xl border border-white/[0.14] bg-[#0a1327]/55 p-6 shadow-2xl backdrop-blur-2xl xl:flex'
        >
          <div className='mb-10 flex items-center gap-4 px-2'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-gradient-to-br from-[#f5d3a4] via-[#8cb8ff] to-[#9de6ff] shadow-lg shadow-sky-400/30'>
              <span className='text-xl font-bold text-[#0f172a]'>A</span>
            </div>
            <div>
              <h2 className='text-lg font-semibold tracking-wide'>Abon AI</h2>
              <p className='text-xs uppercase tracking-[0.22em] text-white/45'>Command Center</p>
            </div>
          </div>

          <nav className='flex-1 space-y-2'>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;

              return (
                <button
                  key={item.name}
                  type='button'
                  onClick={() => setActiveTab(item.name)}
                  className={`group flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'border border-white/25 bg-gradient-to-r from-white/15 via-white/10 to-cyan-200/10 text-white shadow-lg shadow-black/20'
                      : 'text-white/55 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-colors ${isActive ? 'text-amber-200' : 'group-hover:text-cyan-100'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className='mt-auto border-t border-white/5 pt-6'>
            <button type='button' className='group flex w-full items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/5'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-tr from-slate-700 to-slate-600'>
                <span className='text-sm font-bold'>{userInitial}</span>
              </div>
              <div className='text-left'>
                <p className='text-sm font-medium text-white transition-colors group-hover:text-amber-100'>{displayName}</p>
                <p className='text-xs text-white/40'>Admin</p>
              </div>
              <SettingsIcon className='ml-auto h-4 w-4 text-white/30 transition-colors group-hover:text-white' />
            </button>
          </div>
        </motion.aside>

        <div className='relative flex h-full min-w-0 flex-1 flex-col gap-6 overflow-hidden'>
          <header className='shrink-0'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-3xl font-bold text-transparent'
                >
                  Good morning, {displayName}.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className='mt-1 text-white/40'
                >
                  How can I help you today?
                </motion.p>
              </div>

              <div className='group relative hidden w-96 max-w-full md:block'>
                <div className='absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-200/25 via-white/10 to-amber-200/30 opacity-0 blur transition duration-500 group-hover:opacity-100' />
                <div className='relative flex items-center rounded-2xl border border-white/20 bg-[#0a1528]/55 px-4 py-3 backdrop-blur-xl'>
                  <Search className='mr-3 h-5 w-5 text-white/40' />
                  <input
                    type='text'
                    placeholder='Search leads, tasks, or ask AI...'
                    className='w-full border-none bg-transparent text-sm font-light text-white placeholder-white/30 outline-none'
                  />
                  <div className='rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white/50'>CMD+K</div>
                </div>
              </div>
            </div>
          </header>

          <div className='custom-scrollbar flex-1 space-y-6 overflow-y-auto pb-48 pr-2'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <ActionCard icon={MessageSquare} label='Review new leads' sub='+10 added overnight' delay={0.1} />
              <ActionCard icon={Zap} label='Draft campaign' sub='Create email blast' delay={0.2} />
              <ActionCard icon={PieChart} label='Check analytics' sub='View weekly report' delay={0.3} />
              <ActionCard icon={Users} label='Follow-up emails' sub='18 pending replies' delay={0.4} />
            </div>

            <div className='grid h-auto grid-cols-1 gap-6 lg:h-[400px] lg:grid-cols-3'>
              <GlassCard className='relative col-span-1 flex flex-col overflow-hidden lg:col-span-2'>
                <div className='pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-amber-200/20 blur-[80px] transition-colors duration-700 group-hover:bg-cyan-200/25' />

                <div className='relative z-10 mb-6 flex items-start justify-between'>
                  <div>
                    <h3 className='mb-1 font-medium text-white/60'>Total Revenue</h3>
                    <div className='text-4xl font-bold tracking-tight text-white'>$124,530</div>
                  </div>
                  <div className='flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400'>
                    <ArrowUpRight className='h-3 w-3' /> +12.5%
                  </div>
                </div>

                <div className='mt-auto flex flex-1 items-end justify-between gap-2'>
                  {[35, 45, 40, 60, 55, 70, 65, 80, 75, 90, 85, 100].map((height, index) => (
                    <motion.div
                      key={`${height}-${index}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 1, delay: index * 0.05 }}
                      className='w-full rounded-t-sm bg-gradient-to-t from-white/10 via-white/15 to-cyan-100/30 transition-all duration-300 hover:from-amber-200/30 hover:to-cyan-200/80'
                    />
                  ))}
                </div>
              </GlassCard>

              <div className='flex h-full flex-col gap-6'>
                <GlassCard className='relative flex flex-1 flex-col justify-center overflow-hidden'>
                  <div className='absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-200/30 blur-[40px]' />
                  <div className='relative z-10'>
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='text-3xl font-bold'>10</span>
                      <span className='rounded-lg bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400'>High Priority</span>
                    </div>
                    <p className='text-sm text-white/50'>New leads added today</p>
                    <div className='mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10'>
                      <div className='h-full w-[70%] bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300' />
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className='relative flex flex-1 flex-col justify-center overflow-hidden'>
                  <div className='absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-200/30 blur-[40px]' />
                  <div className='relative z-10'>
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='text-3xl font-bold'>+$15.2k</span>
                      <Activity className='h-5 w-5 text-amber-200' />
                    </div>
                    <p className='text-sm text-white/50'>Pipeline value increase</p>
                  </div>
                </GlassCard>
              </div>
            </div>

            <GlassCard className='overflow-hidden p-0'>
              <div className='flex items-center justify-between border-b border-white/5 bg-white/[0.01] p-6'>
                <h3 className='text-lg font-semibold'>Recent Activity</h3>
                <button type='button' className='text-xs font-medium text-cyan-200 transition-colors hover:text-cyan-100'>
                  View All
                </button>
              </div>
              <div className='divide-y divide-white/5'>
                {activityItems.map((item) => (
                  <button
                    key={`${item.time}-${item.name}`}
                    type='button'
                    className='group flex w-full items-center p-4 text-left transition-colors hover:bg-white/5'
                  >
                    <div
                      className={`mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/5 ${
                        item.type === 'call'
                          ? 'bg-blue-500/10 text-blue-400'
                          : item.type === 'missed'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-white/5 text-white/60'
                      }`}
                    >
                      {item.type === 'call' && <Phone className='h-4 w-4' />}
                      {item.type === 'email' && <MessageSquare className='h-4 w-4' />}
                      {item.type === 'missed' && <Phone className='h-4 w-4' />}
                      {item.type === 'calendar' && <Calendar className='h-4 w-4' />}
                    </div>
                    <div className='flex-1'>
                      <h4 className='text-sm font-medium transition-colors group-hover:text-white'>{item.name}</h4>
                      <p className='text-xs text-white/40'>{item.action}</p>
                    </div>
                    <span className='font-mono text-xs text-white/20'>{item.time}</span>
                    <ChevronRight className='ml-4 h-4 w-4 text-white/10 transition-all group-hover:translate-x-1 group-hover:text-white/60' />
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className='pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center px-2 sm:px-6'>
            <div className='pointer-events-auto w-full max-w-5xl rounded-[2rem] border border-white/20 bg-[#090f1f]/45 p-3 shadow-[0_28px_80px_rgba(6,10,20,0.58)] backdrop-blur-[26px]'>
              <div className='flex items-center gap-3'>
                <div className='hidden items-center gap-2 sm:flex'>
                  {dockActions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        type='button'
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                          item.active
                            ? 'border-white/35 bg-gradient-to-br from-white/30 to-cyan-200/20 text-white shadow-[0_0_20px_rgba(147,197,253,0.35)]'
                            : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                        }`}
                        aria-label={item.name}
                      >
                        <Icon className='h-4 w-4' />
                      </button>
                    );
                  })}
                </div>

                <div className='relative flex-1'>
                  <div className='absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan-200/20 via-white/10 to-amber-200/30 blur-sm' />
                  <div className='relative flex items-center gap-3 rounded-2xl border border-white/25 bg-[#091325]/60 px-4 py-2.5'>
                    <Search className='h-4 w-4 text-white/50' />
                    <input
                      type='text'
                      value={dockInput}
                      onChange={(event) => setDockInput(event.target.value)}
                      placeholder='Ask Abon to analyze leads, draft follow-ups, or suggest offers...'
                      className='h-6 flex-1 border-none bg-transparent text-sm text-white placeholder-white/45 outline-none'
                    />
                    <div className='hidden rounded-lg border border-white/20 px-2 py-1 text-[10px] font-medium tracking-wide text-white/55 sm:block'>
                      CMD+K
                    </div>
                  </div>
                </div>

                <button
                  type='button'
                  className='flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20'
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>

              <div className='mt-3 flex items-center gap-3'>
                <button
                  type='button'
                  onClick={() => setIsListening((value) => !value)}
                  className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isListening
                      ? 'border-amber-100/70 bg-gradient-to-br from-amber-200/50 via-amber-100/35 to-cyan-200/40 shadow-[0_0_34px_rgba(251,191,36,0.48)]'
                      : 'border-white/40 bg-gradient-to-br from-[#8fb3ff]/35 via-[#f6d6a6]/20 to-[#9de9ff]/35 shadow-[0_0_30px_rgba(125,211,252,0.45)]'
                  }`}
                >
                  {isListening ? <MicOff className='h-5 w-5 text-white' /> : <Mic className='h-5 w-5 text-white' />}
                </button>

                <div className='flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/20 bg-gradient-to-r from-[#0a162b]/70 via-[#111b31]/65 to-[#151a30]/65 px-4 py-2.5'>
                  <p className='flex-1 truncate text-sm text-white/80'>
                    I suggest offering a limited-time discount to re-engage warm leads and boost reply rates.
                  </p>
                  <button type='button' className='rounded-full border border-white/20 bg-white/10 p-2 text-white/85 hover:bg-white/20'>
                    <ChevronRight className='h-4 w-4' />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionCard = ({ icon: Icon, label, sub, delay }: ActionCardProps) => (
  <GlassCard className='group flex cursor-pointer items-center gap-4 p-5 hover:bg-white/[0.08]' delay={delay}>
    <div className='flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20'>
      <Icon className='h-5 w-5 text-white/80 transition-colors group-hover:text-amber-100' />
    </div>
    <div>
      <h3 className='text-sm font-medium text-white/90'>{label}</h3>
      <p className='text-xs text-white/50 transition-colors group-hover:text-white/70'>{sub}</p>
    </div>
    <ChevronRight className='ml-auto h-4 w-4 text-white/10 transition-all group-hover:translate-x-1 group-hover:text-white/40' />
  </GlassCard>
);

const GlassCard = ({ children, className = '', delay = 0 }: GlassCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={`rounded-3xl border border-white/[0.17] bg-gradient-to-br from-white/[0.12] via-white/[0.05] to-white/[0.04] p-6 shadow-2xl backdrop-blur-xl ${className}`}
  >
    {children}
  </motion.div>
);

export default AGIDashboard;
