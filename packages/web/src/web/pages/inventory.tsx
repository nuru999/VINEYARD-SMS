import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { api } from "../lib/api";

const CATEGORIES = ["Furniture", "Electronics", "Sports", "Stationery", "Kitchen", "Cleaning", "Books", "Laboratory", "Other"];
const CONDITIONS = ["good", "fair", "poor", "damaged"];
const CONDITION_COLORS: Record<string, string> = { good: "#3FB950", fair: "#E3B341", poor: "#E91E8C", damaged: "#F85149" };

export default function InventoryPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", category: "Furniture", quantity: "1", condition: "good", location: "", purchaseDate: "", notes: "" });

  const { data: items = [] } = useQuery({ queryKey: ["inventory"], queryFn: async () => (await api.inventory.$get()).json() });

  const saveItem = useMutation({
    mutationFn: async () => {
      if (editItem) {
        return (await api.inventory[":id"].$put({ param: { id: String(editItem.id) }, json: { ...form, quantity: Number(form.quantity) } })).json();
      }
      return (await api.inventory.$post({ json: { ...form, quantity: Number(form.quantity) } })).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setShowModal(false); setEditItem(null); setForm({ name: "", category: "Furniture", quantity: "1", condition: "good", location: "", purchaseDate: "", notes: "" }); },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => (await api.inventory[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, quantity: item.quantity?.toString(), condition: item.condition, location: item.location || "", purchaseDate: item.purchaseDate || "", notes: item.notes || "" });
    setShowModal(true);
  };

  const filtered = items.filter((i: any) =>
    (!filterCat || i.category === filterCat) &&
    (!search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.location || "").toLowerCase().includes(search.toLowerCase()))
  );

  const totalItems = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  const needsAttention = items.filter((i: any) => i.condition === "poor" || i.condition === "damaged").length;

  return (
    <Layout title="Inventory & Assets">
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Items", value: items.length, color: "#E91E8C" },
          { label: "Total Units", value: totalItems, color: "#1B4D4D" },
          { label: "Needs Attention", value: needsAttention, color: "#F85149" },
          { label: "Categories", value: new Set(items.map((i: any) => i.category)).size, color: "#E3B341" },
        ].map(s => (
          <div key={s.label} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
          style={{ flex: 1, minWidth: 180, padding: "8px 14px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: "8px 14px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => { setEditItem(null); setForm({ name: "", category: "Furniture", quantity: "1", condition: "good", location: "", purchaseDate: "", notes: "" }); setShowModal(true); }}
          style={{ padding: "8px 18px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>+ Add Item</button>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1B4D4D" }}>
              {["Item Name", "Category", "Qty", "Condition", "Location", "Purchase Date", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#fff", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item: any) => (
              <tr key={item.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                <td style={tdI}>
                  <div style={{ fontWeight: 600, color: "#1E293B" }}>{item.name}</div>
                  {item.notes && <div style={{ fontSize: 11, color: "#64748B" }}>{item.notes}</div>}
                </td>
                <td style={tdI}><span style={{ padding: "3px 10px", background: "rgba(27,77,77,0.3)", color: "#4ADE80", borderRadius: 20, fontSize: 12 }}>{item.category}</span></td>
                <td style={tdI}><span style={{ fontWeight: 700, color: "#1E293B" }}>{item.quantity}</span></td>
                <td style={tdI}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: `${CONDITION_COLORS[item.condition]}22`, color: CONDITION_COLORS[item.condition] }}>
                    {item.condition}
                  </span>
                </td>
                <td style={tdI}>{item.location || "—"}</td>
                <td style={tdI}>{item.purchaseDate || "—"}</td>
                <td style={tdI}>
                  <button onClick={() => openEdit(item)} style={{ fontSize: 12, color: "#64748B", background: "none", border: "none", cursor: "pointer", marginRight: 8 }}>Edit</button>
                  <button onClick={() => deleteItem.mutate(item.id)} style={{ fontSize: 12, color: "#F85149", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>No items found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 28, width: 420, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 20px", color: "#1E293B" }}>{editItem ? "Edit Item" : "Add Item"}</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Item Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={inp} placeholder="e.g. Student Desk" />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 2 }}>
                <label style={lbl}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Quantity</label>
                <input type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Condition</label>
                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} style={inp}>
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inp} placeholder="e.g. Room 3" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inp} placeholder="Optional notes" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveItem.mutate()} disabled={!form.name}
                style={{ flex: 1, padding: "10px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Save</button>
              <button onClick={() => { setShowModal(false); setEditItem(null); }}
                style={{ flex: 1, padding: "10px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const tdI: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#64748B" };
const lbl: React.CSSProperties = { display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 };
