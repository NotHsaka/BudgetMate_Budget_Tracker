import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const STORE_KEY = "tally-finance-v3";
const THEME_KEY = "tally-theme";
const categories = [
  { name: "Housing", color: "#4d91ff", limit: 12000 },
  { name: "Food", color: "#ff5b75", limit: 5000 },
  { name: "Transportation", color: "#ffb11b", limit: 2500 },
  { name: "Utilities", color: "#15b8ce", limit: 3000 },
  { name: "Entertainment", color: "#9365ff", limit: 2000 },
  { name: "Health", color: "#20bd8b", limit: 1500 },
  { name: "Shopping", color: "#f07845", limit: 2000 },
  { name: "Miscellaneous", color: "#8492a6", limit: 1500 },
];
const incomeCategories = ["Salary", "Freelance", "Investment", "Allowance", "Gift", "Other income"];
const paymentMethods = ["Cash", "GCash", "Maya", "Bank Transfer", "Card / Debit", "Credit Card", "QR Ph", "Other"];
const providers = ["Cash", "GCash", "Maya", "GoTyme Bank", "BDO", "BPI", "UnionBank", "Landbank", "Metrobank", "CIMB", "Coins.ph", "Other"];
const money = (amount) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(Number(amount || 0));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const monthOf = (date) => String(date || "").slice(0, 7);
const monthName = (key) => { const [year, month] = key.split("-").map(Number); return new Date(year, month - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" }); };
const dateName = (date) => {
  if (!date)
    return ""; const [year, month, day] = date.split("-").map(Number); return new Date(year, month - 1, day).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const defaultWallets = () => [
  { id: "cash", name: "Everyday cash", provider: "Cash", kind: "cash", openingBalance: 0, color: "#16bd8b" },
  { id: "gcash", name: "GCash wallet", provider: "GCash", kind: "ewallet", openingBalance: 0, color: "#4d91ff" },
  { id: "maya", name: "Maya wallet", provider: "Maya", kind: "ewallet", openingBalance: 0, color: "#15b8ce" },
  { id: "bank", name: "Main bank", provider: "BDO", kind: "bank", openingBalance: 0, color: "#9365ff" },
];
const emptyStore = () => ({ transactions: [], limits: Object.fromEntries(categories.map((c) => [c.name, c.limit])), goals: [], recurringRules: [], wallets: defaultWallets(), transfers: [] });
function loadLocal() {
  try {
    let raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const prior = localStorage.getItem("tally-finance-v2");
      if (prior) {
        const old = JSON.parse(prior);
        const base = emptyStore();
        const categoryMap = { Food: "Food", Transport: "Transportation", Bills: "Utilities", Fun: "Entertainment", Other: "Miscellaneous" };
        if (Array.isArray(old.transactions)) {
          base.transactions = old.transactions.filter((t) => t && ["income", "expense"].includes(t.type) && Number(t.amount) > 0).map((t) => ({ ...t, id: String(t.id || uid()), amount: Number(t.amount), category: t.category || "Miscellaneous", payment: t.payment || "Cash", walletId: t.walletId || "cash", notes: t.notes || "" }));
          base.limits = { ...base.limits, ...(old.limits || {}) };
        }
        else if (Array.isArray(old.expenses)) {
          base.transactions = old.expenses.map((t) => ({ id: uid(), type: "expense", title: String(t.note || t.category || "Expense"), amount: Number(t.cents || 0) / 100, date: String(t.date || today()), category: categoryMap[t.category] || "Miscellaneous", payment: "Cash", walletId: "cash", notes: "" })).filter((t) => t.amount > 0);
        }
        return base;
      }
      const legacy = localStorage.getItem("tally-budget-tracker-v2");
      if (legacy) {
        const old = JSON.parse(legacy);
        const base = emptyStore();
        base.transactions = (old.transactions || []).filter((t) => t && ["income", "expense"].includes(t.type) && Number(t.amount) > 0).map((t) => ({ ...t, id: String(t.id || uid()), amount: Number.isInteger(t.amount) ? Number(t.amount) / 100 : Number(t.amount), walletId: "cash", payment: t.payment || "Cash", notes: t.notes || "" }));
        return base;
      }
      return emptyStore();
    }
    const parsed = JSON.parse(raw);
    return {
      ...emptyStore(), ...parsed,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions.filter((t) => t && ["income", "expense"].includes(t.type) && Number(t.amount) > 0).map((t) => ({ ...t, amount: Number(t.amount), walletId: t.walletId || "cash", notes: t.notes || "" })) : [],
      limits: { ...emptyStore().limits, ...(parsed.limits || {}) },
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      recurringRules: Array.isArray(parsed.recurringRules) ? parsed.recurringRules : [],
      wallets: Array.isArray(parsed.wallets) && parsed.wallets.length ? parsed.wallets : defaultWallets(),
      transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
    };
  }
  catch {
    return emptyStore();
  }
}
function Icon({ children }) { return <span className="icon-glyph" aria-hidden="true">{children}</span>; }
function Modal({ title, eyebrow, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><div><p className="eyebrow">{eyebrow || "BUDGETMATE WORKSPACE"}</p><h2>{title}</h2></div><button className="icon-button close-button" onClick={onClose} aria-label="Close">×</button></div>{children}</section></div>;
}
export default function App() {
  const [data, setData] = useState(loadLocal);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");
  const [month, setMonth] = useState(monthOf(today()));
  const [modal, setModal] = useState("");
  const [form, setForm] = useState({ type: "expense", title: "", amount: "", date: today(), category: "Food", payment: "GCash", walletId: "gcash", notes: "", repeatMonthly: false });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState(supabase ? "Connect your account" : "Local mode");
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", target: "", saved: "0", deadline: "" });
  const [walletForm, setWalletForm] = useState({ name: "", provider: "GCash", kind: "ewallet", openingBalance: "0", color: "#4d91ff" });
  const [transferForm, setTransferForm] = useState({ fromId: "cash", toId: "gcash", amount: "", date: today(), note: "" });
  const [recurringDue, setRecurringDue] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    }
    catch {
      setToast("Browser storage is full. Export a backup to keep your data safe.");
    }
  }, [data]);
  useEffect(() => {
    if (!toast)
      return; const timer = setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!supabase)
      return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!alive)
        return;
      const currentUser = sessionData.session?.user || null;
      setUser(currentUser);
      if (currentUser)
        await loadCloud(currentUser.id);
      else
        setCloudReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION")
        return;
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser)
        setTimeout(() => loadCloud(currentUser.id), 0);
      else {
        setCloudReady(true);
        setSyncStatus("Signed out · local data available");
      }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);
  async function loadCloud(userId) {
    if (!supabase)
      return;
    setSyncStatus("Syncing cloud data…");
    const { data: row, error } = await supabase.from("tally_user_data").select("data").eq("user_id", userId).maybeSingle();
    if (error) {
      setSyncStatus("Cloud setup needed");
      setToast("Set up the Supabase table and policies using the supplied SQL file.");
      setCloudReady(true);
      return;
    }
    if (row?.data)
      setData({ ...emptyStore(), ...row.data, limits: { ...emptyStore().limits, ...(row.data.limits || {}) }, wallets: row.data.wallets?.length ? row.data.wallets : defaultWallets() });
    else {
      const { error: saveError } = await supabase.from("tally_user_data").upsert({ user_id: userId, data: loadLocal(), updated_at: new Date().toISOString() });
      if (saveError)
        setSyncStatus("Sync failed");
    }
    setCloudReady(true);
    setSyncStatus("Cloud synced");
  }
  useEffect(() => {
    if (!supabase || !user || !cloudReady)
      return;
    setSyncStatus("Syncing…");
    const timer = setTimeout(async () => {
      const { error } = await supabase.from("tally_user_data").upsert({ user_id: user.id, data, updated_at: new Date().toISOString() });
      setSyncStatus(error ? "Sync failed" : "Cloud synced");
      if (error)
        setToast("Cloud sync failed. Your data remains saved locally.");
    }, 700);
    return () => clearTimeout(timer);
  }, [data, user, cloudReady]);
  useEffect(() => {
    const currentMonth = monthOf(today());
    setData((current) => {
      const additions = (current.recurringRules || []).filter((rule) => {
        if (!rule.active || rule.startDate > today())
          return false;
        const [year, monthNumber] = currentMonth.split("-").map(Number);
        const day = Math.min(rule.day, new Date(year, monthNumber, 0).getDate());
        const dueDate = `${currentMonth}-${String(day).padStart(2, "0")}`;
        return dueDate <= today() && !current.transactions.some((t) => t.recurringRuleId === rule.id && monthOf(t.date) === currentMonth);
      }).map((rule) => {
        const [year, monthNumber] = currentMonth.split("-").map(Number);
        const day = Math.min(rule.day, new Date(year, monthNumber, 0).getDate());
        return { id: uid(), recurringRuleId: rule.id, type: rule.type, title: rule.title, amount: rule.amount, date: `${currentMonth}-${String(day).padStart(2, "0")}`, category: rule.category, payment: rule.payment, walletId: rule.walletId, notes: rule.notes || "" };
      });
      return additions.length ? { ...current, transactions: [...current.transactions, ...additions] } : current;
    });
  }, [data.recurringRules]);
  const monthTransactions = useMemo(() => data.transactions.filter((t) => monthOf(t.date) === month), [data.transactions, month]);
  const previousMonth = useMemo(() => { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }, [month]);
  const previousTransactions = useMemo(() => data.transactions.filter((t) => monthOf(t.date) === previousMonth), [data.transactions, previousMonth]);
  const summary = useMemo(() => {
    const sum = (list, type) => list.filter((t) => t.type === type).reduce((total, t) => total + Number(t.amount), 0);
    const income = sum(monthTransactions, "income");
    const expenses = sum(monthTransactions, "expense");
    const priorExpenses = sum(previousTransactions, "expense");
    const priorIncome = sum(previousTransactions, "income");
    const byCategory = Object.fromEntries(categories.map((c) => [c.name, 0]));
    monthTransactions.filter((t) => t.type === "expense").forEach((t) => { byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount); });
    const budget = Number(data.monthlyBudget?.[month] || 0);
    return { income, expenses, balance: income - expenses, savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0, byCategory, budget, remaining: budget - expenses, expenseChange: priorExpenses ? Math.round(((expenses - priorExpenses) / priorExpenses) * 100) : null, incomeChange: priorIncome ? Math.round(((income - priorIncome) / priorIncome) * 100) : null };
  }, [monthTransactions, previousTransactions, data.monthlyBudget, month]);
  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...monthTransactions].filter((t) => typeFilter === "all" || t.type === typeFilter).filter((t) => categoryFilter === "all" || t.category === categoryFilter).filter((t) => paymentFilter === "all" || t.payment === paymentFilter).filter((t) => !q || `${t.title} ${t.notes} ${t.category} ${t.payment} ${(data.wallets.find((w) => w.id === t.walletId)?.name || "")}`.toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTransactions, search, typeFilter, categoryFilter, paymentFilter, data.wallets]);
  const categoryTotal = categories.reduce((total, c) => total + (summary.byCategory[c.name] || 0), 0);
  const donut = categories.reduce((state, c) => {
    const value = summary.byCategory[c.name] || 0; if (value > 0 && categoryTotal > 0) {
      const pct = value / categoryTotal * 100;
      state.parts.push(`${c.color} ${state.start}% ${state.start + pct}%`);
      state.start += pct;
    } return state;
  }, { parts: [], start: 0 });
  const recentDays = useMemo(() => { const [y, m] = month.split("-").map(Number); const days = new Date(y, m, 0).getDate(); return Array.from({ length: days }, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, "0")}`; return { date, income: monthTransactions.filter((t) => t.date === date && t.type === "income").reduce((s, t) => s + t.amount, 0), expense: monthTransactions.filter((t) => t.date === date && t.type === "expense").reduce((s, t) => s + t.amount, 0) }; }).filter((x) => x.income || x.expense).slice(-9); }, [monthTransactions, month]);
  function openAdd(type = "expense") { setEditingId(null); setForm({ type, title: "", amount: "", date: today(), category: type === "income" ? "Salary" : "Food", payment: "GCash", walletId: data.wallets[0]?.id || "cash", notes: "", repeatMonthly: false }); setModal("transaction"); }
  function openEdit(item) { setEditingId(item.id); setForm({ ...item, amount: String(item.amount), repeatMonthly: false }); setModal("transaction"); }
  function updateForm(field, value) { setForm((current) => ({ ...current, [field]: value, ...(field === "type" ? { category: value === "income" ? "Salary" : "Food" } : {}) })); }
  function saveTransaction(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date || !form.category || !form.payment || !form.walletId) {
      setToast("Complete all required fields and enter an amount greater than ₱0.");
      return;
    }
    const id = editingId || uid();
    const ruleId = `repeat-${id}`;
    const transaction = { id, type: form.type, title: form.title.trim(), amount: Math.round(amount * 100) / 100, date: form.date, category: form.category, payment: form.payment, walletId: form.walletId, notes: form.notes.trim(), ...(!editingId && form.repeatMonthly ? { recurringRuleId: ruleId } : {}) };
    setData((current) => ({ ...current, transactions: editingId ? current.transactions.map((t) => t.id === editingId ? transaction : t) : [...current.transactions, transaction], recurringRules: !editingId && form.repeatMonthly ? [...current.recurringRules, { id: ruleId, title: transaction.title, type: transaction.type, amount: transaction.amount, category: transaction.category, payment: transaction.payment, walletId: transaction.walletId, notes: transaction.notes, day: Number(transaction.date.slice(8, 10)), startDate: transaction.date, active: true }] : current.recurringRules }));
    setMonth(monthOf(transaction.date));
    setModal("");
    setToast(editingId ? "Transaction updated." : form.repeatMonthly ? "Transaction saved with monthly repeat." : "Transaction added.");
  }
  function deleteTransaction(id) {
    const item = data.transactions.find((t) => t.id === id); if (!item || !window.confirm(`Delete “${item.title}”?`))
      return; setData((current) => ({ ...current, transactions: current.transactions.filter((t) => t.id !== id) })); setToast("Transaction deleted.");
  }
  function saveGoal(event) {
    event.preventDefault(); const target = Number(goalForm.target); const saved = Number(goalForm.saved || 0); if (!goalForm.name.trim() || target <= 0 || saved < 0) {
      setToast("Enter a goal name and valid target.");
      return;
    } setData((current) => ({ ...current, goals: [...current.goals, { id: uid(), name: goalForm.name.trim(), target, saved, deadline: goalForm.deadline }] })); setGoalForm({ name: "", target: "", saved: "0", deadline: "" }); setModal(""); setToast("Savings goal created.");
  }
  function addGoalSavings(goal) {
    const value = window.prompt(`How much would you like to add to ${goal.name}?`); if (value === null)
      return; const amount = Number(value); if (!Number.isFinite(amount) || amount <= 0) {
        setToast("Enter a valid amount.");
        return;
      } setData((current) => ({ ...current, goals: current.goals.map((g) => g.id === goal.id ? { ...g, saved: g.saved + amount } : g) }));
  }
  function saveWallet(event) {
    event.preventDefault(); const balance = Number(walletForm.openingBalance || 0); if (!walletForm.name.trim() || balance < 0 || !Number.isFinite(balance)) {
      setToast("Enter a valid account name and balance.");
      return;
    } setData((current) => ({ ...current, wallets: [...current.wallets, { ...walletForm, id: uid(), name: walletForm.name.trim(), openingBalance: balance }] })); setWalletForm({ name: "", provider: "GCash", kind: "ewallet", openingBalance: "0", color: "#4d91ff" }); setModal(""); setToast("Account added.");
  }
  function walletBalance(wallet) { const tx = data.transactions.filter((t) => t.walletId === wallet.id).reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0); const transfers = data.transfers.reduce((sum, t) => sum + (t.toId === wallet.id ? t.amount : t.fromId === wallet.id ? -t.amount : 0), 0); return Number(wallet.openingBalance || 0) + tx + transfers; }
  function saveTransfer(event) {
    event.preventDefault(); const amount = Number(transferForm.amount); if (transferForm.fromId === transferForm.toId || amount <= 0 || !Number.isFinite(amount)) {
      setToast("Choose two different accounts and enter a valid amount.");
      return;
    } const from = data.wallets.find((w) => w.id === transferForm.fromId); if (amount > walletBalance(from)) {
      setToast("The amount exceeds the tracked balance of the source account.");
      return;
    } setData((current) => ({ ...current, transfers: [...current.transfers, { ...transferForm, id: uid(), amount, note: transferForm.note.trim() }] })); setModal(""); setToast("Transfer recorded without affecting income or expenses.");
  }
  function saveLimits(event) {
    event.preventDefault(); const limits = {}; for (const c of categories) {
      const val = Number(limitInputs[c.name] || 0);
      if (!Number.isFinite(val) || val < 0) {
        setToast(`Enter a valid limit for ${c.name}.`);
        return;
      }
      limits[c.name] = val;
    } setData((current) => ({ ...current, limits })); setModal(""); setToast("Monthly category limits saved.");
  }
  function exportJSON() { download(`tally-backup-${today()}.json`, JSON.stringify({ ...data, exportedAt: new Date().toISOString(), currency: "PHP" }, null, 2), "application/json"); setMenuOpen(false); setToast("JSON backup exported."); }
  function exportCSV() { const header = ["Type", "Title", "Amount (PHP)", "Date", "Category", "Payment Method", "Wallet", "Notes"]; const rows = data.transactions.map((t) => [t.type, t.title, Number(t.amount).toFixed(2), t.date, t.category, t.payment, data.wallets.find((w) => w.id === t.walletId)?.name || "", t.notes || ""]); const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n"); download(`tally-transactions-${today()}.csv`, csv, "text/csv;charset=utf-8;"); setMenuOpen(false); setToast("CSV exported."); }
  function download(filename, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
  function importFile(event) {
    const file = event.target.files?.[0]; if (!file)
      return; const reader = new FileReader(); reader.onload = () => {
        try {
          const raw = String(reader.result);
          let incoming;
          if (file.name.toLowerCase().endsWith(".csv")) {
            const lines = raw.split(/\r?\n/).filter(Boolean);
            const parseRow = (line) => {
              const result = []; let value = ""; let quoted = false; for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"' && line[i + 1] === '"' && quoted) {
                  value += '"';
                  i++;
                }
                else if (ch === '"')
                  quoted = !quoted;
                else if (ch === "," && !quoted) {
                  result.push(value);
                  value = "";
                }
                else
                  value += ch;
              } result.push(value); return result;
            };
            const headers = parseRow(lines.shift() || "").map((h) => h.trim().toLowerCase());
            const idx = (names) => headers.findIndex((h) => names.includes(h));
            const ti = idx(["title", "transaction", "name"]);
            const ai = idx(["amount (php)", "amount", "amount (₱)"]);
            const di = idx(["date"]);
            if (ti < 0 || ai < 0 || di < 0)
              throw new Error("Invalid CSV headers");
            incoming = { transactions: lines.map((line) => { const r = parseRow(line); const at = idx(["type"]); const ct = idx(["category"]); const pi = idx(["payment method", "payment"]); const ni = idx(["notes", "note"]); return { id: uid(), type: (r[at] || "expense").toLowerCase(), title: r[ti], amount: Number(String(r[ai]).replace(/[₱,$ ]/g, "")), date: r[di], category: r[ct] || "Miscellaneous", payment: r[pi] || "Cash", walletId: data.wallets.find((w) => w.name === r[idx(["wallet"])])?.id || data.wallets[0]?.id || "cash", notes: ni >= 0 ? r[ni] || "" : "" }; }) };
          }
          else
            incoming = JSON.parse(raw);
          if (!incoming || !Array.isArray(incoming.transactions))
            throw new Error("Invalid backup");
          const existing = new Set(data.transactions.map((t) => `${t.type}|${t.title.toLowerCase()}|${Number(t.amount).toFixed(2)}|${t.date}`));
          const valid = incoming.transactions.filter((t) => t && ["income", "expense"].includes(t.type) && typeof t.title === "string" && Number(t.amount) > 0 && t.date && !existing.has(`${t.type}|${String(t.title).toLowerCase()}|${Number(t.amount).toFixed(2)}|${t.date}`)).map((t) => ({ ...t, id: uid(), amount: Number(t.amount), walletId: t.walletId || data.wallets[0]?.id || "cash" }));
          setData((current) => ({ ...current, transactions: [...current.transactions, ...valid], limits: { ...current.limits, ...(incoming.limits || {}) }, goals: incoming.goals || current.goals, recurringRules: incoming.recurringRules || current.recurringRules, wallets: incoming.wallets || current.wallets, transfers: incoming.transfers || current.transfers }));
          setMenuOpen(false);
          setToast(`Imported ${valid.length} new transaction${valid.length === 1 ? "" : "s"}; duplicates were skipped.`);
        }
        catch {
          setToast("That file isn't a valid BudgetMate JSON backup or supported CSV.");
        } event.target.value = "";
      }; reader.readAsText(file);
  }
  async function submitAuth(event) {
    event.preventDefault(); if (!supabase) {
      setToast("Configure your Supabase URL and anon key in .env first.");
      return;
    } if (authPassword.length < 6) {
      setToast("Password must be at least 6 characters.");
      return;
    } setAuthBusy(true); const result = authMode === "signup" ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword }) : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword }); setAuthBusy(false); if (result.error) {
      setToast(result.error.message);
      return;
    } setModal(""); setAuthPassword(""); setToast(authMode === "signup" ? "Account created. Check your email if confirmation is enabled." : "Signed in. Loading cloud data.");
  }
  async function signOut() {
    if (supabase)
      await supabase.auth.signOut(); setUser(null); setCloudReady(false); setSyncStatus("Signed out · local data available"); setToast("Signed out.");
  }
  function resetAll() {
    if (!window.confirm("Reset all BudgetMate data? Export a backup first if you need one."))
      return; setData(emptyStore()); setToast("BudgetMate data reset.");
  }
  return <div className="app-shell"><header className="app-header"><div className="brand"><span className="brand-mark">₱</span><div><strong>BudgetMate</strong><small>Money, made clearer.</small></div></div><div className="header-actions"><span className="sync-status"><i className={user && syncStatus === "Cloud synced" ? "online" : ""} />{user ? syncStatus : supabase ? "Cloud sync available" : "Local mode"}</span><button className="icon-button theme-button" onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} title="Toggle theme">{theme === "dark" ? "☀" : "☾"}</button><div className="data-menu-wrap"><button className="secondary-button" onClick={() => setMenuOpen((v) => !v)}>⇩ Data⌄</button>{menuOpen && <div className="dropdown-menu"><button onClick={exportCSV}>Export CSV</button><button onClick={exportJSON}>Export JSON backup</button><label className="dropdown-upload">Import JSON / CSV<input type="file" accept=".json,application/json,.csv,text/csv" onChange={importFile} /></label><button onClick={() => window.print()}>Print / Save PDF</button><div className="dropdown-divider" /><button className="danger-action" onClick={resetAll}>Reset data</button></div>}</div>{user ? <button className="secondary-button" onClick={signOut}>☁ {user.email?.split("@")[0]} · Sign out</button> : <button className="secondary-button" onClick={() => { setAuthMode("signin"); setModal("auth"); }}>☁ Login / Sync</button>}<button className="primary-button" onClick={() => openAdd()}>＋ Add transaction</button></div></header>
    <main className="dashboard"><section className="welcome-row"><div><p className="eyebrow">YOUR FINANCIAL OVERVIEW</p><h1>Make every peso <span>count.</span></h1><p className="welcome-sub">A clearer picture of your money, one transaction at a time.</p></div><label className="month-picker"><span>Viewing month</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value || monthOf(today()))} /></label></section>
      <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span className="stat-label">TOTAL INCOME</span><span className="stat-icon income-icon">↗</span></div><strong>{money(summary.income)}</strong><p className="stat-foot income-text">{summary.incomeChange === null ? "Income this month" : `${summary.incomeChange >= 0 ? "↑" : "↓"} ${Math.abs(summary.incomeChange)}% vs last month`}</p></article><article className="stat-card"><div className="stat-top"><span className="stat-label">TOTAL EXPENSES</span><span className="stat-icon expense-icon">↘</span></div><strong>{money(summary.expenses)}</strong><p className="stat-foot expense-text">{summary.expenseChange === null ? "Spending this month" : `${summary.expenseChange > 0 ? "↑" : "↓"} ${Math.abs(summary.expenseChange)}% vs last month`}</p></article><article className="stat-card"><div className="stat-top"><span className="stat-label">NET BALANCE</span><span className="stat-icon balance-icon">◈</span></div><strong className={summary.balance < 0 ? "negative-number" : ""}>{money(summary.balance)}</strong><p className="stat-foot">Income minus expenses</p></article><article className="stat-card"><div className="stat-top"><span className="stat-label">SAVINGS RATE</span><span className="stat-icon savings-icon">◎</span></div><strong>{summary.savingsRate}%</strong><div className="progress-track"><span className="progress-fill gold-fill" style={{ width: `${Math.max(0, Math.min(100, summary.savingsRate))}%` }} /></div><p className="stat-foot">Of monthly income retained</p></article></section>
      <section className="insights-grid"><article className="panel cashflow-panel"><div className="panel-heading"><div><span className="heading-icon green">⌁</span><h3>Cash flow history</h3></div><span className="panel-hint">Income vs expenses</span></div>{!recentDays.length ? <div className="chart-empty"><span>✦</span><strong>Your money story starts here.</strong><p>Add a transaction to see your cash flow.</p></div> : <div className="bar-chart">{recentDays.map((d) => { const max = Math.max(1, ...recentDays.map((x) => Math.max(x.income, x.expense))); return <div className="bar-column" key={d.date}><div className="bar-pair"><span className="bar-income" style={{ height: `${d.income / max * 100}%` }} title={`Income ${money(d.income)}`} /><span className="bar-expense" style={{ height: `${d.expense / max * 100}%` }} title={`Expense ${money(d.expense)}`} /></div><small>{Number(d.date.slice(-2))}</small></div>; })}</div>}<div className="chart-legend"><span><i className="legend-income" />Income</span><span><i className="legend-expense" />Expenses</span></div></article><article className="panel category-panel"><div className="panel-heading"><div><span className="heading-icon purple">◔</span><h3>Expense breakdown</h3></div></div><div className="donut-layout"><div className="donut" style={{ background: categoryTotal ? `conic-gradient(${donut.parts.join(",")})` : "conic-gradient(var(--line) 0% 100%)" }}><div className="donut-hole"><span>Total spent</span><strong>{money(summary.expenses)}</strong></div></div><div className="donut-legend">{categories.map((c) => <div className="donut-legend-row" key={c.name}><i style={{ background: c.color }} /><span>{c.name}</span><b>{summary.expenses ? Math.round((summary.byCategory[c.name] || 0) / summary.expenses * 100) : 0}%</b></div>)}</div></div></article></section>
      <section className="panel budgets-panel"><div className="panel-heading budget-heading"><div><span className="heading-icon coral">◎</span><div><h3>Monthly budget limits</h3><p>Keep your spending intentional.</p></div></div><button className="secondary-button small-button" onClick={() => { setLimitInputs(Object.fromEntries(categories.map((c) => [c.name, String(data.limits[c.name] ?? c.limit)]))); setModal("limits"); }}>Manage limits</button></div><div className="budget-grid">{categories.map((c) => { const spent = summary.byCategory[c.name] || 0; const limit = Number(data.limits[c.name] ?? c.limit); const pct = limit > 0 ? spent / limit * 100 : 0; return <article className="budget-item" key={c.name}><div className="budget-item-top"><span className="budget-name"><i style={{ background: c.color }} />{c.name}</span><span className="budget-numbers"><b>{money(spent)}</b><span>/ {money(limit)}</span></span></div><div className="progress-track"><span className={`progress-fill ${pct >= 100 ? "red-fill" : pct >= 80 ? "gold-fill" : "green-fill"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div><div className="budget-item-bottom"><span>{Math.round(pct)}% used</span>{pct >= 100 ? <b className="limit-danger">Over limit</b> : pct >= 80 ? <b className="limit-warning">Near limit</b> : <span>{money(Math.max(0, limit - spent))} left</span>}</div></article>; })}</div></section>
      <section className="feature-grid"><article className="panel wallets-panel"><div className="panel-heading"><div><span className="heading-icon green">◈</span><h3>Wallets & accounts</h3></div><div className="wallet-actions"><button className="secondary-button small-button" onClick={() => { setTransferForm({ fromId: data.wallets[0]?.id || "", toId: data.wallets[1]?.id || data.wallets[0]?.id || "", amount: "", date: today(), note: "" }); setModal("transfer"); }}>↔ Transfer</button><button className="secondary-button small-button" onClick={() => setModal("wallet")}>＋ Add account</button></div></div><p className="section-subtitle">Manual balances for Philippine banks, cash, and e-wallets.</p><div className="wallet-grid">{data.wallets.map((w) => <article className="wallet-card" key={w.id}><div className="wallet-card-top"><span className="wallet-mark" style={{ color: w.color, background: `${w.color}20` }}>◈</span><button className="subtle-icon" onClick={() => {
        if (w.id === "cash") {
          setToast("The default cash account cannot be removed.");
          return;
        } if (data.transactions.some((t) => t.walletId === w.id) || data.transfers.some((t) => t.fromId === w.id || t.toId === w.id)) {
          setToast("This account has activity and cannot be removed yet.");
          return;
        } if (window.confirm(`Remove ${w.name}?`))
          setData((current) => ({ ...current, wallets: current.wallets.filter((x) => x.id !== w.id) }));
      }}>×</button></div><span className="wallet-provider">{w.provider} · {w.kind === "bank" ? "Bank account" : w.kind === "ewallet" ? "E-wallet" : w.kind === "cash" ? "Cash" : "Other"}</span><strong>{money(walletBalance(w))}</strong><span className="wallet-account-name">{w.name}</span></article>)}</div>{data.transfers.length > 0 && <div className="transfer-history"><strong>Recent transfers</strong>{[...data.transfers].slice(-3).reverse().map((t) => <div className="transfer-history-row" key={t.id}><span>{data.wallets.find((w) => w.id === t.fromId)?.name} <b>→</b> {data.wallets.find((w) => w.id === t.toId)?.name}</span><strong>{money(t.amount)}</strong></div>)}</div>}</article><article className="panel goals-panel"><div className="panel-heading"><div><span className="heading-icon coral">◎</span><h3>Savings goals</h3></div><button className="secondary-button small-button" onClick={() => setModal("goal")}>＋ New goal</button></div><p className="section-subtitle">Give your savings a purpose.</p>{!data.goals.length ? <div className="feature-empty"><span>✦</span><strong>Big goals start small.</strong><p>Create a savings goal and track your progress.</p><button className="text-action" onClick={() => setModal("goal")}>Create your first goal →</button></div> : <div className="goals-list">{data.goals.map((g) => <div className="goal-item" key={g.id}><div className="goal-title-row"><div><strong>{g.name}</strong><span>{g.deadline ? `Target · ${dateName(g.deadline)}` : "No deadline set"}</span></div><button className="subtle-icon" onClick={() => {
        if (window.confirm(`Delete ${g.name}?`))
          setData((current) => ({ ...current, goals: current.goals.filter((x) => x.id !== g.id) }));
      }}>×</button></div><div className="goal-amount-row"><b>{money(g.saved)}</b><span>of {money(g.target)}</span><strong>{Math.min(100, Math.round(g.saved / g.target * 100))}%</strong></div><div className="progress-track"><span className="progress-fill green-fill" style={{ width: `${Math.min(100, g.saved / g.target * 100)}%` }} /></div><button className="text-action" onClick={() => addGoalSavings(g)}>＋ Add savings</button></div>)}</div>}</article></section>
      <section className="panel recurring-panel"><div className="panel-heading"><div><span className="heading-icon blue">↻</span><h3>Recurring transactions</h3></div><span className="record-count">{data.recurringRules.filter((r) => r.active).length} active</span></div><p className="section-subtitle">Monthly bills and income are generated when due.</p>{!data.recurringRules.length ? <div className="recurring-empty">No recurring transactions yet. Turn on <strong>Repeat monthly</strong> when adding a transaction.</div> : <div className="recurring-list">{data.recurringRules.map((r) => <div className="recurring-row" key={r.id}><span className={`transaction-type-mark ${r.type === "income" ? "mark-income" : "mark-expense"}`}>{r.type === "income" ? "IN" : "EX"}</span><div className="recurring-name"><strong>{r.title}</strong><span>{r.category} · day {r.day} · {data.wallets.find((w) => w.id === r.walletId)?.name || "Account"}</span></div><strong className={r.type === "income" ? "amount-income" : "amount-expense"}>{r.type === "income" ? "+" : "−"}{money(r.amount)}</strong><button className="secondary-button small-button" onClick={() => setData((current) => ({ ...current, recurringRules: current.recurringRules.map((x) => x.id === r.id ? { ...x, active: !x.active } : x) }))}>{r.active ? "Pause" : "Resume"}</button><button className="subtle-icon" onClick={() => setData((current) => ({ ...current, recurringRules: current.recurringRules.filter((x) => x.id !== r.id) }))}>×</button></div>)}</div>}</section>
      <section className="panel transactions-panel"><div className="transactions-title-row"><div className="panel-heading"><div><span className="heading-icon blue">▤</span><div><h3>Transaction history</h3><p>Every peso, accounted for.</p></div></div><span className="record-count">{filteredTransactions.length} of {monthTransactions.length} records</span></div></div><div className="filters"><label className="search-box">⌕ <input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} /></label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">All types</option><option value="income">Income only</option><option value="expense">Expenses only</option></select><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{[...categories.map((c) => c.name), ...incomeCategories].map((c) => <option key={c}>{c}</option>)}</select><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}><option value="all">All payment methods</option>{paymentMethods.map((p) => <option key={p}>{p}</option>)}</select><button className="secondary-button reset-filter" onClick={() => { setSearch(""); setTypeFilter("all"); setCategoryFilter("all"); setPaymentFilter("all"); }}>↻ Reset filters</button></div>{!filteredTransactions.length ? <div className="empty-transactions"><div className="empty-illustration">₱</div><h3>{monthTransactions.length ? "No matching transactions" : "A fresh start"}</h3><p>{monthTransactions.length ? "Try changing your filters." : `No transactions for ${monthName(month)} yet.`}</p><button className="primary-button" onClick={() => openAdd()}>＋ Add transaction</button></div> : <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Category</th><th>Payment method</th><th>Date</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{filteredTransactions.map((t) => <tr key={t.id}><td><div className="transaction-name-cell"><span className={`transaction-type-mark ${t.type === "income" ? "mark-income" : "mark-expense"}`}>{t.type === "income" ? "IN" : "EX"}</span><div><strong>{t.title}</strong><span>{t.notes || data.wallets.find((w) => w.id === t.walletId)?.name}</span></div></div></td><td><span className="category-pill"><i style={{ background: categories.find((c) => c.name === t.category)?.color || "#20bd8b" }} />{t.category}</span></td><td>{t.payment} · {data.wallets.find((w) => w.id === t.walletId)?.name || "Cash"}</td><td>{dateName(t.date)}</td><td><strong className={t.type === "income" ? "amount-income" : "amount-expense"}>{t.type === "income" ? "+" : "−"}{money(t.amount)}</strong></td><td><div className="table-actions"><button className="secondary-button tiny-button" onClick={() => openEdit(t)}>Edit</button><button className="secondary-button tiny-button danger-action" onClick={() => deleteTransaction(t.id)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section><footer className="app-footer"><span>Made for mindful money moves.</span><span>All amounts in Philippine pesos (₱).</span></footer></main>

    {modal === "transaction" && <Modal title={editingId ? "Edit transaction" : "Add transaction"} onClose={() => setModal("")}><form className="modal-form" onSubmit={saveTransaction}><div className="type-switch"><button type="button" className={form.type === "expense" ? "active" : ""} onClick={() => setForm((f) => ({ ...f, type: "expense", category: "Food" }))}>↘ Expense</button><button type="button" className={form.type === "income" ? "active" : ""} onClick={() => setForm((f) => ({ ...f, type: "income", category: "Salary" }))}>↗ Income</button></div><div className="form-grid"><label className="form-field full-field"><span>Title / name *</span><input required autoFocus maxLength={90} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Groceries or monthly salary" /></label><label className="form-field"><span>Amount (₱) *</span><input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></label><label className="form-field"><span>Date *</span><input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></label><label className="form-field"><span>Category *</span><select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{(form.type === "income" ? incomeCategories : categories.map((c) => c.name)).map((c) => <option key={c}>{c}</option>)}</select></label><label className="form-field"><span>Payment method *</span><select value={form.payment} onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))}>{paymentMethods.map((p) => <option key={p}>{p}</option>)}</select></label><label className="form-field full-field"><span>Wallet / account *</span><select value={form.walletId} onChange={(e) => setForm((f) => ({ ...f, walletId: e.target.value }))}>{data.wallets.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.provider}</option>)}</select></label><label className="form-field full-field"><span>Notes <small>Optional</small></span><textarea rows="2" maxLength={220} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Add a detail or reminder..." /></label>{!editingId && <label className="repeat-toggle"><input type="checkbox" checked={form.repeatMonthly} onChange={(e) => setForm((f) => ({ ...f, repeatMonthly: e.target.checked }))} /><span><strong>Repeat monthly</strong><small>Automatically add on the same day each month</small></span></label>}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button" type="submit">{editingId ? "Save changes" : "Save transaction"} →</button></div></form></Modal>}
    {modal === "goal" && <Modal title="Create a savings goal" eyebrow="MAKE IT HAPPEN" onClose={() => setModal("")}><form className="modal-form" onSubmit={saveGoal}><label className="form-field"><span>Goal name *</span><input required value={goalForm.name} onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency fund" /></label><div className="form-grid"><label className="form-field"><span>Target amount (₱) *</span><input type="number" min="1" required value={goalForm.target} onChange={(e) => setGoalForm((f) => ({ ...f, target: e.target.value }))} /></label><label className="form-field"><span>Already saved (₱)</span><input type="number" min="0" value={goalForm.saved} onChange={(e) => setGoalForm((f) => ({ ...f, saved: e.target.value }))} /></label><label className="form-field full-field"><span>Target date <small>Optional</small></span><input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm((f) => ({ ...f, deadline: e.target.value }))} /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button">Create goal →</button></div></form></Modal>}
    {modal === "wallet" && <Modal title="Add wallet or account" eyebrow="YOUR MONEY, ORGANIZED" onClose={() => setModal("")}><form className="modal-form" onSubmit={saveWallet}><label className="form-field"><span>Account nickname *</span><input required value={walletForm.name} onChange={(e) => setWalletForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. BPI savings" /></label><div className="form-grid"><label className="form-field"><span>Provider</span><select value={walletForm.provider} onChange={(e) => setWalletForm((f) => ({ ...f, provider: e.target.value }))}>{providers.map((p) => <option key={p}>{p}</option>)}</select></label><label className="form-field"><span>Account type</span><select value={walletForm.kind} onChange={(e) => setWalletForm((f) => ({ ...f, kind: e.target.value }))}><option value="ewallet">E-wallet</option><option value="bank">Bank account</option><option value="cash">Cash</option><option value="other">Other</option></select></label><label className="form-field full-field"><span>Starting balance (₱)</span><input type="number" min="0" step="0.01" value={walletForm.openingBalance} onChange={(e) => setWalletForm((f) => ({ ...f, openingBalance: e.target.value }))} /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button">Add account →</button></div></form></Modal>}
    {modal === "transfer" && <Modal title="Transfer between accounts" eyebrow="MOVE MONEY, NOT SPENDING" onClose={() => setModal("")}><form className="modal-form" onSubmit={saveTransfer}><div className="form-grid"><label className="form-field"><span>From account</span><select value={transferForm.fromId} onChange={(e) => setTransferForm((f) => ({ ...f, fromId: e.target.value }))}>{data.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label className="form-field"><span>To account</span><select value={transferForm.toId} onChange={(e) => setTransferForm((f) => ({ ...f, toId: e.target.value }))}>{data.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label className="form-field"><span>Amount (₱) *</span><input type="number" min="0.01" step="0.01" required value={transferForm.amount} onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))} /></label><label className="form-field"><span>Date</span><input type="date" required value={transferForm.date} onChange={(e) => setTransferForm((f) => ({ ...f, date: e.target.value }))} /></label><label className="form-field full-field"><span>Note <small>Optional</small></span><input value={transferForm.note} onChange={(e) => setTransferForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Cash top-up to GCash" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button">Record transfer →</button></div></form></Modal>}
    {modal === "limits" && <Modal title="Manage category limits" eyebrow={monthName(month)} onClose={() => setModal("")}><form className="modal-form" onSubmit={saveLimits}><p className="modal-description">Set category caps for your monthly spending. The alerts update as transactions are added.</p><div className="limit-form-grid">{categories.map((c) => <label className="form-field" key={c.name}><span>{c.name} limit (₱)</span><input type="number" min="0" step="0.01" value={limitInputs[c.name] || "0"} onChange={(e) => setLimitInputs((current) => ({ ...current, [c.name]: e.target.value }))} /></label>)}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal("")}>Cancel</button><button className="primary-button">Save limits</button></div></form></Modal>}
    {modal === "auth" && <Modal title={authMode === "signup" ? "Create your BudgetMate account" : "Welcome back"} eyebrow="YOUR MONEY, YOUR SPACE" onClose={() => setModal("")}><form className="modal-form" onSubmit={submitAuth}><label className="form-field"><span>Email address</span><input type="email" required autoComplete="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" /></label><label className="form-field"><span>Password</span><input type="password" required minLength="6" autoComplete={authMode === "signup" ? "new-password" : "current-password"} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="At least 6 characters" /></label><p className="auth-privacy-note">BudgetMate does not ask for bank passwords, PINs, or OTPs. Account balances are entered manually; live bank connections are not enabled.</p><button className="primary-button full-width" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "signup" ? "Create account →" : "Sign in and sync →"}</button><button type="button" className="text-action" onClick={() => setAuthMode((m) => m === "signup" ? "signin" : "signup")}>{authMode === "signup" ? "Already have an account? Sign in" : "New to Tally? Create an account"}</button></form></Modal>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
