/*
ÖN İZLEME NOTU
Bu kodun ön izlemesi, giriş ekranı ve tarih bazlı etüt planlama arayüzünü birlikte gösterir. 
Uygulama çalıştırıldığında kullanıcı önce giriş yapacak, ardından sol tarafta öğretmen listesi ve 
sağda etüt salonu planı görünecektir.
*/

import React, { useEffect, useState } from "react";
import { ShipWheel, AlertCircle, Unlock } from "lucide-react";
import * as XLSX from "xlsx";

// ——— Yardımcı Fonksiyonlar (test edilebilir) ———
export function localYMDUtil(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// CSV üretmek için basit yardımcı
function toCSV(rows) {
  return rows.map((r) =>
    r.map((x) => {
      const s = String(x ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(",")
  ).join("\n");
}

// ——— Ana Uygulama Bileşeni ———
export default function App() {
  const [teachers, setTeachers] = useState([
    { name: "HAYATİ GÜLDAL", branch: "Matematik", role: "teacher" },
    { name: "NECİP MURAT UYSAL", branch: "Fizik", role: "teacher" },
  ]);
  const [currentTeacher, setCurrentTeacher] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [isDark, setIsDark] = useState(false);

  const [studentDb, setStudentDb] = useState({});

  const credentials = {
    "AYHAN KAPICI (Rehber Öğretmen)": "4321",
    "HAYATİ GÜLDAL": "1234",
    "NECİP MURAT UYSAL": "1234",
  };

  const [adminGlow, setAdminGlow] = useState(false);
  useEffect(() => {
    if (currentRole === "admin" && currentTeacher) {
      setAdminGlow(true);
      const t = setTimeout(() => setAdminGlow(false), 1800);
      return () => clearTimeout(t);
    }
  }, [currentRole, currentTeacher]);

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {/* Üst bar */}
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/70 backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                <span className="text-lg font-bold">UF</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">Ünye Fen Lisesi</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Öğretmen Paneli</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDark((v) => !v)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {isDark ? "Aydınlık Tema" : "Karanlık Tema"}
              </button>
              {currentTeacher && (
                <button
                  onClick={() => {
                    setCurrentTeacher("");
                    setCurrentRole("");
                  }}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Çıkış Yap
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-7xl gap-4 px-4 py-4">
          {/* Sol: Öğretmen listesi */}
          <aside className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-2 text-sm font-semibold">Öğretmenler</h2>
            <ul className="space-y-1 text-sm">
              {[...teachers.map(t => ({ name: t.name, role: "teacher" })), { name: "AYHAN KAPICI (Rehber Öğretmen)", role: "admin" }].map((u, idx) => (
                <li
                  key={idx}
                  className={
                    u.role === "admin"
                      ? "flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400"
                      : "flex items-center gap-1 text-gray-700 dark:text-gray-200"
                  }
                >
                  {u.role === "admin" && (
                    <ShipWheel
                      size={12}
                      className={`text-blue-500 dark:text-blue-300 ${adminGlow ? "drop-shadow" : ""}`}
                    />
                  )}
                  {" "}{u.name}
                </li>
              ))}
            </ul>
          </aside>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            {!currentTeacher ? (
              <LoginCard
                users={[...teachers.map(t => ({ name: t.name, role: "teacher" })), { name: "AYHAN KAPICI (Rehber Öğretmen)", role: "admin" }]}
                credentials={credentials}
                onSuccess={(name, role) => {
                  setCurrentTeacher(name);
                  setCurrentRole(role);
                }}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold leading-tight">Etüt Salonları</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Rol: <strong>{currentRole || "teacher"}</strong>
                    </span>
                    <span>Sütunlar: Etüt Adları • Satırlar: 1–8. saat</span>
                  </div>
                </div>
                {currentRole === "admin" && (
                  <AdminStudentSearchPanel studentDb={studentDb} />
                )}
                <EtutTable
                  teachers={teachers}
                  currentTeacher={currentTeacher}
                  currentRole={currentRole}
                  studentDb={studentDb}
                  onUploadExcel={(file) => parseStudentExcel(file, setStudentDb)}
                />
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function LoginCard({ users, credentials, onSuccess }) {
  const [selected, setSelected] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!selected) return setErr("Lütfen kullanıcı seçin.");
    const ok = credentials[selected];
    if (ok && pwd === ok) {
      const role = users.find((u) => u.name === selected)?.role || "teacher";
      onSuccess(selected, role);
    } else setErr("Hatalı şifre.");
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <h2 className="mb-2 text-base font-semibold">Giriş Yap</h2>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Lütfen adınızı listeden seçip şifrenizi giriniz. Rehber öğretmen yönetici olarak giriş yapacaktır.
      </p>
      <form className="space-y-3" onSubmit={submit}>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Kullanıcı</label>
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setErr("");
            }}
            className="h-9 w-full rounded-xl border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">Seçin…</option>
            {users.map((u, idx) => (
              <option key={idx} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Şifre</label>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="h-9 w-full rounded-xl border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        {err && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
            {err}
          </div>
        )}
        <div className="pt-1">
          <button
            type="submit"
            className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-gray-900"
          >
            Giriş
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminStudentSearchPanel({ studentDb }) {
  const [query, setQuery] = useState("");

  const entries = Object.entries(studentDb || {});
  const q = query.trim().toLocaleLowerCase("tr-TR");

  const filtered = entries
    .filter(([no, v]) => {
      if (!q) return true;
      const name = (v.name || "").toLocaleLowerCase("tr-TR");
      const cls = (v.class || "").toLocaleLowerCase("tr-TR");
      return no.toLowerCase().includes(q) || name.includes(q) || cls.includes(q);
    })
    .sort((a, b) => {
      const va = a[1];
      const vb = b[1];
      return (va.name || "").localeCompare(vb.name || "", "tr");
    });

  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Öğrenci Arama Paneli</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Öğrencileri numara, ad veya sınıfa göre arayabilirsiniz. Bu panel sadece rehber öğretmen tarafından kullanılabilir.
          </p>
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="No, ad veya sınıf yazın… (örn: 109, Ahmet, 11/A)"
        className="h-9 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
      />

      <div className="max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white text-xs dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full text-left">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">
            <tr>
              <th className="px-2 py-2">No</th>
              <th className="px-2 py-2">Ad Soyad</th>
              <th className="px-2 py-2">Sınıf</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-xs text-gray-500">
                  Sonuç bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map(([no, v]) => (
                <tr
                  key={no}
                  className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                >
                  <td className="px-2 py-2">{no}</td>
                  <td className="px-2 py-2">{v.name}</td>
                  <td className="px-2 py-2">{v.class}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ——— Etüt Tablosu ———

function EtutTable({ teachers, currentTeacher, currentRole, studentDb, onUploadExcel }) {
  const [rooms, setRooms] = useState(["ETÜT 1", "ETÜT 2", "ETÜT 3"]);
  const hours = Array.from({ length: 8 }, (_, i) => i + 1);

  const localYMD = localYMDUtil;
  const [selectedDate, setSelectedDate] = useState(localYMD(new Date()));

  const [cellsByDate, setCellsByDate] = useState({});
  const dayCells = cellsByDate[selectedDate] || {};

  const classOptions = ["9/A", "9/B", "9/C", "10/A", "10/B", "11/A", "12/A"];

  const [conflicts, setConflicts] = useState(new Set());
  const [warnings, setWarnings] = useState([]);
  const [dbError, setDbError] = useState("");
  const [loading, setLoading] = useState(false);

  const norm = (s) => (s || "").trim().toLocaleUpperCase("tr-TR");

  const checkConflicts = (cellsForDay = {}) => {
    const msgs = [];
    const bad = new Set();
    hours.forEach((h) => {
      const seen = new Map();
      rooms.forEach((_, c) => {
        [1, 2].forEach((p) => {
          const key = `${h}-${c}-${p}-name`;
          const name = norm(cellsForDay[key]);
          if (name) {
            if (!seen.has(name)) seen.set(name, { col: c, part: p });
            else {
              const first = seen.get(name);
              msgs.push(`"${name}" ${h}. saatte birden fazla salonda (${selectedDate}).`);
              bad.add(`${h}-${first.col}-${first.part}-name`);
              bad.add(key);
            }
          }
        });
      });
    });
    setConflicts(bad);
    setWarnings(msgs);
  };

  const updateDayCells = (draft) => {
    const next = { ...cellsByDate, [selectedDate]: draft };
    setCellsByDate(next);
  };

  const setCell = (key, value) => updateDayCells({ ...dayCells, [key]: value });

  const clearPart = (hour, col, part) => {
    const draft = { ...dayCells };
    draft[`${hour}-${col}-${part}-no`] = "";
    draft[`${hour}-${col}-${part}-name`] = "";
    draft[`${hour}-${col}-${part}-class`] = "";
    draft[`${hour}-${col}-${part}-class-auto`] = false;
    updateDayCells(draft);
  };

  const isCellAssignedToMe = (hour, col) =>
    (dayCells[`${hour}-${col}-teacher`] || "") === currentTeacher;

  const cellVisible = (hour, col) =>
    currentRole === "admin" ? true : isCellAssignedToMe(hour, col);

  const canEditThisCell = () => currentRole === "admin";

  if (typeof window !== "undefined") {
    window.__etutState__ = { rooms, hours, cells: dayCells, date: selectedDate };
  }

  useEffect(() => {
    checkConflicts(dayCells);
  }, [selectedDate, rooms.length]); // eslint-disable-line

  // Öğrenci NO girildiğinde adı/sınıfı doldur
  const onStudentNoChange = (hour, col, part, no) => {
    const draft = { ...dayCells, [`${hour}-${col}-${part}-no`]: no };
    const stu = studentDb[no?.trim()] || null;
    if (stu) {
      draft[`${hour}-${col}-${part}-name`] = stu.name || "";
      draft[`${hour}-${col}-${part}-class`] = stu.class || "";
      draft[`${hour}-${col}-${part}-class-auto`] = true;
    } else {
      draft[`${hour}-${col}-${part}-name`] = draft[`${hour}-${col}-${part}-name`] || "";
      draft[`${hour}-${col}-${part}-class`] = draft[`${hour}-${col}-${part}-class`] || "";
    }
    updateDayCells(draft);
  };

  const onStudentNameChange = (hour, col, part, name) => {
    const draft = { ...dayCells, [`${hour}-${col}-${part}-name`]: name };
    const q = (name || "").trim().toLocaleUpperCase("tr-TR");
    if (q) {
      const matches = Object.entries(studentDb).filter(([no, v]) => {
        const nm = (v.name || "").toLocaleUpperCase("tr-TR");
        return nm.includes(q);
      });
      if (matches.length === 1) {
        const [no, v] = matches[0];
        draft[`${hour}-${col}-${part}-no`] = no;
        draft[`${hour}-${col}-${part}-class`] = v.class || "";
        draft[`${hour}-${col}-${part}-class-auto`] = true;
      }
    }
    updateDayCells(draft);
  };

  const unlockClass = (hour, col, part) => {
    const draft = { ...dayCells };
    draft[`${hour}-${col}-${part}-class-auto`] = false;
    updateDayCells(draft);
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSlot, setSearchSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const openStudentSearch = (hour, col, part) => {
    if (!canEditThisCell()) return;
    setSearchSlot({ hour, col, part });
    setSearchQuery("");
    setSearchOpen(true);
  };

  const closeStudentSearch = () => setSearchOpen(false);

  const filteredStudents = Object.entries(studentDb)
    .map(([no, v]) => ({ no, name: v.name || "", class: v.class || "" }))
    .filter((stu) => {
      const q = searchQuery.trim().toLocaleUpperCase("tr-TR");
      if (!q) return true;
      return (
        stu.no.toLocaleUpperCase("tr-TR").includes(q) ||
        stu.name.toLocaleUpperCase("tr-TR").includes(q) ||
        (stu.class || "").toLocaleUpperCase("tr-TR").includes(q)
      );
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));

  const applyStudentFromSearch = (stu) => {
    if (!searchSlot) return;
    const { hour, col, part } = searchSlot;
    const draft = { ...dayCells };
    draft[`${hour}-${col}-${part}-no`] = stu.no;
    draft[`${hour}-${col}-${part}-name`] = stu.name;
    draft[`${hour}-${col}-${part}-class`] = stu.class;
    draft[`${hour}-${col}-${part}-class-auto`] = true;
    updateDayCells(draft);
    closeStudentSearch();
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadExcel?.(file);
    e.target.value = "";
  };

  const exportCSV = () => {
    const rows = [];
    rows.push(["Tarih", selectedDate]);
    rows.push([]);
    rows.push(["Saat", ...rooms]);
    hours.forEach((h) => {
      const base = [`${h}. Saat`];
      rooms.forEach((_, c) => {
        const t = dayCells[`${h}-${c}-teacher`] || "";
        const s1 = dayCells[`${h}-${c}-1-name`] || "";
        const s2 = dayCells[`${h}-${c}-2-name`] || "";
        base.push([t, s1, s2].filter(Boolean).join(" / "));
      });
      rows.push(base);
    });
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etut_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const rows = [];
    rows.push(["Tarih", selectedDate]);
    rows.push([]);
    rows.push(["Saat", ...rooms]);
    hours.forEach((h) => {
      const base = [`${h}. Saat`];
      rooms.forEach((_, c) => {
        const t = dayCells[`${h}-${c}-teacher`] || "";
        const s1 = dayCells[`${h}-${c}-1-name`] || "";
        const s2 = dayCells[`${h}-${c}-2-name`] || "";
        base.push([t, s1, s2].filter(Boolean).join(" / "));
      });
      rows.push(base);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Etüt Planı");
    XLSX.writeFile(wb, `etut_${selectedDate}.xlsx`);
  };

  const exportPdf = () => {
    window.print();
  };

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(localYMD(d));
  };

  useEffect(() => {
    checkConflicts(dayCells);
  }, [dayCells]); // eslint-disable-line

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <button
            onClick={() => changeDate(-1)}
            className="h-8 w-8 rounded-full border border-gray-300 text-lg leading-none hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            ‹
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 rounded-lg border border-gray-300 px-2 text-xs focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            onClick={() => changeDate(1)}
            className="h-8 w-8 rounded-full border border-gray-300 text-lg leading-none hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(localYMD(new Date()))}
            className="ml-1 h-8 rounded-lg border border-gray-300 px-2 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Bugün
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              setSelectedDate(localYMD(d));
            }}
            className="h-8 rounded-lg border border-gray-300 px-2 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Yarın
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          {currentRole === "admin" && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
              <span className="text-gray-600 dark:text-gray-300">Öğrenci listesi yükle (.xlsx)</span>
            </label>
          )}

          {currentRole === "admin" && (
            <>
              <button
                onClick={() => setRooms((r) => [...r, `ETÜT ${r.length + 1}`])}
                className="rounded-xl border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Salon Ekle
              </button>
              <button
                onClick={exportCSV}
                className="rounded-xl border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                CSV’e Aktar
              </button>
              <button
                onClick={exportXLSX}
                className="rounded-xl border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                .XLSX’e Aktar
              </button>
              <button
                onClick={exportPdf}
                className="rounded-xl bg-gray-900 px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 dark:bg白 dark:text-gray-900"
              >
                PDF’e Aktar
              </button>
            </>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mx-3 my-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {warnings.slice(0, 3).map((w, i) => (
            <div key={i} className="flex items-start gap-1">
              <AlertCircle size={12} className="mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {dbError && (
        <div className="mx-3 my-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-200">
          {dbError}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/60">
              <th className="w-24 px-3 py-3">Saat</th>
              {rooms.map((room, idx) => (
                <th key={idx} className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={room}
                      onChange={(e) =>
                        setRooms((r) => r.map((x, i) => (i === idx ? e.target.value : x)))
                      }
                      className="h-8 w-full rounded-lg border border-gray-300 px-2 text-xs focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                    />
                    {currentRole === "admin" && (
                      <button
                        onClick={() => setRooms((r) => r.filter((_, i) => i !== idx))}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-[10px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr
                key={h}
                className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
              >
                <td className="px-3 py-2 text-xs text-gray-500">{h}. Saat</td>
                {rooms.map((_, c) => {
                  const filled =
                    dayCells[`${h}-${c}-teacher`] ||
                    dayCells[`${h}-${c}-1-name`] ||
                    dayCells[`${h}-${c}-2-name`];
                  return (
                    <td
                      key={`${h}-${c}`}
                      className={`px-3 py-2 align-top ${
                        filled ? "bg-green-50 dark:bg-green-900/10 rounded-lg" : ""
                      }`}
                    >
                      {!cellVisible(h, c) ? (
                        <div className="h-[88px] w-full rounded-lg border border-dashed border-gray-300 text-center text-[11px] text-gray-400 dark:border-gray-700">
                          <div className="p-2">Bu etüt size atanmadı.</div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <select
                            value={dayCells[`${h}-${c}-teacher`] || ""}
                            onChange={(e) => setCell(`${h}-${c}-teacher`, e.target.value)}
                            disabled={!canEditThisCell()}
                            className={`h-8 w-full rounded-lg border px-2 text-xs ${
                              !canEditThisCell()
                                ? "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/40"
                                : "border-gray-300 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                            }`}
                          >
                            <option value="">Öğretmen Seçin</option>
                            {teachers.map((t, i) => (
                              <option key={i} value={t.name}>
                                {t.name}
                              </option>
                            ))}
                            <option value="AYHAN KAPICI (Rehber Öğretmen)">
                              AYHAN KAPICI (Rehber Öğretmen)
                            </option>
                          </select>

                          {[1, 2].map((p) => (
                            <div key={p} className="flex items-center gap-1">
                              <input
                                placeholder="No"
                                value={dayCells[`${h}-${c}-${p}-no`] || ""}
                                onChange={(e) =>
                                  canEditThisCell() &&
                                  onStudentNoChange(h, c, p, e.target.value)
                                }
                                disabled={!canEditThisCell()}
                                className={`h-8 w-16 rounded-lg border px-2 text-xs ${
                                  !canEditThisCell()
                                    ? "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/40"
                                    : "border-gray-300 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                                }`}
                              />
                              <input
                                placeholder={`Öğrenci ${p}`}
                                value={dayCells[`${h}-${c}-${p}-name`] || ""}
                                onChange={(e) =>
                                  canEditThisCell() &&
                                  onStudentNameChange(h, c, p, e.target.value)
                                }
                                disabled={!canEditThisCell()}
                                className={`h-8 flex-1 rounded-lg border px-2 text-xs ${
                                  !canEditThisCell()
                                    ? "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/40"
                                    : "border-gray-300 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                                }`}
                              />
                              <select
                                value={dayCells[`${h}-${c}-${p}-class`] || ""}
                                onChange={(e) =>
                                  canEditThisCell() &&
                                  setCell(`${h}-${c}-${p}-class`, e.target.value)
                                }
                                disabled={
                                  !canEditThisCell() ||
                                  !!dayCells[`${h}-${c}-${p}-class-auto`]
                                }
                                title={
                                  dayCells[`${h}-${c}-${p}-class-auto`]
                                    ? "Sınıf otomatik dolduruldu (salt-okunur)"
                                    : ""
                                }
                                className={`h-8 min-w-[76px] rounded-lg border px-2 text-xs ${
                                  !canEditThisCell()
                                    ? "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/40"
                                    : "border-gray-300 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                                }`}
                              >
                                <option value="">Sınıf</option>
                                {classOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              {currentRole === "admin" &&
                                dayCells[`${h}-${c}-${p}-class-auto`] && (
                                  <button
                                    type="button"
                                    onClick={() => unlockClass(h, c, p)}
                                    className="h-8 px-2 shrink-0 rounded-lg border border-gray-300 text-[10px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                                    title="Sınıfı düzenlemeye aç"
                                  >
                                    <Unlock size={14} />
                                  </button>
                                )}
                              {currentRole === "admin" && (
                                <button
                                  onClick={() => clearPart(h, c, p)}
                                  className="h-8 w-8 shrink-0 rounded-lg border border-gray-300 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                                  aria-label={`Öğrenci ${p}'i sil`}
                                >
                                  ×
                                </button>
                              )}
                              {currentRole === "admin" && (
                                <button
                                  type="button"
                                  onClick={() => openStudentSearch(h, c, p)}
                                  className="h-8 shrink-0 rounded-lg border border-gray-300 px-2 text-[10px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                                >
                                  Ara
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Öğrenci Bul</h3>
              <button
                onClick={closeStudentSearch}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Kapat
              </button>
            </div>
            <input
              autoFocus
              placeholder="No veya Ad yazın…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-3 h-9 w-full rounded-xl border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="max-h-72 overflow-auto rounded-xl border border-gray-200 text-xs dark:border-gray-800">
              <table className="min-w-full text-left">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">
                  <tr>
                    <th className="px-2 py-2">No</th>
                    <th className="px-2 py-2">Ad Soyad</th>
                    <th className="px-2 py-2">Sınıf</th>
                    <th className="px-2 py-2">Seç</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-500">
                        Sonuç bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu) => (
                      <tr
                        key={stu.no}
                        className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                      >
                        <td className="px-2 py-1">{stu.no}</td>
                        <td className="px-2 py-1">{stu.name}</td>
                        <td className="px-2 py-1">{stu.class}</td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => applyStudentFromSearch(stu)}
                            className="rounded-lg border border-gray-300 px-2 py-1 text-[10px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            Seç
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseStudentExcel(file, setStudentDb) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(ws, {
      header: ["A", "B", "C"],
      defval: "",
    });

    const db = {};
    for (let i = 0; i < rows.length; i++) {
      const A = String(rows[i]["A"]).trim();
      const B = String(rows[i]["B"]).trim();
      const C = String(rows[i]["C"]).trim();
      if (!A || A.toLowerCase() === "öğrenci no" || A.toLowerCase() === "ogrenci no" || A.toLowerCase() === "no") continue;
      if (!/\d/.test(A)) continue;
      db[A] = { name: B, class: C };
    }
    setStudentDb(db);
    alert(`Öğrenci listesi yüklendi. Kayıt sayısı: ${Object.keys(db).length}`);
  };
  reader.readAsArrayBuffer(file);
}

// (Basit test fonksiyonu vs. alt kısımlar varsa burada devam edebilir)
