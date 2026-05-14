import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { api } from "../lib/api";

const CATEGORIES = ["Textbook", "Reference", "Fiction", "Non-Fiction", "Science", "Mathematics", "English", "Kiswahili", "Social Studies", "Other"];

export default function LibraryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"books" | "borrows">("books");
  const [showBookModal, setShowBookModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [editBook, setEditBook] = useState<any>(null);
  const [bookForm, setBookForm] = useState({ title: "", author: "", isbn: "", category: "Textbook", copies: "1" });
  const [borrowForm, setBorrowForm] = useState({ bookId: "", studentId: "", borrowDate: new Date().toISOString().split("T")[0], dueDate: "" });
  const [search, setSearch] = useState("");

  const { data: books = [] } = useQuery({ queryKey: ["library-books"], queryFn: async () => (await api.library.books.$get()).json() });
  const { data: borrows = [] } = useQuery({ queryKey: ["library-borrows"], queryFn: async () => (await api.library.borrows.$get()).json() });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await (await api.students.$get()).json(); return (r as any).students ?? r; } });

  const saveBook = useMutation({
    mutationFn: async () => {
      if (editBook) {
        return (await api.library.books[":id"].$put({ param: { id: String(editBook.id) }, json: { ...bookForm, copies: Number(bookForm.copies) } })).json();
      }
      return (await api.library.books.$post({ json: { ...bookForm, copies: Number(bookForm.copies), available: Number(bookForm.copies) } })).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library-books"] }); setShowBookModal(false); setEditBook(null); setBookForm({ title: "", author: "", isbn: "", category: "Textbook", copies: "1" }); },
  });

  const deleteBook = useMutation({
    mutationFn: async (id: number) => (await api.library.books[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-books"] }),
  });

  const saveBorrow = useMutation({
    mutationFn: async () => (await api.library.borrows.$post({ json: { ...borrowForm, bookId: Number(borrowForm.bookId), studentId: Number(borrowForm.studentId) } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library-books", "library-borrows"] }); setShowBorrowModal(false); setBorrowForm({ bookId: "", studentId: "", borrowDate: new Date().toISOString().split("T")[0], dueDate: "" }); },
  });

  const returnBook = useMutation({
    mutationFn: async (id: number) => (await api.library.borrows[":id"].return.$put({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-books", "library-borrows"] }),
  });

  const filteredBooks = books.filter((b: any) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author || "").toLowerCase().includes(search.toLowerCase())
  );

  const overdue = borrows.filter((b: any) => b.status === "borrowed" && b.dueDate < new Date().toISOString().split("T")[0]);

  return (
    <Layout title="Library">
      {overdue.length > 0 && (
        <div style={{ background: "rgba(248,81,73,0.1)", border: "1px solid #F85149", borderRadius: 10, padding: "12px 18px", marginBottom: 16, fontSize: 14, color: "#F85149" }}>
          ⚠️ {overdue.length} overdue book{overdue.length > 1 ? "s" : ""} — check the Borrows tab
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#FFFFFF", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {(["books", "borrows"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
              background: tab === t ? "#E91E8C" : "transparent", color: tab === t ? "#fff" : "#64748B" }}>
            {t === "books" ? "📚 Books" : `📋 Borrows${borrows.filter((b:any)=>b.status==="borrowed").length ? ` (${borrows.filter((b:any)=>b.status==="borrowed").length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "books" && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books..."
              style={{ flex: 1, minWidth: 200, padding: "8px 14px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }} />
            <button onClick={() => { setEditBook(null); setBookForm({ title: "", author: "", isbn: "", category: "Textbook", copies: "1" }); setShowBookModal(true); }}
              style={{ padding: "8px 18px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>+ Add Book</button>
            <button onClick={() => setShowBorrowModal(true)}
              style={{ padding: "8px 18px", background: "#1B4D4D", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>📤 Issue Book</button>
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1B4D4D" }}>
                  {["Title", "Author", "Category", "Copies", "Available", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#fff", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((b: any) => (
                  <tr key={b.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                    <td style={td}><span style={{ fontWeight: 600, color: "#1E293B" }}>{b.title}</span></td>
                    <td style={td}>{b.author || "—"}</td>
                    <td style={td}><span style={{ padding: "3px 10px", background: "rgba(233,30,140,0.15)", color: "#E91E8C", borderRadius: 20, fontSize: 12 }}>{b.category}</span></td>
                    <td style={td}>{b.copies}</td>
                    <td style={td}>
                      <span style={{ color: (b.available || 0) > 0 ? "#4ADE80" : "#F85149", fontWeight: 600 }}>{b.available}</span>
                    </td>
                    <td style={td}>
                      <button onClick={() => { setEditBook(b); setBookForm({ title: b.title, author: b.author || "", isbn: b.isbn || "", category: b.category || "Textbook", copies: b.copies?.toString() }); setShowBookModal(true); }}
                        style={{ fontSize: 12, color: "#64748B", background: "none", border: "none", cursor: "pointer", marginRight: 8 }}>Edit</button>
                      <button onClick={() => deleteBook.mutate(b.id)}
                        style={{ fontSize: 12, color: "#F85149", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredBooks.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>No books found</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "borrows" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1B4D4D" }}>
                {["Book", "Student", "Borrowed", "Due", "Returned", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#fff", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {borrows.map((b: any) => {
                const book = books.find((x: any) => x.id === b.bookId);
                const student = students.find((x: any) => x.id === b.studentId);
                const isOverdue = b.status === "borrowed" && b.dueDate < new Date().toISOString().split("T")[0];
                return (
                  <tr key={b.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                    <td style={td}>{book?.title || b.bookId}</td>
                    <td style={td}>{student ? `${student.firstName} ${student.lastName}` : b.studentId}</td>
                    <td style={td}>{b.borrowDate}</td>
                    <td style={td}>{b.dueDate}</td>
                    <td style={td}>{b.returnDate || "—"}</td>
                    <td style={td}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: isOverdue ? "rgba(248,81,73,0.15)" : b.status === "returned" ? "rgba(63,185,80,0.15)" : "rgba(227,179,65,0.15)",
                        color: isOverdue ? "#F85149" : b.status === "returned" ? "#3FB950" : "#E3B341" }}>
                        {isOverdue ? "Overdue" : b.status}
                      </span>
                    </td>
                    <td style={td}>
                      {b.status === "borrowed" && (
                        <button onClick={() => returnBook.mutate(b.id)}
                          style={{ fontSize: 12, color: "#4ADE80", background: "none", border: "none", cursor: "pointer" }}>Return</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {borrows.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>No borrow records</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Book Modal */}
      {showBookModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 28, width: 400 }}>
            <h3 style={{ margin: "0 0 20px", color: "#1E293B" }}>{editBook ? "Edit Book" : "Add Book"}</h3>
            {[["Title *", "title", ""], ["Author", "author", ""], ["ISBN", "isbn", ""]].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" }}>{label}</label>
                <input value={(bookForm as any)[key]} onChange={e => setBookForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                  style={{ width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" }}>Category</label>
                <select value={bookForm.category} onChange={e => setBookForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" }}>Copies</label>
                <input type="number" min="1" value={bookForm.copies} onChange={e => setBookForm(f => ({ ...f, copies: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => saveBook.mutate()} disabled={!bookForm.title}
                style={{ flex: 1, padding: "10px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Save</button>
              <button onClick={() => { setShowBookModal(false); setEditBook(null); }}
                style={{ flex: 1, padding: "10px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Borrow Modal */}
      {showBorrowModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 28, width: 380 }}>
            <h3 style={{ margin: "0 0 20px", color: "#1E293B" }}>Issue Book</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" }}>Book</label>
              <select value={borrowForm.bookId} onChange={e => setBorrowForm(f => ({ ...f, bookId: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }}>
                <option value="">Select book</option>
                {books.filter((b: any) => (b.available || 0) > 0).map((b: any) => <option key={b.id} value={b.id}>{b.title} ({b.available} left)</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" }}>Student</label>
              <select value={borrowForm.studentId} onChange={e => setBorrowForm(f => ({ ...f, studentId: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }}>
                <option value="">Select student</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" }}>Borrow Date</label>
                <input type="date" value={borrowForm.borrowDate} onChange={e => setBorrowForm(f => ({ ...f, borrowDate: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" }}>Due Date</label>
                <input type="date" value={borrowForm.dueDate} onChange={e => setBorrowForm(f => ({ ...f, dueDate: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveBorrow.mutate()} disabled={!borrowForm.bookId || !borrowForm.studentId || !borrowForm.dueDate}
                style={{ flex: 1, padding: "10px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Issue</button>
              <button onClick={() => setShowBorrowModal(false)}
                style={{ flex: 1, padding: "10px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const td: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#64748B" };
