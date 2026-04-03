import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kqhptmbinpkjgcijodmc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxaHB0bWJpbnBramdjaWpvZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODUwMzcsImV4cCI6MjA4OTg2MTAzN30.lnc7jVj9au76vwU-v-M4Yeg2VFYcCYQsPKmCMUQDlZ0";
const REQUIRED_APPROVALS = 3;

// ─── KULLANICILAR VE ROLLER ───────────────────────────────────────────────────
const ROLES = {
  "Tolga Arslan":    "karar",
  "Oğuz Yel":        "karar",
  "Ahmet Aksoy":     "giris",
  "Murat Özgören":   "giris_onay",
  "Esra Özer":       "onay",
  "Kemal Şimşirler": "onay",
  "Özgür Özer":      "onay",
};
const USERS        = Object.keys(ROLES);
const canEnter     = (u) => ["giris","giris_onay","onay"].includes(ROLES[u]);
const canApprove   = (u) => ["onay","giris_onay","karar"].includes(ROLES[u]);
const canDecide    = (u) => ROLES[u] === "karar";
const ROLE_LABELS  = {
  karar:      { label: "Karar Verici",      color: "#8e44ad" },
  giris:      { label: "Sipariş Giren",     color: "#2980b9" },
  onay:       { label: "Onaylayan",         color: "#27ae60" },
  giris_onay: { label: "Giren & Onaylayan", color: "#e67e22" },
};

// ─── ÜRÜN LİSTESİ (Gürsüt Fiyat Listesi 28.01.2026) ─────────────────────────
const GURSUT_PRODUCTS = [
  { kod: "110511010", ad: "TEL PEYNİRİ 1000 GR", fiyat: 320.4 },
  { kod: "110512020", ad: "DİLİM PEYNİRİ 1000 GR", fiyat: 320.4 },
  { kod: "110510018", ad: "ÖRME PEYNİRİ 1000 GR", fiyat: 320.4 },
  { kod: "110514008", ad: "KAFKAS PEYNİRİ 400 GR", fiyat: 142.8 },
  { kod: "110510024", ad: "MİNİ ÖRGÜ PEYNİRİ 3 KG", fiyat: 369.6 },
  { kod: "110510025", ad: "MİNİ DİLİM 3 KG", fiyat: 369.6 },
  { kod: "110510026", ad: "MİNİ PEYNİR TOPLARIM 3 KG", fiyat: 369.6 },
  { kod: "110510051", ad: "MİNİ KALBİM 3 KG", fiyat: 369.6 },
  { kod: "110407007", ad: "KÖY PEYNİRİ 5 KG VAKUMLU 1/4", fiyat: 264.0 },
  { kod: "110408001", ad: "OTLU PEYNİR 5 KG", fiyat: 270.0 },
  { kod: "110408003", ad: "OTLU PEYNİR 5 KG (VAKUMLU) 1/4", fiyat: 270.0 },
  { kod: "110408006", ad: "ÇÖREK OTLU KÖY PEYNİRİ 5 KG VAKUMLU 1/4", fiyat: 270.0 },
  { kod: "140103028", ad: "ESKİ KAŞAR PORSİYON 12 KG", fiyat: 576.0 },
  { kod: "140518028", ad: "ERZİNCAN TULUM PEYNİRİ 10 KG", fiyat: 600.0 },
  { kod: "140303013", ad: "SALAMURA TULUM PEYNİRİ 6 KG (VAKUMLU)", fiyat: 348.0 },
  { kod: "210303004", ad: "İZMİR TULUM PEYNİRİ 19 KG", fiyat: 7000.0 },
  { kod: "210204008", ad: "KLASİK BEYAZ PEYNİR 18 KG (K)", fiyat: 5965.0 },
  { kod: "110201002", ad: "TADIM BEYAZ PEYNİR 6 KG", fiyat: 1180.0 },
  { kod: "110513011", ad: "MOZZARELLA PEYNİRİ 2000 GR", fiyat: 310.8 },
  { kod: "110513019", ad: "MOZZARELLA RENDE (KÜP) 2000 GR", fiyat: 318.0 },
  { kod: "110101024", ad: "KAHVALTI LEZZETİM 2000 GR", fiyat: 324.0 },
  { kod: "110101036", ad: "TOST PEYNİRİ 2000 GR (G)", fiyat: 272.4 },
  { kod: "110824006", ad: "TEREYAĞ (RULO) 1000 GR", fiyat: 426.0 },
  { kod: "110619013", ad: "KREM PEYNİR 3,25 KG", fiyat: 686.4 },
  { kod: "110722012", ad: "LABNE 2,75 KG", fiyat: 408.0 },
  { kod: "110101013", ad: "DİLİMLİ KAHVALTI LEZZETİM 250 GR", fiyat: 102.0 },
  { kod: "110101018", ad: "KAHVALTI LEZZETİM 250 GR", fiyat: 88.2 },
  { kod: "110101033", ad: "KAHVALTI LEZZETİM 500 GR", fiyat: 168.6 },
  { kod: "110101034", ad: "TOST PEYNİRİ 600 GR", fiyat: 165.6 },
  { kod: "110510021", ad: "TEL PEYNİRİ 200 GR", fiyat: 73.8 },
  { kod: "110510022", ad: "DİLİM PEYNİRİ 200 GR", fiyat: 73.8 },
  { kod: "110510023", ad: "ÖRME PEYNİRİ 200 GR", fiyat: 73.8 },
  { kod: "110510020", ad: "PAZAR KAHVALTISI (YÖRESEL) 200 GR", fiyat: 73.8 },
  { kod: "110510030", ad: "MİNİ DİLİM 200 GR", fiyat: 84.0 },
  { kod: "110510028", ad: "MİNİ ÖRGÜM 200 GR", fiyat: 84.0 },
  { kod: "110510029", ad: "MİNİ PEYNİR TOPLARIM 200 GR", fiyat: 84.0 },
  { kod: "110513030", ad: "RENDE MOZARELLA 150 GR", fiyat: 55.8 },
  { kod: "110510027", ad: "KREM PEYNİR 300 GR", fiyat: 71.4 },
  { kod: "110408004", ad: "KÖY PEYNİRİ 500 GR", fiyat: 127.2 },
  { kod: "140204001", ad: "KLASİK BEYAZ PEYNİR 300 GR", fiyat: 117.0 },
  { kod: "140303006", ad: "İZMİR TULUM PEYNİRİ 200 GR", fiyat: 90.6 },
];

const fmt = (n) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY_FORM = { kod: GURSUT_PRODUCTS[0].kod, miktar: "", birim: "adet", not_alan: "" };

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders]           = useState([]);
  const [activeTab, setActiveTab]     = useState("taslak");
  const [showForm, setShowForm]       = useState(false);
  const [supabase, setSupabase]       = useState(null);
  const [toast, setToast]             = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => { setSupabase(createClient(SUPABASE_URL, SUPABASE_ANON_KEY)); }, []);

  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase.from("gursut_orders").select("*").order("created_at", { ascending: false });
      if (data) setOrders(data);
    };
    load();
    const ch = supabase.channel("gursut_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "gursut_orders" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [supabase]);

  const selectedProduct = GURSUT_PRODUCTS.find(p => p.kod === form.kod) || GURSUT_PRODUCTS[0];
  const totalFiyat = form.miktar && !isNaN(form.miktar) ? selectedProduct.fiyat * parseFloat(form.miktar) : 0;

  const addOrder = async () => {
    if (!form.miktar || isNaN(form.miktar) || parseFloat(form.miktar) <= 0) { showToast("Geçerli bir miktar giriniz", "err"); return; }
    const p = selectedProduct;
    await supabase.from("gursut_orders").insert({
      urun: p.ad, stok_kodu: p.kod, birim_fiyat: p.fiyat,
      miktar: parseFloat(form.miktar), birim: form.birim,
      toplam_fiyat: totalFiyat,
      not_alan: form.not_alan, olusturan: currentUser,
      status: "taslak", approvals: [],
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    showToast("Sipariş taslağa eklendi ✓");
  };

  const toggleApproval = async (order) => {
    const approvals    = order.approvals || [];
    const has          = approvals.includes(currentUser);
    const newApprovals = has ? approvals.filter(u => u !== currentUser) : [...approvals, currentUser];
    const nowApproved  = newApprovals.length >= REQUIRED_APPROVALS;
    await supabase.from("gursut_orders").update({
      approvals: newApprovals,
      status: nowApproved ? "onaylandi" : "taslak",
      approved_at: nowApproved ? new Date().toISOString() : null,
    }).eq("id", order.id);
    if (nowApproved) showToast(`✅ ${order.urun} onaylandı! Karar vericiler üretime alabilir.`);
    else showToast(has ? "Onayınız geri alındı" : `Onaylandı (${newApprovals.length}/${REQUIRED_APPROVALS})`);
  };

  const sendToProduction = async (order) => {
    await supabase.from("gursut_orders").update({
      status: "uretimde",
      uretim_at: new Date().toISOString(),
      uretim_by: currentUser,
    }).eq("id", order.id);
    showToast(`🏭 ${order.urun} üretime gönderildi!`);
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("Silinsin mi?")) return;
    await supabase.from("gursut_orders").delete().eq("id", id);
    showToast("Silindi", "err");
  };

  if (!currentUser) return <LoginScreen onSelect={setCurrentUser} />;

  const tabs     = [
    { key: "taslak",    label: "📋 Taslak" },
    { key: "onaylandi", label: "✅ Onaylanan" },
    { key: "uretimde",  label: "🏭 Üretimde" },
  ];
  const filtered = orders.filter(o => o.status === activeTab);
  const role     = ROLES[currentUser];

  return (
    <div style={S.app}>
      {toast && <div style={{ ...S.toast, background: toast.type === "err" ? "#c0392b" : "#27ae60" }}>{toast.msg}</div>}

      <header style={S.header}>
        <div>
          <div style={S.logo}>GÜRSÜT</div>
          <div style={S.logoSub}>Sipariş Onay Sistemi · Fiyat Listesi 28.01.2026</div>
        </div>
        <div style={S.headerRight}>
          <div style={{ textAlign: "right" }}>
            <div style={S.userBadge}>{currentUser}</div>
            <div style={{ ...S.roleBadge, background: ROLE_LABELS[role].color }}>{ROLE_LABELS[role].label}</div>
          </div>
          <button style={S.logoutBtn} onClick={() => setCurrentUser(null)}>Çıkış</button>
        </div>
      </header>

      <div style={S.tabs}>
        {tabs.map(t => (
          <button key={t.key} style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
            {t.label} <span style={S.tabCount}>{orders.filter(o => o.status === t.key).length}</span>
          </button>
        ))}
        {canEnter(currentUser) && activeTab === "taslak" && (
          <button style={S.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ İptal" : "+ Yeni Sipariş"}
          </button>
        )}
      </div>

      {showForm && canEnter(currentUser) && (
        <div style={S.formCard}>
          <div style={S.formTitle}>Yeni Taslak Sipariş</div>

          <div style={S.formRow}>
            <label style={S.label}>Ürün</label>
            <select style={S.select} value={form.kod} onChange={e => setForm({ ...form, kod: e.target.value })}>
              {GURSUT_PRODUCTS.map(p => (
                <option key={p.kod} value={p.kod}>{p.ad}</option>
              ))}
            </select>
          </div>

          <div style={S.priceInfo}>
            <span style={S.priceLabel}>Stok Kodu:</span> <b>{selectedProduct.kod}</b>
            <span style={{ marginLeft: 16, ...S.priceLabel }}>Birim Fiyat:</span> <b style={{ color: "#d4a843" }}>{fmt(selectedProduct.fiyat)} ₺</b>
          </div>

          <div style={S.formRow}>
            <label style={S.label}>Miktar</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...S.input, width: 110 }} type="number" min="1" value={form.miktar}
                onChange={e => setForm({ ...form, miktar: e.target.value })} placeholder="0" />
              <select style={{ ...S.select, width: 90 }} value={form.birim}
                onChange={e => setForm({ ...form, birim: e.target.value })}>
                {["adet", "koli", "kg", "lt"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {totalFiyat > 0 && (
            <div style={S.totalBox}>
              Toplam: <span style={S.totalAmount}>{fmt(totalFiyat)} ₺</span>
            </div>
          )}

          <div style={S.formRow}>
            <label style={S.label}>Not</label>
            <input style={S.input} value={form.not_alan}
              onChange={e => setForm({ ...form, not_alan: e.target.value })} placeholder="Opsiyonel not..." />
          </div>

          <button style={S.submitBtn} onClick={addOrder}>Taslağa Ekle</button>
        </div>
      )}

      <div style={S.orderList}>
        {filtered.length === 0 && <div style={S.empty}>Bu listede sipariş yok.</div>}
        {filtered.map(order => (
          <OrderCard key={order.id} order={order} currentUser={currentUser}
            onApprove={canApprove(currentUser) && order.status === "taslak" ? () => toggleApproval(order) : null}
            onDecide={canDecide(currentUser) && order.status === "onaylandi" ? () => sendToProduction(order) : null}
            onDelete={order.olusturan === currentUser && order.status === "taslak" ? () => deleteOrder(order.id) : null}
            requiredApprovals={REQUIRED_APPROVALS}
          />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, currentUser, onApprove, onDecide, onDelete, requiredApprovals }) {
  const approvals   = order.approvals || [];
  const hasApproved = approvals.includes(currentUser);
  const progress    = Math.min((approvals.length / requiredApprovals) * 100, 100);
  const isApproved  = order.status === "onaylandi";
  const isUretim    = order.status === "uretimde";

  return (
    <div style={{ ...S.card, ...(isApproved ? S.cardApproved : {}), ...(isUretim ? S.cardUretim : {}) }}>
      <div style={S.cardHeader}>
        <div style={{ flex: 1 }}>
          <div style={S.cardProduct}>{order.urun}</div>
          <div style={S.cardMeta}>
            {order.stok_kodu && <span style={S.kodChip}>{order.stok_kodu}</span>}
            <span style={S.metaChip}>{order.miktar} {order.birim}</span>
            {order.birim_fiyat && <span style={S.fiyatChip}>{fmt(order.birim_fiyat)} ₺/br</span>}
            {order.toplam_fiyat > 0 && <span style={S.toplamChip}>= {fmt(order.toplam_fiyat)} ₺</span>}
            {order.not_alan && <span style={S.metaNote}>📌 {order.not_alan}</span>}
          </div>
          <div style={S.metaBy}>Giren: {order.olusturan} · {new Date(order.created_at).toLocaleString("tr-TR")}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {isUretim    && <span style={S.uretimBadge}>🏭 ÜRETİMDE</span>}
          {isApproved && !isUretim && <span style={S.approvedBadge}>✅ ONAYLANDI</span>}
          {onDelete    && <button style={S.deleteBtn} onClick={onDelete}>🗑</button>}
        </div>
      </div>

      {!isApproved && !isUretim && (
        <>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${progress}%`, background: progress >= 100 ? "#27ae60" : "#e67e22" }} />
          </div>
          <div style={S.approvalRow}>
            <div style={S.approvalAvatars}>
              {approvals.map(u => <span key={u} style={S.avatar} title={u}>{u[0]}</span>)}
              <span style={S.approvalCount}>{approvals.length}/{requiredApprovals} onay</span>
            </div>
            {onApprove && (
              <button style={{ ...S.approveBtn, ...(hasApproved ? S.approveBtnActive : {}) }} onClick={onApprove}>
                {hasApproved ? "✓ Onayım Var" : "Onayla"}
              </button>
            )}
          </div>
        </>
      )}

      {isApproved && !isUretim && (
        <div style={{ ...S.approvalRow, marginTop: 10 }}>
          <div style={S.approvalAvatars}>
            {approvals.map(u => <span key={u} style={S.avatarGreen} title={u}>{u[0]}</span>)}
            <span style={S.approvalCount}>
              {order.approved_at ? `Onaylandı: ${new Date(order.approved_at).toLocaleString("tr-TR")}` : ""}
            </span>
          </div>
          {onDecide && <button style={S.decideBtn} onClick={onDecide}>🏭 Üretime Gönder</button>}
        </div>
      )}

      {isUretim && (
        <div style={S.uretimRow}>
          Üretime alan: <b>{order.uretim_by}</b>
          {order.uretim_at ? ` — ${new Date(order.uretim_at).toLocaleString("tr-TR")}` : ""}
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onSelect }) {
  return (
    <div style={S.loginBg}>
      <div style={S.loginBox}>
        <div style={S.loginLogo}>GÜRSÜT</div>
        <div style={S.loginSub}>Kim olduğunuzu seçin:</div>
        <div style={S.loginUsers}>
          {USERS.map(u => (
            <button key={u} style={S.loginUserBtn} onClick={() => onSelect(u)}>
              <span>{u}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  app: { minHeight: "100vh", background: "#f0ece4", fontFamily: "'Georgia', serif", color: "#1a1a1a" },
  toast: { position: "fixed", top: 20, right: 20, color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  header: { background: "#1a1a1a", color: "#f0ece4", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: 22, fontWeight: "bold", letterSpacing: 3, color: "#d4a843" },
  logoSub: { fontSize: 11, color: "#aaa", letterSpacing: 0.5, marginTop: 2 },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  userBadge: { background: "#d4a843", color: "#1a1a1a", padding: "3px 10px", borderRadius: 20, fontSize: 13, fontWeight: "bold", textAlign: "center" },
  roleBadge: { color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, marginTop: 4, textAlign: "center" },
  logoutBtn: { background: "transparent", border: "1px solid #555", color: "#aaa", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  tabs: { display: "flex", alignItems: "center", padding: "16px 24px 0", borderBottom: "2px solid #d4c4a0", background: "#f8f4ed", flexWrap: "wrap" },
  tab: { padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "#888", fontFamily: "'Georgia', serif", borderBottom: "3px solid transparent", marginBottom: -2 },
  tabActive: { color: "#1a1a1a", borderBottomColor: "#d4a843", fontWeight: "bold" },
  tabCount: { background: "#d4a843", color: "#1a1a1a", borderRadius: 10, padding: "1px 7px", fontSize: 11, marginLeft: 6 },
  addBtn: { marginLeft: "auto", background: "#1a1a1a", color: "#d4a843", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: "bold" },
  formCard: { margin: "16px 24px", background: "#fff", border: "1px solid #d4c4a0", borderRadius: 10, padding: 20, maxWidth: 520 },
  formTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 14 },
  formRow: { marginBottom: 12 },
  label: { display: "block", fontSize: 12, color: "#666", marginBottom: 4 },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, fontFamily: "'Georgia', serif", boxSizing: "border-box" },
  select: { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, fontFamily: "'Georgia', serif", background: "#fff" },
  priceInfo: { background: "#fdf9f0", border: "1px solid #e8d8a0", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 12, color: "#555" },
  priceLabel: { color: "#888", fontSize: 12 },
  totalBox: { background: "#1a1a1a", color: "#f0ece4", borderRadius: 6, padding: "10px 14px", marginBottom: 12, fontSize: 14 },
  totalAmount: { color: "#d4a843", fontWeight: "bold", fontSize: 18, marginLeft: 8 },
  submitBtn: { background: "#d4a843", color: "#1a1a1a", border: "none", padding: "10px 24px", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 14, marginTop: 8, width: "100%" },
  orderList: { padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 },
  empty: { textAlign: "center", color: "#aaa", padding: 40, fontStyle: "italic" },
  card: { background: "#fff", border: "1px solid #d4c4a0", borderRadius: 10, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  cardApproved: { background: "#f0fff4", borderColor: "#a8d5b5" },
  cardUretim: { background: "#f0f4ff", borderColor: "#a0b0e0" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 },
  cardProduct: { fontSize: 15, fontWeight: "bold", marginBottom: 6 },
  cardMeta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  kodChip: { background: "#eee", borderRadius: 8, padding: "2px 8px", fontSize: 11, color: "#666", fontFamily: "monospace" },
  metaChip: { background: "#f0ece4", border: "1px solid #d4c4a0", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: "bold" },
  fiyatChip: { background: "#fdf9f0", border: "1px solid #e8d8a0", borderRadius: 12, padding: "2px 10px", fontSize: 12, color: "#b8860b" },
  toplamChip: { background: "#1a1a1a", color: "#d4a843", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: "bold" },
  metaNote: { fontSize: 12, color: "#888", fontStyle: "italic" },
  metaBy: { fontSize: 11, color: "#bbb" },
  approvedBadge: { background: "#27ae60", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: "bold" },
  uretimBadge: { background: "#3a5bc7", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: "bold" },
  deleteBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: 16, color: "#ccc", padding: 4 },
  progressBar: { height: 6, background: "#eee", borderRadius: 3, marginBottom: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  approvalRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  approvalAvatars: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  avatar: { width: 28, height: 28, borderRadius: "50%", background: "#d4a843", color: "#1a1a1a", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold" },
  avatarGreen: { width: 28, height: 28, borderRadius: "50%", background: "#27ae60", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold" },
  approvalCount: { fontSize: 12, color: "#888", marginLeft: 4 },
  approveBtn: { background: "#f0ece4", border: "2px solid #d4c4a0", color: "#1a1a1a", padding: "6px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: "bold", transition: "all 0.2s" },
  approveBtnActive: { background: "#27ae60", borderColor: "#27ae60", color: "#fff" },
  decideBtn: { background: "#3a5bc7", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: "bold" },
  uretimRow: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #dde", fontSize: 12, color: "#888" },
  loginBg: { minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" },
  loginBox: { background: "#f0ece4", borderRadius: 16, padding: "40px 48px", textAlign: "center", maxWidth: 400, width: "90%" },
  loginLogo: { fontSize: 32, fontWeight: "bold", letterSpacing: 4, color: "#d4a843", fontFamily: "'Georgia', serif", marginBottom: 4 },
  loginTitle: { fontSize: 14, color: "#888", letterSpacing: 1, marginBottom: 24 },
  loginSub: { fontSize: 13, color: "#555", marginBottom: 16 },
  loginUsers: { display: "flex", flexDirection: "column", gap: 8 },
  loginUserBtn: { background: "#1a1a1a", color: "#f0ece4", border: "none", padding: "12px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "'Georgia', serif", display: "flex", justifyContent: "space-between", alignItems: "center" },
  loginRoleBadge: { fontSize: 11, padding: "2px 8px", borderRadius: 10, color: "#fff" },
};
