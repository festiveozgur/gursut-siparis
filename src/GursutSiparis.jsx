import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://kqhptmbinpkjgcijodmc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaHB0bWJpbnBramdjaWpvZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODUwMzcsImV4cCI6MjA4OTg2MTAzN30.lnc7jVj9au76vwU-v-M4Yeg2VFYcCYQsPKmCMUQDlZ0";
const REQUIRED_APPROVALS = 3;
const TOTAL_APPROVERS = 5;

const USERS = ["Hamdi", "Hanife", "Savaş", "Melik", "Oz"];

const GURSUT_PRODUCTS = [
  "Kaşar Peyniri 400g",
  "Kaşar Peyniri 800g",
  "Taze Kaşar 1kg",
  "Mihaliç Peyniri",
  "Çerkez Peyniri",
  "Lor Peyniri",
  "Beyaz Peynir 500g",
  "Beyaz Peynir 1kg",
  "Tereyağı 500g",
  "Tereyağı 1kg",
  "Süzme Yoğurt",
  "Labne",
];

// ─── SUPABASE SQL (run once in Supabase dashboard) ──────────────────────────
/*
create table gursut_orders (
  id uuid primary key default gen_random_uuid(),
  urun text not null,
  miktar numeric not null,
  birim text default 'kg',
  not_alan text,
  olusturan text not null,
  created_at timestamptz default now(),
  status text default 'taslak',  -- 'taslak' | 'onaylandi' | 'reddedildi'
  approvals jsonb default '[]'::jsonb,
  approved_at timestamptz
);

-- Enable realtime
alter publication supabase_realtime add table gursut_orders;

-- RLS: allow all for now (restrict per your auth setup)
alter table gursut_orders enable row level security;
create policy "allow all" on gursut_orders for all using (true) with check (true);
*/

// ─── MOCK DATA (demo when no Supabase configured) ───────────────────────────
let mockDb = [
  { id: "1", urun: "Kaşar Peyniri 400g", miktar: 50, birim: "kg", not_alan: "Acil", olusturan: "Hamdi", created_at: new Date().toISOString(), status: "taslak", approvals: ["Hamdi", "Hanife"] },
  { id: "2", urun: "Tereyağı 500g", miktar: 30, birim: "kg", not_alan: "", olusturan: "Savaş", created_at: new Date(Date.now() - 3600000).toISOString(), status: "taslak", approvals: ["Savaş"] },
  { id: "3", urun: "Beyaz Peynir 1kg", miktar: 20, birim: "adet", not_alan: "Merit için", olusturan: "Oz", created_at: new Date(Date.now() - 7200000).toISOString(), status: "onaylandi", approvals: ["Oz", "Hamdi", "Hanife"], approved_at: new Date(Date.now() - 1800000).toISOString() },
];
let mockListeners = [];
const isDemoMode = SUPABASE_URL === "YOUR_SUPABASE_URL";

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("taslak");
  const [showForm, setShowForm] = useState(false);
  const [supabase, setSupabase] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ urun: GURSUT_PRODUCTS[0], miktar: "", birim: "kg", not_alan: "" });

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Init Supabase or mock
  useEffect(() => {
    if (!isDemoMode) {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSupabase(client);
    } else {
      setOrders([...mockDb]);
    }
  }, []);

  // Fetch + realtime subscribe
  useEffect(() => {
    if (!supabase) return;
    const fetchOrders = async () => {
      const { data } = await supabase.from("gursut_orders").select("*").order("created_at", { ascending: false });
      if (data) setOrders(data);
    };
    fetchOrders();
    const channel = supabase.channel("gursut_orders_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gursut_orders" }, fetchOrders)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [supabase]);

  const addOrder = async () => {
    if (!form.miktar || isNaN(form.miktar)) { showToast("Miktar giriniz", "err"); return; }
    const newOrder = { urun: form.urun, miktar: parseFloat(form.miktar), birim: form.birim, not_alan: form.not_alan, olusturan: currentUser, status: "taslak", approvals: [], created_at: new Date().toISOString() };
    if (isDemoMode) {
      const o = { ...newOrder, id: Date.now().toString() };
      mockDb = [o, ...mockDb];
      setOrders([...mockDb]);
    } else {
      await supabase.from("gursut_orders").insert(newOrder);
    }
    setForm({ urun: GURSUT_PRODUCTS[0], miktar: "", birim: "kg", not_alan: "" });
    setShowForm(false);
    showToast("Sipariş taslağa eklendi ✓");
  };

  const toggleApproval = async (order) => {
    const approvals = order.approvals || [];
    const alreadyApproved = approvals.includes(currentUser);
    const newApprovals = alreadyApproved ? approvals.filter(u => u !== currentUser) : [...approvals, currentUser];
    const nowApproved = newApprovals.length >= REQUIRED_APPROVALS;
    const updates = { approvals: newApprovals, status: nowApproved ? "onaylandi" : "taslak", ...(nowApproved ? { approved_at: new Date().toISOString() } : { approved_at: null }) };
    if (isDemoMode) {
      mockDb = mockDb.map(o => o.id === order.id ? { ...o, ...updates } : o);
      setOrders([...mockDb]);
    } else {
      await supabase.from("gursut_orders").update(updates).eq("id", order.id);
    }
    if (nowApproved) showToast(`✅ ${order.urun} onaylandı → Üretime geçiyor!`, "ok");
    else showToast(alreadyApproved ? "Onayınız geri alındı" : `Onaylandı (${newApprovals.length}/${REQUIRED_APPROVALS})`, "ok");
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Silinsin mi?")) return;
    if (isDemoMode) { mockDb = mockDb.filter(o => o.id !== id); setOrders([...mockDb]); }
    else await supabase.from("gursut_orders").delete().eq("id", id);
    showToast("Silindi", "err");
  };

  if (!currentUser) return <LoginScreen users={USERS} onSelect={setCurrentUser} />;

  const filtered = orders.filter(o => o.status === activeTab);

  return (
    <div style={styles.app}>
      {isDemoMode && (
        <div style={styles.demoBanner}>
          🔧 DEMO MODU — Supabase bağlantısı yok. Veriler sadece bu oturumda geçerli.
        </div>
      )}
      {toast && <div style={{ ...styles.toast, background: toast.type === "err" ? "#c0392b" : "#27ae60" }}>{toast.msg}</div>}

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>GÜRSÜT</span>
          <span style={styles.logoSub}>Sipariş Onay Sistemi</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userBadge}>{currentUser}</span>
          <button style={styles.logoutBtn} onClick={() => setCurrentUser(null)}>Çıkış</button>
        </div>
      </header>

      <div style={styles.tabs}>
        {[
          { key: "taslak", label: "📋 Taslak", count: orders.filter(o => o.status === "taslak").length },
          { key: "onaylandi", label: "✅ Onaylanan / Üretimde", count: orders.filter(o => o.status === "onaylandi").length },
        ].map(t => (
          <button key={t.key} style={{ ...styles.tab, ...(activeTab === t.key ? styles.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
            {t.label} <span style={styles.tabCount}>{t.count}</span>
          </button>
        ))}
        {activeTab === "taslak" && (
          <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ İptal" : "+ Yeni Sipariş"}
          </button>
        )}
      </div>

      {showForm && activeTab === "taslak" && (
        <div style={styles.formCard}>
          <div style={styles.formTitle}>Yeni Taslak Sipariş</div>
          <div style={styles.formRow}>
            <label style={styles.label}>Ürün</label>
            <select style={styles.select} value={form.urun} onChange={e => setForm({ ...form, urun: e.target.value })}>
              {GURSUT_PRODUCTS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Miktar</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...styles.input, width: 100 }} type="number" min="0" value={form.miktar} onChange={e => setForm({ ...form, miktar: e.target.value })} placeholder="0" />
              <select style={{ ...styles.select, width: 80 }} value={form.birim} onChange={e => setForm({ ...form, birim: e.target.value })}>
                {["kg", "adet", "koli", "lt"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>Not</label>
            <input style={styles.input} value={form.not_alan} onChange={e => setForm({ ...form, not_alan: e.target.value })} placeholder="Opsiyonel not..." />
          </div>
          <button style={styles.submitBtn} onClick={addOrder}>Taslağa Ekle</button>
        </div>
      )}

      <div style={styles.orderList}>
        {filtered.length === 0 && (
          <div style={styles.empty}>{activeTab === "taslak" ? "Bekleyen taslak sipariş yok." : "Onaylanmış sipariş yok."}</div>
        )}
        {filtered.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            currentUser={currentUser}
            onApprove={() => toggleApproval(order)}
            onDelete={() => deleteOrder(order.id)}
            requiredApprovals={REQUIRED_APPROVALS}
            totalApprovers={TOTAL_APPROVERS}
          />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, currentUser, onApprove, onDelete, requiredApprovals, totalApprovers }) {
  const approvals = order.approvals || [];
  const hasApproved = approvals.includes(currentUser);
  const progress = Math.min((approvals.length / requiredApprovals) * 100, 100);
  const isApproved = order.status === "onaylandi";

  return (
    <div style={{ ...styles.card, ...(isApproved ? styles.cardApproved : {}) }}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardProduct}>{order.urun}</div>
          <div style={styles.cardMeta}>
            <span style={styles.metaChip}>{order.miktar} {order.birim}</span>
            {order.not_alan && <span style={styles.metaNote}>📌 {order.not_alan}</span>}
            <span style={styles.metaBy}>— {order.olusturan}</span>
          </div>
        </div>
        {isApproved ? (
          <div style={styles.approvedBadge}>✅ ÜRETİMDE</div>
        ) : (
          !isApproved && order.olusturan === currentUser && (
            <button style={styles.deleteBtn} onClick={onDelete} title="Sil">🗑</button>
          )
        )}
      </div>

      {!isApproved && (
        <>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%`, background: progress >= 100 ? "#27ae60" : "#e67e22" }} />
          </div>
          <div style={styles.approvalRow}>
            <div style={styles.approvalAvatars}>
              {approvals.map(u => (
                <span key={u} style={styles.avatar} title={u}>{u[0]}</span>
              ))}
              <span style={styles.approvalCount}>{approvals.length}/{requiredApprovals} onay</span>
            </div>
            <button
              style={{ ...styles.approveBtn, ...(hasApproved ? styles.approveBtnActive : {}) }}
              onClick={onApprove}
            >
              {hasApproved ? "✓ Onayım Var" : "Onayla"}
            </button>
          </div>
        </>
      )}

      {isApproved && (
        <div style={styles.approvedRow}>
          {approvals.map(u => <span key={u} style={styles.avatarGreen} title={u}>{u[0]}</span>)}
          <span style={styles.approvedTime}>
            {order.approved_at ? `Onaylandı: ${new Date(order.approved_at).toLocaleString("tr-TR")}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function LoginScreen({ users, onSelect }) {
  return (
    <div style={styles.loginBg}>
      <div style={styles.loginBox}>
        <div style={styles.loginLogo}>GÜRSÜT</div>
        <div style={styles.loginTitle}>Sipariş Onay Sistemi</div>
        <div style={styles.loginSub}>Kim olduğunuzu seçin:</div>
        <div style={styles.loginUsers}>
          {users.map(u => (
            <button key={u} style={styles.loginUserBtn} onClick={() => onSelect(u)}>{u}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  app: { minHeight: "100vh", background: "#f0ece4", fontFamily: "'Georgia', serif", color: "#1a1a1a" },
  demoBanner: { background: "#f39c12", color: "#fff", textAlign: "center", padding: "6px 12px", fontSize: 13, fontFamily: "monospace" },
  toast: { position: "fixed", top: 20, right: 20, color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", fontFamily: "monospace" },
  header: { background: "#1a1a1a", color: "#f0ece4", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { display: "flex", flexDirection: "column" },
  logo: { fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: "bold", letterSpacing: 3, color: "#d4a843" },
  logoSub: { fontSize: 11, color: "#aaa", letterSpacing: 1, marginTop: 2 },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  userBadge: { background: "#d4a843", color: "#1a1a1a", padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: "bold" },
  logoutBtn: { background: "transparent", border: "1px solid #555", color: "#aaa", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  tabs: { display: "flex", alignItems: "center", gap: 0, padding: "16px 24px 0", borderBottom: "2px solid #d4c4a0", background: "#f8f4ed" },
  tab: { padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "#888", fontFamily: "'Georgia', serif", borderBottom: "3px solid transparent", marginBottom: -2 },
  tabActive: { color: "#1a1a1a", borderBottomColor: "#d4a843", fontWeight: "bold" },
  tabCount: { background: "#d4a843", color: "#1a1a1a", borderRadius: 10, padding: "1px 7px", fontSize: 11, marginLeft: 6 },
  addBtn: { marginLeft: "auto", background: "#1a1a1a", color: "#d4a843", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: "bold", letterSpacing: 0.5 },
  formCard: { margin: "16px 24px", background: "#fff", border: "1px solid #d4c4a0", borderRadius: 10, padding: 20, maxWidth: 480 },
  formTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 14, color: "#1a1a1a", fontFamily: "'Georgia', serif" },
  formRow: { marginBottom: 12 },
  label: { display: "block", fontSize: 12, color: "#666", marginBottom: 4, letterSpacing: 0.5 },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, fontFamily: "'Georgia', serif", boxSizing: "border-box" },
  select: { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, fontFamily: "'Georgia', serif", background: "#fff" },
  submitBtn: { background: "#d4a843", color: "#1a1a1a", border: "none", padding: "10px 24px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 14, marginTop: 8, width: "100%" },
  orderList: { padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 },
  empty: { textAlign: "center", color: "#aaa", padding: 40, fontStyle: "italic" },
  card: { background: "#fff", border: "1px solid #d4c4a0", borderRadius: 10, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  cardApproved: { background: "#f0fff4", borderColor: "#a8d5b5" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  cardProduct: { fontSize: 16, fontWeight: "bold", fontFamily: "'Georgia', serif", marginBottom: 4 },
  cardMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaChip: { background: "#f0ece4", border: "1px solid #d4c4a0", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: "bold" },
  metaNote: { fontSize: 12, color: "#888", fontStyle: "italic" },
  metaBy: { fontSize: 12, color: "#aaa" },
  approvedBadge: { background: "#27ae60", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: "bold", letterSpacing: 1 },
  deleteBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: 16, color: "#ccc", padding: 4 },
  progressBar: { height: 6, background: "#eee", borderRadius: 3, marginBottom: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  approvalRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  approvalAvatars: { display: "flex", alignItems: "center", gap: 6 },
  avatar: { width: 28, height: 28, borderRadius: "50%", background: "#d4a843", color: "#1a1a1a", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold" },
  avatarGreen: { width: 28, height: 28, borderRadius: "50%", background: "#27ae60", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold" },
  approvalCount: { fontSize: 12, color: "#888", marginLeft: 4 },
  approveBtn: { background: "#f0ece4", border: "2px solid #d4c4a0", color: "#1a1a1a", padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: "bold", transition: "all 0.2s" },
  approveBtnActive: { background: "#27ae60", borderColor: "#27ae60", color: "#fff" },
  approvedRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 4 },
  approvedTime: { fontSize: 11, color: "#888", marginLeft: 8 },
  loginBg: { minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" },
  loginBox: { background: "#f0ece4", borderRadius: 16, padding: "40px 48px", textAlign: "center", maxWidth: 360, width: "90%" },
  loginLogo: { fontSize: 32, fontWeight: "bold", letterSpacing: 4, color: "#d4a843", fontFamily: "'Georgia', serif", marginBottom: 4 },
  loginTitle: { fontSize: 14, color: "#888", letterSpacing: 1, marginBottom: 28 },
  loginSub: { fontSize: 13, color: "#555", marginBottom: 16 },
  loginUsers: { display: "flex", flexDirection: "column", gap: 10 },
  loginUserBtn: { background: "#1a1a1a", color: "#f0ece4", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontSize: 15, fontFamily: "'Georgia', serif", letterSpacing: 1, transition: "background 0.2s" },
};