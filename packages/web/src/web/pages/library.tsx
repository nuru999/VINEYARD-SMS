import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { useToast } from "../components/ui/toast";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

const CATEGORIES = ["Textbook", "Reference", "Fiction", "Non-Fiction", "Science", "Mathematics", "English", "Kiswahili", "Social Studies", "Other"];
const today = () => new Date().toISOString().split("T")[0];

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function LibraryPage() {
  const qc = useQueryClient();
  const { isAdmin, isPrincipal, isTeacher } = useRole();
  const canManageCatalog = isAdmin || isPrincipal;
  const canManageLoans = canManageCatalog || isTeacher;
  const { error: toastError } = useToast();
  const [tab, setTab] = useState<"books" | "borrows">("books");
  const [showBookModal, setShowBookModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [editBook, setEditBook] = useState<any>(null);
  const [bookForm, setBookForm] = useState({ title: "", author: "", isbn: "", category: "Textbook", copies: "1" });
  const [borrowForm, setBorrowForm] = useState({ bookId: "", studentId: "", borrowDate: today(), dueDate: "" });
  const [search, setSearch] = useState("");

  const { data: books = [], isLoading: booksLoading } = useQuery({
    queryKey: ["library-books"],
    queryFn: async () => parseResponse(await api.library.books.$get()),
  });
  const { data: borrows = [] } = useQuery({
    queryKey: ["library-borrows"],
    queryFn: async () => parseResponse(await api.library.borrows.$get()),
  });
  const { data: students = [] } = useQuery({
    queryKey: ["library-students"],
    enabled: canManageLoans,
    queryFn: async () => {
      const r = await parseResponse(await api.students.$get());
      return Array.isArray(r) ? r : (r as any)?.students ?? [];
    },
  });

  const invalidateLibrary = () => {
    qc.invalidateQueries({ queryKey: ["library-books"] });
    qc.invalidateQueries({ queryKey: ["library-borrows"] });
  };
  const showMutationError = (title: string) => (err: unknown) =>
    toastError(title, err instanceof Error ? err.message : "Request failed");

  const saveBook = useMutation({
    mutationFn: async () => {
      const json = { ...bookForm, copies: Number(bookForm.copies) };
      const response = editBook
        ? await api.library.books[":id"].$put({ param: { id: String(editBook.id) }, json })
        : await api.library.books.$post({ json });
      return parseResponse(response);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library-books"] });
      setShowBookModal(false);
      setEditBook(null);
      setBookForm({ title: "", author: "", isbn: "", category: "Textbook", copies: "1" });
    },
    onError: showMutationError("Could not save book"),
  });

  const deleteBook = useMutation({
    mutationFn: async (id: number) => parseResponse(await api.library.books[":id"].$delete({ param: { id: String(id) } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library-books"] }),
    onError: showMutationError("Could not delete book"),
  });

  const saveBorrow = useMutation({
    mutationFn: async () => parseResponse(await api.library.borrows.$post({
      json: { ...borrowForm, bookId: Number(borrowForm.bookId), studentId: Number(borrowForm.studentId) },
    })),
    onSuccess: () => {
      invalidateLibrary();
      setShowBorrowModal(false);
      setBorrowForm({ bookId: "", studentId: "", borrowDate: today(), dueDate: "" });
    },
    onError: showMutationError("Could not issue book"),
  });

  const returnBook = useMutation({
    mutationFn: async (id: number) => parseResponse(await api.library.borrows[":id"].return.$put({ param: { id: String(id) } })),
    onSuccess: invalidateLibrary,
    onError: showMutationError("Could not return book"),
  });

  const safeBooks = Array.isArray(books) ? books as any[] : [];
  const safeBorrows = Array.isArray(borrows) ? borrows as any[] : [];
  const safeStudents = Array.isArray(students) ? students as any[] : [];
  const filteredBooks = safeBooks.filter((b: any) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author || "").toLowerCase().includes(search.toLowerCase())
  );
  const overdue = safeBorrows.filter((b: any) => b.status === "borrowed" && b.dueDate < today());

  if (booksLoading) {
    return <Layout title="Library"><div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "#64748B", fontSize: 16 }}>Loading library...</div></Layout>;
  }

  return (
    <Layout title="Library">
      {!canManageLoans && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", fontSize: 13 }}>
          Library is read-only for your role. Academic staff issue and return books; administrators and principals manage the catalog.
        </div>
      )}

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
            {t === "books" ? "📚 Books" : `📋 Borrows${safeBorrows.filter((b: any) => b.status === "borrowed").length ? ` (${safeBorrows.filter((b: any) => b.status === "borrowed").length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "books" && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books..."
              style={{ flex: 1, minWidth: 200, padding: "8px 14px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14 }} />
            {canManageCatalog && (
              <button onClick={() => { setEditBook(null); setBookForm({ title: "", author: "", isbn: "", category: "Textbook", copies: "1" }); setShowBookModal(true); }}
                style={{ padding: "8px 18px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>+ Add Book</button>
            )}
            {canManageLoans && (
              <button onClick={() => setShowBorrowModal(true)}
                style={{ padding: "8px 18px", background: "#1B4D4D", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>📤 Issue Book</button>
            )}
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1B4D4D" }}>
                  {["Title", "Author", "Category", "Copies", "Available", ...(canManageCatalog ? [""] : [])].map((h, i) => (
                    <th key={`${h}-${i}`} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#fff", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((b: any) => (
                  <tr key={b.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                    <td style={td}><span style={{ fontWeight: 600, color: "#1E293B" }}>{b.title}</span></td>
                    <td style={td}>{b.author || "—"}</td>
                    <td style={td}><span style={{ padding: "3px 10px", background: "rgba(233,30,140,0.15)", color: "#E91E8C", borderRadius: 20, fontSize: 12 }}>{b.category || "—"}</span></td>
                    <td style={td}>{b.copies}</td>
                    <td style={td}><span style={{ color: (b.available || 0) > 0 ? "#4ADE80" : "#F85149", fontWeight: 600 }}>{b.available}</span></td>
                    {canManageCatalog && (
                      <td style={td}>
                        <button onClick={() => { setEditBook(b); setBookForm({ title: b.title, author: b.author || "", isbn: b.isbn || "", category: b.category || "Textbook", copies: String(b.copies || 1) }); setShowBookModal(true); }}
                          style={{ fontSize: 12, color: "#64748B", background: "none", border: "none", cursor: "pointer", marginRight: 8 }}>Edit</button>
                        <button onClick={() => { if (confirm("Delete this book?")) deleteBook.mutate(b.id); }}
                          style={{ fontSize: 12, color: "#F85149", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredBooks.length === 0 && <tr><td colSpan={canManageCatalog ? 6 : 5} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>No books found</td></tr>}
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
                {["Book", "Student", "Borrowed", "Due", "Returned", "Status", ...(canManageLoans ? [""] : [])].map((h, i) => (
                  <th key={`${h}-${i}`} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#fff", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeBorrows.map((b: any) => {
                const book = safeBooks.find((x: any) => x.id === b.bookId);
                const student = safeStudents.find((x: any) => x.id === b.studentId);
                const isOverdue = b.status === "borrowed" && b.dueDate < today();
                return (
                  <tr key={b.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                    <td style={td}>{book?.title || `Book #${b.bookId}`}</td>
                    <td style={td}>{student ? (student.name ?? `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim()) : `Student #${b.studentId}`}</td>
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
                    {canManageLoans && (
                      <td style={td}>
                        {b.status === "borrowed" && (
                          <button onClick={() => returnBook.mutate(b.id)} disabled={returnBook.isPending}
                            style={{ fontSize: 12, color: "#4ADE80", background: "none", border: "none", cursor: "pointer" }}>Return</button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {safeBorrows.length === 0 && <tr><td colSpan={canManageLoans ? 7 : 6} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>No borrow records</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {canManageCatalog && showBookModal && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ margin: "0 0 20px", color: "#1E293B" }}>{editBook ? "Edit Book" : "Add Book"}</h3>
            {[["Title *", "title"], ["Author", "author"], ["ISBN", "isbn"]].map(([label, key]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{label}</label>
                <input value={(bookForm as any)[key]} onChange={e => setBookForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Category</label>
                <select value={bookForm.category} onChange={e => setBookForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Copies</label>
                <input type="number" min="1" value={bookForm.copies} onChange={e => setBookForm(f => ({ ...f, copies: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => saveBook.mutate()} disabled={!bookForm.title.trim() || saveBook.isPending} style={primaryButton}>
                {saveBook.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setShowBookModal(false); setEditBook(null); }} style={secondaryButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {canManageLoans && showBorrowModal && (
        <div style={overlay}>
          <div style={{ ...modal, width: 380 }}>
            <h3 style={{ margin: "0 0 20px", color: "#1E293B" }}>Issue Book</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Book</label>
              <select value={borrowForm.bookId} onChange={e => setBorrowForm(f => ({ ...f, bookId: e.target.value }))} style={inputStyle}>
                <option value="">Select book</option>
                {safeBooks.filter((b: any) => (b.available || 0) > 0).map((b: any) => <option key={b.id} value={b.id}>{b.title} ({b.available} left)</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Student</label>
              <select value={borrowForm.studentId} onChange={e => setBorrowForm(f => ({ ...f, studentId: e.target.value }))} style={inputStyle}>
                <option value="">Select student</option>
                {safeStudents.map((s: any) => <option key={s.id} value={s.id}>{s.name ?? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim()}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Borrow Date</label>
                <input type="date" value={borrowForm.borrowDate} onChange={e => setBorrowForm(f => ({ ...f, borrowDate: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Due Date</label>
                <input type="date" min={borrowForm.borrowDate} value={borrowForm.dueDate} onChange={e => setBorrowForm(f => ({ ...f, dueDate: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveBorrow.mutate()} disabled={!borrowForm.bookId || !borrowForm.studentId || !borrowForm.dueDate || saveBorrow.isPending} style={primaryButton}>
                {saveBorrow.isPending ? "Issuing..." : "Issue"}
              </button>
              <button onClick={() => setShowBorrowModal(false)} style={secondaryButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const td: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#64748B" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 };
const modal: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 28, width: 400 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14, boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" };
const primaryButton: React.CSSProperties = { flex: 1, padding: "10px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 };
const secondaryButton: React.CSSProperties = { flex: 1, padding: "10px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", cursor: "pointer" };
