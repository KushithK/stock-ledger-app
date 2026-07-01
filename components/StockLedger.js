"use client";
import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Pencil, LogOut, Search, ShieldCheck, User, Lock, X, AlertTriangle, Package, Boxes, IndianRupee, KeyRound } from "lucide-react";
import { SEED_MATERIALS } from "./seedData";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const UNITS = ["pcs", "kg", "g", "ltr", "ml", "box", "roll", "sheet", "meter", "set", "nos"];
const LOW_STOCK_THRESHOLD = 10;
const DEFAULT_ADMIN_PASSWORD = "admin123";
const STORE_KEY = "stock-ledger-data-hebbarz-v1";

function pad(n) { return String(n).padStart(4, "0"); }

function seedData() {
  const materials = SEED_MATERIALS.map((m, i) => ({
    ...m,
    id: crypto.randomUUID(),
    entryNo: i + 1,
    updatedAt: Date.now(),
    updatedBy: "Imported",
    addedBy: "Imported",
  }));
  return { adminPassword: DEFAULT_ADMIN_PASSWORD, materials, nextEntry: materials.length + 1 };
}

export default function StockLedger() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null); // { role: 'admin'|'team', name }
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/data");
        const json = await res.json();
        if (json && json.materials) {
          setData(json);
        } else {
          const seeded = seedData();
          await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(seeded) });
          setData(seeded);
        }
      } catch {
        setData(seedData());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(next) {
    setData(next);
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (!res.ok) setSaveErr("Couldn't save — check your connection.");
      else setSaveErr("");
    } catch {
      setSaveErr("Couldn't save — check your connection.");
    }
  }

  if (loading || !data) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", background: "#F6F3EC", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#1F2421" }}>
        <style>{FONTS}</style>
        Loading ledger…
      </div>
    );
  }

  if (!session) {
    return <Login data={data} onLogin={setSession} />;
  }

  return (
    <Dashboard
      data={data}
      persist={persist}
      session={session}
      onLogout={() => setSession(null)}
      saveErr={saveErr}
    />
  );
}

function Login({ data, onLogin }) {
  const [mode, setMode] = useState("team");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Enter your name."); return; }
    if (mode === "admin") {
      if (password !== data.adminPassword) { setError("Incorrect admin password."); return; }
      onLogin({ role: "admin", name: name.trim() });
    } else {
      onLogin({ role: "team", name: name.trim() });
    }
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F6F3EC", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{FONTS}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, letterSpacing: 3, color: "#C87F0A", marginBottom: 6 }}>MT · 001</div>
          <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: "#1F2421", margin: 0 }}>Stock Ledger</h1>
          <p style={{ color: "#6B6355", fontSize: 14, marginTop: 6 }}>Material inventory, tracked and totalled.</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #DAD3C4", borderRadius: 10, padding: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "#F6F3EC", padding: 4, borderRadius: 8 }}>
            <button onClick={() => { setMode("team"); setError(""); }} style={tabStyle(mode === "team")}>
              <User size={15} style={{ marginRight: 6, verticalAlign: -3 }} />Team
            </button>
            <button onClick={() => { setMode("admin"); setError(""); }} style={tabStyle(mode === "admin")}>
              <ShieldCheck size={15} style={{ marginRight: 6, verticalAlign: -3 }} />Admin
            </button>
          </div>

          <div onKeyDown={e => { if (e.key === "Enter") submit(e); }}>
            <label style={labelStyle}>Your name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya" style={inputStyle} autoFocus />

            {mode === "admin" && (
              <>
                <label style={{ ...labelStyle, marginTop: 14 }}>Admin password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </>
            )}

            {error && <div style={{ color: "#A13D2B", fontSize: 13, marginTop: 10 }}>{error}</div>}

            <button type="button" onClick={submit} style={{ ...primaryBtn, width: "100%", marginTop: 18, justifyContent: "center" }}>
              {mode === "admin" ? "Sign in as Admin" : "Continue"}
            </button>
          </div>

          {mode === "admin" && (
            <p style={{ fontSize: 12, color: "#9A917E", marginTop: 14, lineHeight: 1.5 }}>
              Default password is <code style={{ background: "#F6F3EC", padding: "1px 5px", borderRadius: 4 }}>admin123</code>. Change it from Settings after signing in.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ data, persist, session, onLogout, saveErr }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const isAdmin = session.role === "admin";

  const categories = useMemo(() => {
    const set = new Set(data.materials.map(m => m.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [data.materials]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.materials.filter(m => {
      const matchesQ = !q || m.name.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q);
      const matchesCat = categoryFilter === "All" || m.category === categoryFilter;
      return matchesQ && matchesCat;
    });
  }, [data.materials, query, categoryFilter]);

  const totals = useMemo(() => {
    const value = data.materials.reduce((s, m) => s + m.quantity * m.unitPrice, 0);
    const low = data.materials.filter(m => m.quantity < LOW_STOCK_THRESHOLD).length;
    return { count: data.materials.length, value, low };
  }, [data.materials]);

  async function addOrUpdate(material) {
    let next;
    if (material.id) {
      next = { ...data, materials: data.materials.map(m => m.id === material.id ? { ...material, updatedAt: Date.now(), updatedBy: session.name } : m) };
    } else {
      const entry = { ...material, id: crypto.randomUUID(), entryNo: data.nextEntry, updatedAt: Date.now(), updatedBy: session.name, addedBy: session.name };
      next = { ...data, materials: [entry, ...data.materials], nextEntry: data.nextEntry + 1 };
    }
    await persist(next);
    setShowForm(false);
    setEditing(null);
  }

  async function remove(id) {
    if (!confirm("Delete this stock entry? This can't be undone.")) return;
    await persist({ ...data, materials: data.materials.filter(m => m.id !== id) });
  }

  async function changePassword(newPass) {
    await persist({ ...data, adminPassword: newPass });
    setShowSettings(false);
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: "#F6F3EC", minHeight: "100vh", color: "#1F2421" }}>
      <style>{FONTS}</style>

      {/* Header */}
      <div style={{ background: "#1F2421", color: "#F6F3EC", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 19 }}>Stock Ledger</div>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#9A917E", letterSpacing: 1 }}>MATERIAL INVENTORY REGISTER</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 12, fontFamily: "IBM Plex Mono, monospace", padding: "4px 10px", borderRadius: 20,
            background: isAdmin ? "#C87F0A" : "#2B4A63", color: "#fff", display: "flex", alignItems: "center", gap: 5
          }}>
            {isAdmin ? <ShieldCheck size={13} /> : <User size={13} />} {session.name} · {isAdmin ? "Admin" : "Team"}
          </span>
          {isAdmin && (
            <button onClick={() => setShowSettings(true)} style={iconGhostBtn} title="Change admin password">
              <KeyRound size={16} />
            </button>
          )}
          <button onClick={onLogout} style={iconGhostBtn} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {saveErr && (
        <div style={{ background: "#A13D2B", color: "#fff", padding: "8px 24px", fontSize: 13 }}>{saveErr}</div>
      )}

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: 24 }}>
        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <SummaryCard icon={<Package size={18} />} label="Material Types" value={totals.count} />
          <SummaryCard icon={<IndianRupee size={18} />} label="Total Stock Value" value={formatMoney(totals.value)} accent="#2B4A63" />
          <SummaryCard icon={<AlertTriangle size={18} />} label="Low Stock Items" value={totals.low} accent={totals.low ? "#A13D2B" : "#3F6C51"} />
          <SummaryCard icon={<Boxes size={18} />} label="Next Entry" value={`MT-${pad(data.nextEntry)}`} mono />
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: 11, color: "#9A917E" }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search material or category…"
              style={{ ...inputStyle, paddingLeft: 34, marginBottom: 0 }}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0, width: "auto", minWidth: 180 }}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={primaryBtn}>
            <Plus size={16} /> Add Stock
          </button>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid #DAD3C4", borderRadius: 10, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9A917E" }}>
              {data.materials.length === 0 ? "No stock entries yet. Add your first material." : "No materials match your search."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#F6F3EC", textAlign: "left" }}>
                    <Th>Entry</Th><Th>Material</Th><Th>Category</Th><Th align="right">Qty</Th>
                    <Th align="right">Unit Price</Th><Th align="right">Total Value</Th><Th>Updated By</Th>
                    {isAdmin && <Th align="right">Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const low = m.quantity < LOW_STOCK_THRESHOLD;
                    return (
                      <tr key={m.id} style={{ borderTop: "1px solid #EFEAE0" }}>
                        <Td mono>MT-{pad(m.entryNo)}</Td>
                        <Td><strong>{m.name}</strong></Td>
                        <Td>{m.category || "—"}</Td>
                        <Td align="right" mono>
                          {m.quantity} {m.unit}
                          {low && <span style={lowBadge}>LOW</span>}
                        </Td>
                        <Td align="right" mono>{formatMoney(m.unitPrice)}</Td>
                        <Td align="right" mono><strong>{formatMoney(m.quantity * m.unitPrice)}</strong></Td>
                        <Td>{m.updatedBy}</Td>
                        {isAdmin && (
                          <Td align="right">
                            <button onClick={() => { setEditing(m); setShowForm(true); }} style={iconGhostBtnDark} title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => remove(m.id)} style={{ ...iconGhostBtnDark, color: "#A13D2B" }} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </Td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isAdmin && (
          <p style={{ fontSize: 12, color: "#9A917E", marginTop: 14 }}>
            Signed in as Team — you can add new stock. Only an Admin can edit or delete entries.
          </p>
        )}
      </div>

      {showForm && (
        <MaterialForm
          initial={editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSave={addOrUpdate}
        />
      )}
      {showSettings && (
        <PasswordSettings onCancel={() => setShowSettings(false)} onSave={changePassword} />
      )}
    </div>
  );
}

function MaterialForm({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? "");
  const [unit, setUnit] = useState(initial?.unit || UNITS[0]);
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? "");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Material name is required.");
    if (quantity === "" || isNaN(quantity) || Number(quantity) < 0) return setError("Enter a valid quantity.");
    if (unitPrice === "" || isNaN(unitPrice) || Number(unitPrice) < 0) return setError("Enter a valid unit price.");
    onSave({
      id: initial?.id,
      entryNo: initial?.entryNo,
      name: name.trim(),
      category: category.trim(),
      quantity: Number(quantity),
      unit,
      unitPrice: Number(unitPrice),
    });
  }

  return (
    <Modal onClose={onCancel} title={initial ? "Edit Stock Entry" : "Add Stock Entry"}>
      <div onKeyDown={e => { if (e.key === "Enter") submit(e); }}>
        <label style={labelStyle}>Material name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Copper Wire 2mm" autoFocus />

        <label style={labelStyle}>Category (optional)</label>
        <input value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} placeholder="e.g. Electrical" />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Quantity</label>
            <input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} placeholder="0" />
          </div>
          <div style={{ width: 110 }}>
            <label style={labelStyle}>Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Unit price (₹)</label>
        <input type="number" step="any" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} style={inputStyle} placeholder="0.00" />

        {quantity !== "" && unitPrice !== "" && !isNaN(quantity) && !isNaN(unitPrice) && (
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: "#6B6355", marginTop: 4, marginBottom: 10 }}>
            Total value: <strong>{formatMoney(Number(quantity) * Number(unitPrice))}</strong>
          </div>
        )}

        {error && <div style={{ color: "#A13D2B", fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onCancel} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Cancel</button>
          <button type="button" onClick={submit} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>{initial ? "Save Changes" : "Add to Ledger"}</button>
        </div>
      </div>
    </Modal>
  );
}

function PasswordSettings({ onCancel, onSave }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (pw.length < 4) return setError("Password should be at least 4 characters.");
    if (pw !== pw2) return setError("Passwords don't match.");
    onSave(pw);
  }

  return (
    <Modal onClose={onCancel} title="Change Admin Password">
      <div onKeyDown={e => { if (e.key === "Enter") submit(e); }}>
        <label style={labelStyle}>New password</label>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} style={inputStyle} autoFocus />
        <label style={labelStyle}>Confirm new password</label>
        <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} style={inputStyle} />
        {error && <div style={{ color: "#A13D2B", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onCancel} style={{ ...ghostBtn, flex: 1, justifyContent: "center" }}>Cancel</button>
          <button type="button" onClick={submit} style={{ ...primaryBtn, flex: 1, justifyContent: "center" }}>Update Password</button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(31,36,33,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 18, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A917E" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent = "#1F2421", mono }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #DAD3C4", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9A917E", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {icon} {label}
      </div>
      <div style={{ fontFamily: mono ? "IBM Plex Mono, monospace" : "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 22, color: accent }}>
        {value}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return <th style={{ padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#9A917E", textAlign: align, fontWeight: 600 }}>{children}</th>;
}
function Td({ children, align = "left", mono }) {
  return <td style={{ padding: "10px 14px", textAlign: align, fontFamily: mono ? "IBM Plex Mono, monospace" : "inherit", whiteSpace: "nowrap" }}>{children}</td>;
}

function formatMoney(n) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const tabStyle = (active) => ({
  flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer",
  background: active ? "#1F2421" : "transparent", color: active ? "#fff" : "#6B6355",
  fontWeight: 600, fontSize: 13, fontFamily: "Inter, sans-serif",
});

const labelStyle = { display: "block", fontSize: 12, color: "#6B6355", marginBottom: 5, fontWeight: 600 };

const inputStyle = {
  width: "100%", padding: "9px 12px", border: "1px solid #DAD3C4", borderRadius: 7,
  fontSize: 14, marginBottom: 12, fontFamily: "Inter, sans-serif", boxSizing: "border-box", background: "#fff", color: "#1F2421",
};

const primaryBtn = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#C87F0A", color: "#fff",
  border: "none", padding: "10px 16px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
};

const ghostBtn = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#F6F3EC", color: "#1F2421",
  border: "1px solid #DAD3C4", padding: "10px 16px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
};

const iconGhostBtn = {
  background: "rgba(255,255,255,0.1)", border: "none", color: "#F6F3EC", width: 32, height: 32,
  borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

const iconGhostBtnDark = {
  background: "none", border: "none", color: "#6B6355", cursor: "pointer", padding: 4, marginLeft: 4,
};

const lowBadge = {
  marginLeft: 6, background: "#A13D2B", color: "#fff", fontSize: 10, padding: "2px 6px",
  borderRadius: 4, fontFamily: "IBM Plex Mono, monospace", letterSpacing: 0.5,
};
