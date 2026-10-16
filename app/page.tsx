'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  LayoutDashboard, History, Brain, Award, BookOpen, 
  FileText, Calendar, Target, Star, Settings, Plus, Sparkles, TrendingUp, 
  LineChart as ChartIcon, HelpCircle, Edit3, Trash2, LogOut, LogIn, Lock, Mail, Eye, EyeOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Home() {
  const supabase = createClient();

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // App State
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [showModal, setShowModal] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'IDR' | 'CENT'>('USD');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);

  // Trades State
  const [trades, setTrades] = useState<any[]>([]);

  // Form State Trade
  const [form, setForm] = useState({
    pair: 'XAUUSD',
    position: 'BUY',
    lot: '0.1',
    entry: '',
    sl: '',
    tp: '',
    status: 'WIN',
    inputAmount: '',
    inputCurrency: 'USD' as 'USD' | 'IDR' | 'CENT',
    emotion: 'Tenang',
    setup: 'Breakout'
  });

  // 1. Cek User Session & Ambil Data
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchTrades(session.user.id);
        }
      } catch (err) {
        console.error('Session error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTrades(session.user.id);
      } else {
        setTrades([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch Trades
  const fetchTrades = async (userId: string) => {
    setTradesLoading(true);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false });

    if (!error && data) {
      const mapped = data.map((t: any) => ({
        id: t.id,
        date: t.entry_date ? new Date(t.entry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-',
        pair: t.pair || 'XAUUSD',
        position: t.position || 'BUY',
        lot: t.lot || '0.1',
        entry: t.entry || 0,
        sl: t.sl || 0,
        tp: t.tp || 0,
        status: t.status || 'WIN',
        netPnlUSD: parseFloat(t.pnl || '0'),
        emotion: t.emotion || 'Tenang',
        setup: t.setup || 'Breakout'
      }));
      setTrades(mapped);
    } else if (error) {
      console.error('Fetch error:', error.message);
    }
    setTradesLoading(false);
  };

  // 3. Login / Register Email & Password
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password 
        });

        if (error) {
          setAuthError(error.message);
        } else if (data.user && data.session) {
          setAuthSuccess('Registrasi berhasil! Anda langsung masuk.');
          setUser(data.user);
        } else {
          setAuthSuccess('Registrasi berhasil! Silakan cek email Anda untuk konfirmasi, atau langsung coba Login.');
          setAuthMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAuthError('Email atau Password salah! Periksa kembali data Anda.');
        } else {
          setUser(data.user);
        }
      }
    } catch (err: any) {
      setAuthError('Gagal terhubung ke server.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 4. Login dengan Google
  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      });
      if (error) setAuthError(error.message);
    } catch (err) {
      setAuthError('Gagal menghubungkan ke Google OAuth.');
    }
  };

  // 5. Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTrades([]);
  };

  // Format Mata Uang
  const formatCurrency = (amountUSD: number) => {
    if (currency === 'IDR') {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amountUSD * 15800);
    } else if (currency === 'CENT') {
      return `${(amountUSD * 100).toLocaleString()} ¢`;
    }
    return `$${amountUSD.toFixed(2)}`;
  };

  // Statistik
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.status === 'WIN').length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';
  const netPnlUSDTotal = trades.reduce((acc, curr) => acc + curr.netPnlUSD, 0);

  const grossProfit = trades.filter(t => t.netPnlUSD > 0).reduce((acc, curr) => acc + curr.netPnlUSD, 0);
  const grossLoss = Math.abs(trades.filter(t => t.netPnlUSD < 0).reduce((acc, curr) => acc + curr.netPnlUSD, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 'MAX' : '0.00';

  const equityData = trades.length > 0 ? trades.slice().reverse().reduce((acc: any[], curr, idx) => {
    const prevEquity = idx === 0 ? 10000 : acc[idx - 1].equity;
    acc.push({ date: curr.date.split(' ')[0] + ' ' + curr.date.split(' ')[1], equity: prevEquity + curr.netPnlUSD });
    return acc;
  }, []) : [{ date: 'Start', equity: 10000 }];

  // Simpan / Edit Trade
  const handleSaveTrade = async () => {
    if (!user) {
      alert("Silakan login terlebih dahulu!");
      return;
    }

    const parseNum = (val: string) => {
      if (!val) return 0;
      const cleanVal = val.toString().replace(',', '.');
      const num = parseFloat(cleanVal);
      return isNaN(num) ? 0 : num;
    };

    const rawVal = parseNum(form.inputAmount);
    let usdValue = rawVal;
    if (form.inputCurrency === 'IDR') {
      usdValue = rawVal / 15800;
    } else if (form.inputCurrency === 'CENT') {
      usdValue = rawVal / 100;
    }

    const finalNetPnlUSD = form.status === 'LOSS' ? -Math.abs(usdValue) : Math.abs(usdValue);

    const tradePayload = {
      user_id: user.id,
      entry_date: new Date().toISOString(),
      pair: form.pair || 'XAUUSD',
      position: form.position || 'BUY',
      lot: parseNum(form.lot) || 0.1,
      entry: parseNum(form.entry),
      sl: parseNum(form.sl),
      tp: parseNum(form.tp),
      status: form.status || 'WIN',
      pnl: finalNetPnlUSD,
      emotion: form.emotion || 'Tenang',
      setup: form.setup || 'Breakout'
    };

    if (editingId) {
      const { error } = await supabase.from('trades').update(tradePayload).eq('id', editingId);

      if (error) {
        alert('Gagal update: ' + error.message);
      } else {
        fetchTrades(user.id);
        setShowModal(false);
        setEditingId(null);
      }
    } else {
      const { error } = await supabase.from('trades').insert([tradePayload]);

      if (error) {
        alert('Gagal menyimpan: ' + error.message);
      } else {
        fetchTrades(user.id);
        setShowModal(false);
        setEditingId(null);
      }
    }

    setForm({ pair: 'XAUUSD', position: 'BUY', lot: '0.1', entry: '', sl: '', tp: '', status: 'WIN', inputAmount: '', inputCurrency: 'USD', emotion: 'Tenang', setup: 'Breakout' });
  };

  const handleEdit = (t: any) => {
    setForm({
      pair: t.pair,
      position: t.position,
      lot: t.lot.toString(),
      entry: t.entry.toString(),
      sl: t.sl.toString(),
      tp: t.tp.toString(),
      status: t.status,
      inputAmount: Math.abs(t.netPnlUSD).toString(),
      inputCurrency: 'USD',
      emotion: t.emotion,
      setup: t.setup
    });
    setEditingId(t.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catatan trade ini dari database?')) {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (!error && user) fetchTrades(user.id);
    }
  };

  // TAMPILAN LOGIN / REGISTER
  if (!user && !authLoading) {
    return (
      <div className="flex h-screen bg-[#0B1020] text-[#F4F7FB] items-center justify-center p-4">
        <div className="bg-[#172238] border border-[#36D6E8]/30 rounded-2xl w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-wider text-[#36D6E8] flex items-center justify-center gap-2">
              <TrendingUp className="w-7 h-7" /> TRADE MIRROR
            </h1>
            <p className="text-xs text-[#94A3B8] tracking-widest mt-1">AI TRADING JOURNAL</p>
            <p className="text-xs text-[#F4F7FB] mt-3 font-semibold">“Lo trading, sistem yang jadi cermin.”</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-[#10182B] hover:bg-[#10182B]/80 border border-[#94A3B8]/20 text-[#F4F7FB] font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-3 transition mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Lanjut dengan Google
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-[#94A3B8]/20"></div>
            <span className="px-3 text-[10px] text-[#94A3B8] uppercase">atau dengan email</span>
            <div className="flex-1 border-t border-[#94A3B8]/20"></div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="bg-[#FF647C]/10 border border-[#FF647C]/40 text-[#FF647C] text-xs p-3 rounded-xl text-center">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="bg-[#22C58B]/10 border border-[#22C58B]/40 text-[#22C58B] text-xs p-3 rounded-xl text-center">
                {authSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader@gmail.com" 
                  className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-xl py-2.5 pl-9 pr-3 text-xs text-[#F4F7FB] outline-none focus:border-[#36D6E8]"
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-xl py-2.5 pl-9 pr-10 text-xs text-[#F4F7FB] outline-none focus:border-[#36D6E8]"
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#94A3B8] hover:text-[#F4F7FB]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-[#36D6E8] text-[#0B1020] font-bold py-3 rounded-xl text-xs hover:bg-[#36D6E8]/90 transition"
            >
              {authLoading ? 'Memproses...' : authMode === 'login' ? 'Masuk ke Akun' : 'Daftar Akun Baru'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#94A3B8]">
            {authMode === 'login' ? (
              <p>Belum punya akun? <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-[#36D6E8] font-bold underline">Daftar Sekarang</button></p>
            ) : (
              <p>Sudah punya akun? <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-[#36D6E8] font-bold underline">Masuk Saja</button></p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN UTAMA DASHBOARD
  return (
    <div className="flex h-screen bg-[#0B1020] text-[#F4F7FB] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#10182B] border-r border-[#94A3B8]/10 flex flex-col justify-between p-4 hidden md:flex">
        <div>
          <div className="mb-4 px-2">
            <h1 className="text-xl font-bold tracking-wider text-[#36D6E8] flex items-center gap-2">
              <TrendingUp className="w-6 h-6" /> TRADE MIRROR
            </h1>
            <p className="text-[10px] text-[#94A3B8] tracking-widest mt-0.5">AI TRADING JOURNAL</p>
          </div>

          <div className="mb-4 p-3 bg-[#172238] rounded-xl border border-[#94A3B8]/10">
            <p className="text-[10px] text-[#94A3B8]">AKUN TERHUBUNG:</p>
            <p className="text-xs font-bold text-[#36D6E8] truncate mt-0.5">{user?.email}</p>
          </div>

          <div className="mb-4 p-2 bg-[#172238] rounded-xl border border-[#94A3B8]/10">
            <p className="text-[10px] font-bold text-[#94A3B8] mb-1.5 px-1">TAMPILAN LAPORAN:</p>
            <div className="grid grid-cols-3 gap-1 bg-[#10182B] p-1 rounded-lg">
              {(['USD', 'IDR', 'CENT'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`py-1 text-[11px] font-bold rounded-md transition ${
                    currency === curr ? 'bg-[#36D6E8] text-[#0B1020]' : 'text-[#94A3B8] hover:text-[#F4F7FB]'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-2">MENU</p>
            {[
              { name: 'Dashboard', icon: LayoutDashboard },
              { name: 'Trade Log', icon: History },
              { name: 'Chart', icon: ChartIcon },
              { name: 'Calendar', icon: Calendar },
              { name: 'Emosi', icon: Brain },
              { name: 'Cara Kerja System', icon: HelpCircle },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveMenu(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeMenu === item.name 
                    ? 'bg-[#36D6E8]/10 text-[#36D6E8] border border-[#36D6E8]/20 font-semibold' 
                    : 'text-[#94A3B8] hover:text-[#F4F7FB] hover:bg-[#172238]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#94A3B8]/10 pt-3">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#FF647C] bg-[#FF647C]/10 hover:bg-[#FF647C]/20 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" /> Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 bg-[#0B1020]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#172238] p-6 rounded-2xl border border-[#94A3B8]/10 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#F4F7FB]">{activeMenu}</h1>
            <p className="text-xs text-[#94A3B8] mt-1">Laporan Akun: <span className="text-[#36D6E8] font-bold">{user?.email}</span> | Mode: <span className="text-[#36D6E8] font-bold">{currency}</span></p>
          </div>
          <div>
            <button 
              onClick={() => { setEditingId(null); setShowModal(true); }}
              className="bg-[#36D6E8] text-[#0B1020] font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-[#36D6E8]/90 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Catat Trade 60s
            </button>
          </div>
        </div>

        {activeMenu === 'Dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#172238] p-5 rounded-2xl border border-[#94A3B8]/10">
                <p className="text-xs text-[#94A3B8]">Win Rate</p>
                <h3 className="text-3xl font-black text-[#22C58B] mt-2">{winRate}%</h3>
                <span className="text-[10px] text-[#94A3B8] mt-1 block">Dari {totalTrades} Transaksi Selesai</span>
              </div>
              <div className="bg-[#172238] p-5 rounded-2xl border border-[#94A3B8]/10">
                <p className="text-xs text-[#94A3B8]">Net Profit / Loss ({currency})</p>
                <h3 className={`text-2xl font-black mt-2 ${netPnlUSDTotal >= 0 ? 'text-[#22C58B]' : 'text-[#FF647C]'}`}>
                  {formatCurrency(netPnlUSDTotal)}
                </h3>
                <span className="text-[10px] text-[#94A3B8] mt-1 block">Tersimpan di Cloud Database</span>
              </div>
              <div className="bg-[#172238] p-5 rounded-2xl border border-[#94A3B8]/10">
                <p className="text-xs text-[#94A3B8]">Profit Factor</p>
                <h3 className="text-3xl font-black text-[#36D6E8] mt-2">{profitFactor}</h3>
                <span className="text-[10px] text-[#94A3B8] mt-1 block">Gross Profit / Gross Loss</span>
              </div>
              <div className="bg-[#172238] p-5 rounded-2xl border border-[#94A3B8]/10">
                <p className="text-xs text-[#94A3B8]">Average Risk:Reward</p>
                <h3 className="text-3xl font-black text-[#F4F7FB] mt-2">1 : 2.5</h3>
                <span className="text-[10px] text-[#94A3B8] mt-1 block">Manajemen Risiko Ideal</span>
              </div>
            </div>

            <div className="bg-[#172238] p-6 rounded-2xl border border-[#94A3B8]/10">
              <h3 className="text-base font-bold mb-4 text-[#F4F7FB]">Grafik Equity Curve Performa Akun</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#10182B" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#10182B', borderColor: '#36D6E8', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="equity" stroke="#36D6E8" strokeWidth={3} dot={{ fill: '#36D6E8' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'Trade Log' && (
          <div className="bg-[#172238] p-6 rounded-2xl border border-[#94A3B8]/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-[#F4F7FB]">Riwayat Transaksi Tersimpan Cloud</h3>
              <p className="text-xs text-[#94A3B8]">Laporan Dalam: <span className="text-[#36D6E8] font-bold">{currency}</span></p>
            </div>
            {tradesLoading ? (
              <p className="text-xs text-[#94A3B8] py-8 text-center">Memuat data dari Supabase...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#94A3B8]">
                  <thead className="bg-[#10182B] text-[#F4F7FB] uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Pair</th>
                      <th className="p-3">Posisi</th>
                      <th className="p-3">Setup</th>
                      <th className="p-3">Entry / SL / TP</th>
                      <th className="p-3">Lot</th>
                      <th className="p-3">Hasil</th>
                      <th className="p-3">Net P/L ({currency})</th>
                      <th className="p-3">Emosi</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#94A3B8]/10">
                    {trades.map((t) => (
                      <tr key={t.id} className="hover:bg-[#10182B]">
                        <td className="p-3">{t.date}</td>
                        <td className="p-3 font-semibold text-[#F4F7FB]">{t.pair}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${t.position === 'BUY' ? 'bg-[#22C58B]/20 text-[#22C58B]' : 'bg-[#FF647C]/20 text-[#FF647C]'}`}>
                            {t.position}
                          </span>
                        </td>
                        <td className="p-3 text-[#36D6E8] font-semibold">{t.setup}</td>
                        <td className="p-3">{t.entry} / {t.sl} / {t.tp}</td>
                        <td className="p-3">{t.lot}</td>
                        <td className="p-3">
                          <span className={`font-bold ${t.status === 'WIN' ? 'text-[#22C58B]' : 'text-[#FF647C]'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className={`p-3 font-bold ${t.netPnlUSD >= 0 ? 'text-[#22C58B]' : 'text-[#FF647C]'}`}>
                          {formatCurrency(t.netPnlUSD)}
                        </td>
                        <td className="p-3"><span className="bg-[#8B7CFF]/20 text-[#8B7CFF] px-2 py-0.5 rounded">{t.emotion}</span></td>
                        <td className="p-3 flex justify-center gap-2">
                          <button onClick={() => handleEdit(t)} className="p-1 hover:text-[#36D6E8]" title="Edit"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(t.id)} className="p-1 hover:text-[#FF647C]" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeMenu === 'Chart' && (
          <div className="bg-[#172238] p-4 rounded-2xl border border-[#94A3B8]/10 h-[80vh]">
            <iframe 
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=OANDA%3AXAUUSD&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=10182B&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FJakarta"
              className="w-full h-full rounded-xl border-0"
            ></iframe>
          </div>
        )}

        {activeMenu === 'Calendar' && (
          <div className="bg-[#172238] p-4 rounded-2xl border border-[#94A3B8]/10 h-[80vh]">
            <iframe 
              src="https://www.forexfactory.com/calendar?flex=1"
              className="w-full h-full rounded-xl border-0 bg-white"
            ></iframe>
          </div>
        )}

        {activeMenu === 'Cara Kerja System' && (
          <div className="space-y-6 text-xs text-[#94A3B8]">
            <div className="bg-[#172238] p-6 rounded-2xl border border-[#36D6E8]/30">
              <h2 className="text-base font-bold text-[#36D6E8] mb-3">🔍 Sistem Autentikasi & Database Cloud Supabase</h2>
              <p className="mb-4">Data jurnal Anda kini tersimpan di cloud database PostgreSQL Supabase dengan RLS dalam status UNRESTRICTED.</p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL INPUT / EDIT TRADE */}
      {showModal && (
        <div className="fixed inset-0 bg-[#0B1020]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#172238] border border-[#36D6E8]/30 rounded-2xl w-full max-w-md p-6 shadow-2xl text-[#F4F7FB]">
            <div className="flex justify-between items-center mb-4 border-b border-[#94A3B8]/10 pb-3">
              <h2 className="text-base font-bold text-[#36D6E8]">{editingId ? '✏️ Edit Catatan Trade' : '+ Catat Trade 60 Detik'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#94A3B8] hover:text-[#F4F7FB]">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Pair</label>
                  <input type="text" value={form.pair} onChange={e => setForm({...form, pair: e.target.value})} className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none" />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Setup / Teknik</label>
                  <select value={form.setup} onChange={e => setForm({...form, setup: e.target.value})} className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none">
                    <option value="Breakout">Breakout</option>
                    <option value="SNR">SNR</option>
                    <option value="SMC/ICT">SMC/ICT</option>
                    <option value="Pullback">Pullback</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Posisi</label>
                  <select value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none">
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Lot Size</label>
                  <input type="number" step="0.01" value={form.lot} onChange={e => setForm({...form, lot: e.target.value})} className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Entry Price</label>
                  <input type="number" step="any" value={form.entry} onChange={e => setForm({...form, entry: e.target.value})} placeholder="2350.50" className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none" />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Stop Loss</label>
                  <input type="number" step="any" value={form.sl} onChange={e => setForm({...form, sl: e.target.value})} placeholder="2345.00" className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none" />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1">Take Profit</label>
                  <input type="number" step="any" value={form.tp} onChange={e => setForm({...form, tp: e.target.value})} placeholder="2365.00" className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#94A3B8] mb-1">Hasil Trade</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none">
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#94A3B8] mb-1">Nilai Profit/Loss</label>
                  <input type="number" value={form.inputAmount} onChange={e => setForm({...form, inputAmount: e.target.value})} placeholder="145" className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none" />
                </div>

                <div>
                  <label className="block text-[#36D6E8] font-bold mb-1">Mata Uang</label>
                  <select value={form.inputCurrency} onChange={e => setForm({...form, inputCurrency: e.target.value as any})} className="w-full bg-[#10182B] border border-[#36D6E8]/50 rounded-lg p-2 text-[#36D6E8] font-bold outline-none">
                    <option value="USD">$ USD</option>
                    <option value="IDR">Rp IDR</option>
                    <option value="CENT">¢ CENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] mb-1">Kondisi Emosi</label>
                <select value={form.emotion} onChange={e => setForm({...form, emotion: e.target.value})} className="w-full bg-[#10182B] border border-[#94A3B8]/20 rounded-lg p-2 text-[#F4F7FB] outline-none">
                  <option value="Tenang">Tenang</option>
                  <option value="Disiplin">Disiplin</option>
                  <option value="FOMO">FOMO</option>
                  <option value="Geregetan">Geregetan / Revenge</option>
                </select>
              </div>

              <button 
                onClick={handleSaveTrade}
                type="button" 
                className="w-full bg-[#36D6E8] text-[#0B1020] font-bold py-2.5 rounded-xl text-xs hover:bg-[#36D6E8]/90 transition mt-4"
              >
                {editingId ? 'Simpan Perubahan' : 'Simpan ke Cloud Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}