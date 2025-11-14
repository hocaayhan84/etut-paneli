// src/App.jsx

import React, { useEffect, useState } from "react";
import { ShipWheel, AlertCircle, Unlock } from "lucide-react";
import * as XLSX from "xlsx";

// ——— Sabitler ve Varsayılanlar ———
const ADMIN_USER = { name: "AYHAN KAPICI (Rehber Öğretmen)", role: "admin" };
const ADMIN_PASSWORD = "4321"; // Yönetici şifresi
const LS_KEY_TEACHERS = "etut_teachers";

const DEFAULT_TEACHERS = [
  { id: 1, name: "HAYATİ GÜLDAL", branch: "", password: "1234" },
  { id: 2, name: "NECİP MURAT UYSAL", branch: "", password: "1234" },
];

// ——— Yardımcı Fonksiyonlar ———
export function localYMDUtil(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function safeSheetNameForXLSX(name, fallback = "Sayfa") {
  const cleaned =
    (name ?? "").toString().replace(/[\\\/?*\[\]:]/g, " ").trim() || fallback;
  return cleaned.slice(0, 31);
}

export default function App() {
  const [theme, setTheme] = useState("light");
  const isDark = theme === "dark";

  // ——— Öğretmenler (localStorage ile kalıcı) ———
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_TEACHERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTeachers(parsed);
        } else {
          setTeachers(DEFAULT_TEACHERS);
        }
      } else {
        setTeachers(DEFAULT_TEACHERS);
      }
    } catch (e) {
      console.error("Öğretmen listesi okunamadı, varsayılanlar yükleniyor:", e);
      setTeachers(DEFAULT_TEACHERS);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_TEACHERS, JSON.stringify(teachers));
    } catch (e) {
      console.error("Öğretmen listesi kaydedilemedi:", e);
    }
  }, [teachers]);

  // ——— Kullanıcılar ve giriş ———
  const [currentTeacher, setCurrentTeacher] = useState("");
  const [currentRole, setCurrentRole] = useState("");

  // Admin glow
  const [adminGlow, setAdminGlow] = useState(false);
  useEffect(() => {
    if (currentRole === "admin" && currentTeacher) {
      setAdminGlow(true);
      const t = setTimeout(() => setAdminGlow(false), 1800);
      return () => clearTimeout(t);
    }
  }, [currentRole, currentTeacher]);

  // Öğrenci veritabanı (No -> {name, class})
  const [studentDb, setStudentDb] = useState({});

  // ——— Yönetici için Öğretmen Yönetimi Form State ———
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [tName, setTName] = useState("");
  const [tBranch, setTBranch] = useState("");
  const [tPassword, setTPassword] = useState("");

  const resetTeacherForm = () => {
    setEditingTeacherId(null);
    setTName("");
    setTBranch("");
    setTPassword("");
  };

  const handleSaveTeacher = (e) => {
    e.preventDefault();
    const name = tName.trim();
    const branch = tBranch.trim();
    const password = tPassword.trim();

    if (!name || !password) {
      alert("Ad Soyad ve Şifre alanları zorunludur.");
      return;
    }

    const exists = teachers.find(
      (t) =>
        t.name.toLocaleUpperCase("tr-TR") ===
          name.toLocaleUpperCase("tr-TR") && t.id !== editingTeacherId
    );
    if (exists) {
      const proceed = window.confirm(
        `"${name}" isimli bir öğretmen zaten var. Yine de kaydetmek istiyor musunuz?`
      );
      if (!proceed) return;
    }

    if (editingTeacherId) {
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === editingTeacherId ? { ...t, name, branch, password } : t
        )
      );
    } else {
      const newTeacher = {
        id: Date.now(),
        name,
        branch,
        password,
      };
      setTeachers((prev) => [...prev, newTeacher]);
    }

    resetTeacherForm();
  };

  const handleEditTeacher = (id) => {
    const t = teachers.find((x) => x.id === id);
    if (!t) return;
    setEditingTeacherId(t.id);
    setTName(t.name || "");
    setTBranch(t.branch || "");
    setTPassword(t.password || "");
  };

  const handleDeleteTeacher = (id) => {
    const t = teachers.find((x) => x.id === id);
    const name = t?.name || "";
    if (
      !window.confirm(
        `"${name || "Bu öğretmen"}" kaydını silmek istediğinize emin misiniz?`
      )
    )
      return;
    setTeachers((prev) => prev.filter((x) => x.id !== id));
    if (editingTeacherId === id) {
      resetTeacherForm();
    }
  };

  const handleLogout = () => {
    setCurrentTeacher("");
    setCurrentRole("");
  };

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
                <h1 className="text-lg font-semibold leading-tight">
                  Ünye Fen Lisesi
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Öğretmen Paneli
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentTeacher && (
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1 text-xs dark:border-gray-800">
                  <span>
                    Giriş:{" "}
                    <span className="font-semibold">{currentTeacher}</span>
                  </span>
                  {currentRole === "admin" && (
                    <span
                      className={`flex items-center gap-1 rounded-lg bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200 ${
                        adminGlow
                          ? "shadow-md ring-2 ring-blue-400/50 dark:ring-blue-500/70"
                          : ""
                      }`}
                    >
                      <ShipWheel
                        size={12}
                        className="text-blue-600 dark:text-blue-300"
                      />{" "}
                      Yönetici Paneli
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="h-9 rounded-xl border border-gray-300 px-3 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {isDark ? "☀️ Aydınlık" : "🌙 Karanlık"}
              </button>
              {currentTeacher && (
                <button
                  onClick={handleLogout}
                  className="h-9 rounded-xl border border-gray-300 px-3 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Çıkış
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Ana düzen */}
        <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 md:grid-cols-[240px_1fr]">
          {/* Sol: Öğretmen listesi */}
          <aside className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-2 text-sm font-semibold">Öğretmenler</h2>
            <ul className="space-y-1 text-sm">
              {teachers.map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
              <li className="mt-2 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <ShipWheel
                  size={12}
                  className={`inline-block text-blue-500 dark:text-blue-300 ${
                    adminGlow ? "drop-shadow" : ""
                  }`}
                />
                {ADMIN_USER.name}
              </li>
            </ul>
          </aside>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            {!currentTeacher ? (
              <LoginCard
                teachers={teachers}
                adminUser={ADMIN_USER}
                adminPassword={ADMIN_PASSWORD}
                onSuccess={(name, role) => {
                  setCurrentTeacher(name);
                  setCurrentRole(role);
                }}
              />
            ) : (
              <>
                {currentRole === "admin" && (
                  <AdminTeacherPanel
                    teachers={teachers}
                    tName={tName}
                    tBranch={tBranch}
                    tPassword={tPassword}
                    setTName={setTName}
                    setTBranch={setTBranch}
                    setTPassword={setTPassword}
                    editingTeacherId={editingTeacherId}
                    onSave={handleSaveTeacher}
                    onReset={resetTeacherForm}
                    onEdit={handleEditTeacher}
                    onDelete={handleDeleteTeacher}
                  />
                )}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold leading-tight">
                    Etüt Salonları
                  </h2>
                  <div className="flex flex-col items-end gap-1 text-xs text-gray-500 dark:text-gray-400 md:flex-row md:items-center md:gap-3">
                    <span>
                      Rol:{" "}
                      <strong>
                        {currentRole === "admin" ? "Yönetici" : "Öğretmen"}
                      </strong>
                    </span>
                    <span>
                      Sütunlar: Etüt Adları • Satırlar: 1–8. saat
                    </span>
                  </div>
                </div>
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

// ——— Yönetici Öğretmen Yönetimi Paneli ———
function AdminTeacherPanel({
  teachers,
  tName,
  tBranch,
  tPassword,
  setTName,
  setTBranch,
  setTPassword,
  editingTeacherId,
  onSave,
  onReset,
  onEdit,
  onDelete,
}) {
  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Öğretmen Yönetimi</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Yeni öğretmen ekleyebilir, mevcutların ad ve şifrelerini
            güncelleyebilir veya silebilirsiniz.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSave}
        className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
      >
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-300">
              Ad Soyad
            </label>
            <input
              value={tName}
              onChange={(e) => setTName(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
              placeholder="Örn: HAYATİ GÜLDAL"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-300">
              Branş (İsteğe bağlı)
            </label>
            <input
              value={tBranch}
              onChange={(e) => setTBranch(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
              placeholder="Örn: Matematik"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-300">
              Şifre
            </label>
            <input
              value={tPassword}
              onChange={(e) => setTPassword(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 px-2 text-sm outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
              placeholder="Örn: 1234"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-gray-900"
            >
              {editingTeacherId ? "Güncelle" : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Temizle
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-auto rounded-xl border border-gray-200 bg-white text-xs dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full text-left">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">
            <tr>
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Ad Soyad</th>
              <th className="px-2 py-2">Branş</th>
              <th className="px-2 py-2">Şifre</th>
              <th className="px-2 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-3 text-center text-xs text-gray-500"
                >
                  Henüz öğretmen eklenmemiş.
                </td>
              </tr>
            ) : (
              teachers.map((t, idx) => (
                <tr
                  key={t.id}
                  className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                >
                  <td className="px-2 py-2">{idx + 1}</td>
                  <td className="px-2 py-2">{t.name}</td>
                  <td className="px-2 py-2">
                    {t.branch || <span className="text-gray-400">–</span>}
                  </td>
                  <td className="px-2 py-2">{t.password}</td>
                  <td className="px-2 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(t.id)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-[11px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(t.id)}
                        className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Not: Gerçek sistemlerde şifreler bu şekilde açık gösterilmez; okul içi
        kullanım ve pratiklik amacıyla burada görünür tutulmuştur.
      </p>
    </div>
  );
}

// ——— Giriş Kartı ———
function LoginCard({ teachers, adminUser, adminPassword, onSuccess }) {
  const [selected, setSelected] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setErr("");

    if (!selected) {
      setErr("Lütfen kullanıcı seçin.");
      return;
    }

    // Yönetici mi?
    if (selected === adminUser.name) {
      if (pwd === adminPassword) {
        onSuccess(adminUser.name, "admin");
      } else {
        setErr("Yönetici şifresi hatalı.");
      }
      return;
    }

    // Öğretmen girişi
    const teacher = teachers.find((t) => t.name === selected);
    if (!teacher) {
      setErr("Bu isimde bir öğretmen bulunamadı.");
      return;
    }
    if (pwd !== (teacher.password || "")) {
      setErr("Şifre hatalı.");
      return;
    }
    onSuccess(teacher.name, "teacher");
  };

  const options = [
    ...teachers.map((t) => ({ label: t.name, value: t.name })),
    { label: adminUser.name, value: adminUser.name },
  ];

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <h3 className="mb-2 text-sm font-semibold">Giriş Yap</h3>
      <form onSubmit={submit} className="space-y-2 text-sm">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Kullanıcı</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-9 w-full rounded-xl border border-gray-300 px-2 outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">Seçin…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
            className="h-9 w-full rounded-xl border border-gray-300 px-2 outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        {err && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
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
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Varsayılan yönetici: <strong>{adminUser.name}</strong> (şifre:{" "}
        <code>{adminPassword}</code>)<br />
        Varsayılan öğretmenler: HAYATİ GÜLDAL, NECİP MURAT UYSAL (şifre:{" "}
        <code>1234</code>).
      </p>
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
  const [onlyMine, setOnlyMine] = useState(true);

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
              msgs.push(
                `"${name}" ${h}. saatte birden fazla salonda (${selectedDate}).`
              );
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
    setCellsByDate((prev) => ({ ...prev, [selectedDate]: draft }));
    checkConflicts(draft);
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
    currentRole === "admin" || !onlyMine ? true : isCellAssignedToMe(hour, col);

  // Admin: her yeri düzenler, öğretmen: sadece kendi adına atanmış sütun/saat
  const canEditThisCell = (hour, col) => {
    if (currentRole === "admin") return true;
    if (currentRole === "teacher") {
      return (dayCells[`${hour}-${col}-teacher`] || "") === currentTeacher;
    }
    return false;
  };

  if (typeof window !== "undefined") {
    window.__etutState__ = { rooms, hours, cells: dayCells, date: selectedDate };
  }

  useEffect(() => {
    checkConflicts(dayCells);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, rooms.length]);

  const onStudentNoChange = (hour, col, part, no) => {
    const draft = { ...dayCells, [`${hour}-${col}-${part}-no`]: no };
    const key = no?.toString()?.trim?.();
    const rec = key ? studentDb[key] : null;
    if (rec) {
      draft[`${hour}-${col}-${part}-name`] = rec.name || "";
      draft[`${hour}-${col}-${part}-class`] = rec.class || "";
      draft[`${hour}-${col}-${part}-class-auto`] = true;
    } else {
      draft[`${hour}-${col}-${part}-name`] =
        draft[`${hour}-${col}-${part}-name`] || "";
      draft[`${hour}-${col}-${part}-class`] =
        draft[`${hour}-${col}-${part}-class`] || "";
    }
    updateDayCells(draft);
  };

  const onStudentNameChange = (hour, col, part, name) => {
    const draft = { ...dayCells, [`${hour}-${col}-${part}-name`]: name };
    const q = (name || "").trim().toLocaleUpperCase("tr-TR");
    if (q) {
      const entries = Object.entries(studentDb);
      let match = entries.find(
        ([_, v]) =>
          (v.name || "").toLocaleUpperCase("tr-TR") === q
      );
      if (!match) {
        const starts = entries.filter(([_, v]) =>
          (v.name || "")
            .toLocaleUpperCase("tr-TR")
            .startsWith(q)
        );
        if (starts.length === 1) match = starts[0];
      }
      if (match) {
        const [no, v] = match;
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

  // Öğrenci arama modalı
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSlot, setSearchSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const openStudentSearch = (hour, col, part) => {
    if (!canEditThisCell(hour, col)) return;
    setSearchSlot({ hour, col, part });
    setSearchQuery("");
    setSearchOpen(true);
  };

  const closeStudentSearch = () => setSearchOpen(false);

  const filteredStudents = Object.entries(studentDb)
    .map(([no, v]) => ({ no, name: v.name || "", class: v.class || "" }))
    .filter((s) => {
      const q = searchQuery.trim().toLocaleLowerCase("tr-TR");
      if (!q) return true;
      return (
        s.no.toLocaleLowerCase("tr-TR").includes(q) ||
        s.name.toLocaleLowerCase("tr-TR").includes(q)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const pickStudent = (stu) => {
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

  const buildRows = () => {
    const rows = [];
    hours.forEach((h) => {
      rooms.forEach((r, cIdx) => {
        const teacher = dayCells[`${h}-${cIdx}-teacher`] || "";
        [1, 2].forEach((p) => {
          const no = (dayCells[`${h}-${cIdx}-${p}-no`] || "").trim();
          const name = (dayCells[`${h}-${cIdx}-${p}-name`] || "").trim();
          const cls = dayCells[`${h}-${cIdx}-${p}-class`] || "";
          if (no || name || teacher) {
            rows.push({
              date: selectedDate,
              hour: h,
              room: rooms[cIdx],
              teacher,
              student_no: no,
              student_name: name,
              class: cls,
            });
          }
        });
      });
    });
    return rows;
  };

  const exportCSV = () => {
    const rows = buildRows();
    const header = [
      "Tarih",
      "Saat",
      "Salon",
      "Öğretmen",
      "Öğrenci No",
      "Öğrenci Adı",
      "Sınıf",
    ];
    const lines = [header.join(",")].concat(
      rows.map((r) =>
        [
          r.date,
          r.hour,
          r.room,
          r.teacher,
          r.student_no,
          r.student_name,
          r.class,
        ]
          .map((v) =>
            `"${(v ?? "").toString().replaceAll('"', '""')}"`
          )
          .join(",")
      )
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etut_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const rows = buildRows();
    const wb = XLSX.utils.book_new();
    const wsAll = XLSX.utils.json_to_sheet(rows, {
      header: [
        "date",
        "hour",
        "room",
        "teacher",
        "student_no",
        "student_name",
        "class",
      ],
    });
    XLSX.utils.sheet_add_aoa(
      wsAll,
      [["Tarih", "Saat", "Salon", "Öğretmen", "Öğrenci No", "Öğrenci Adı", "Sınıf"]],
      { origin: "A1" }
    );
    XLSX.utils.sheet_add_json(wsAll, rows, {
      origin: "A2",
      skipHeader: true,
    });
    XLSX.utils.book_append_sheet(wb, wsAll, "Tümü");
    const byTeacher = rows.reduce((acc, r) => {
      const k = r.teacher || "(Öğretmensiz)";
      (acc[k] ||= []).push(r);
      return acc;
    }, {});
    Object.entries(byTeacher).forEach(([teacher, list], idx) => {
      if (!list.length) return;
      const ws = XLSX.utils.json_to_sheet(list, {
        header: [
          "date",
          "hour",
          "room",
          "teacher",
          "student_no",
          "student_name",
          "class",
        ],
      });
      XLSX.utils.sheet_add_aoa(
        ws,
        [["Tarih", "Saat", "Salon", "Öğretmen", "Öğrenci No", "Öğrenci Adı", "Sınıf"]],
        { origin: "A1" }
      );
      XLSX.utils.sheet_add_json(ws, list, {
        origin: "A2",
        skipHeader: true,
      });
      const safeName = safeSheetNameForXLSX(teacher) || `Sayfa ${idx + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etut_${selectedDate}_ogretmenler.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const entries = [];
    hours.forEach((h) => {
      rooms.forEach((r, cIdx) => {
        const teacher = dayCells[`${h}-${cIdx}-teacher`] || "";
        const s1no = (dayCells[`${h}-${cIdx}-1-no`] || "").trim();
        const s1 = (dayCells[`${h}-${cIdx}-1-name`] || "").trim();
        const s1c = dayCells[`${h}-${cIdx}-1-class`] || "";
        const s2no = (dayCells[`${h}-${cIdx}-2-no`] || "").trim();
        const s2 = (dayCells[`${h}-${cIdx}-2-name`] || "").trim();
        const s2c = dayCells[`${h}-${cIdx}-2-class`] || "";
        if (teacher || s1 || s2) {
          entries.push({
            hour: h,
            room: r,
            teacher,
            students: [
              s1 || s1no
                ? `${s1no ? s1no + " - " : ""}${s1}${
                    s1c ? ` (${s1c})` : ""
                  }`
                : null,
              s2 || s2no
                ? `${s2no ? s2no + " - " : ""}${s2}${
                    s2c ? ` (${s2c})` : ""
                  }`
                : null,
            ].filter(Boolean),
          });
        }
      });
    });

    const teacherCount = new Map();
    const studentCount = new Map();
    entries.forEach((e) => {
      if (e.teacher)
        teacherCount.set(e.teacher, (teacherCount.get(e.teacher) || 0) + 1);
      e.students.forEach((s) =>
        studentCount.set(s, (studentCount.get(s) || 0) + 1)
      );
    });

    const win = window.open("", "_blank");
    if (!win) return;
    const style = `
      <style>
        body { font-family: ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial; padding: 16px; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        h2 { font-size: 16px; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
        th { background: #f3f4f6; text-align: left; }
        .small { font-size: 12px; color: #6b7280; }
      </style>`;
    const teacherRows =
      Array.from(teacherCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(
          ([t, c]) => `<tr><td>${t}</td><td>${c}</td></tr>`
        )
        .join("") || '<tr><td colspan="2">Kayıt yok</td></tr>';
    const studentRows =
      Array.from(studentCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(
          ([s, c]) => `<tr><td>${s}</td><td>${c}</td></tr>`
        )
        .join("") || '<tr><td colspan="2">Kayıt yok</td></tr>';
    const detailRows =
      entries
        .sort(
          (a, b) =>
            a.hour - b.hour || a.room.localeCompare(b.room)
        )
        .map(
          (e) =>
            `<tr><td>${e.hour}. Saat</td><td>${e.room}</td><td>${
              e.teacher || "-"
            }</td><td>${e.students.join(", ") || "-"}</td></tr>`
        )
        .join("") || '<tr><td colspan="4">Kayıt yok</td></tr>';

    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>
      <h1>Ünye Fen Lisesi – Etüt Raporu (${selectedDate})</h1>
      <div class="small">Oluşturma: ${new Date().toLocaleString(
        "tr-TR"
      )}</div>
      <h2>Öğretmen Ders Sayacı</h2>
      <table><thead><tr><th>Öğretmen</th><th>Ders Sayısı</th></tr></thead><tbody>${teacherRows}</tbody></table>
      <h2>Öğrenci Ders Sayacı</h2>
      <table><thead><tr><th>Öğrenci</th><th>Ders Sayısı</th></tr></thead><tbody>${studentRows}</tbody></table>
      <h2>Detaylı Liste</h2>
      <table><thead><tr><th>Saat</th><th>Salon</th><th>Öğretmen</th><th>Öğrenciler</th></tr></thead><tbody>${detailRows}</tbody></table>
      <script>window.print();</script>
    </body></html>`
    );
    win.document.close();
  };

  return (
    <div className="overflow-auto rounded-2xl border border-gray-200 dark:border-gray-800">
      {/* Üst araç çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 p-3 text-sm dark:border-gray-800">
        <div className="font-semibold">Salon Planı</div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Tarih seçimi + kısayollar */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-500">Tarih:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 px-2 outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(localYMD(new Date()))}
              className="ml-1 h-8 rounded-lg border border-gray-300 px-2 text-[11px] transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
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
              className="h-8 rounded-lg border border-gray-300 px-2 text-[11px] transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Yarın
            </button>
          </div>

          {/* Excel yükleme yalnız yönetici */}
          {currentRole === "admin" && (
            <label className="ml-2 flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900/40">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelUpload}
              />
              <span className="text-gray-600 dark:text-gray-300">
                Öğrenci listesi yükle (.xlsx)
              </span>
            </label>
          )}

          {/* Görünürlük filtresi (öğretmen) */}
          {currentRole !== "admin" && (
            <label className="ml-2 flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
              />{" "}
              Sadece benim atamalarım
            </label>
          )}

          {/* Yönetici aksiyonları */}
          {currentRole === "admin" && (
            <>
              <button
                onClick={() =>
                  setRooms((r) => [...r, `ETÜT ${r.length + 1}`])
                }
                className="rounded-xl border border-gray-300 px-3 py-1 text-xs transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Salon Ekle
              </button>
              <button
                onClick={exportCSV}
                className="rounded-xl border border-gray-300 px-3 py-1 text-xs transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                CSV’e Aktar
              </button>
              <button
                onClick={exportXLSX}
                className="rounded-xl border border-gray-300 px-3 py-1 text-xs transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                .XLSX’e Aktar
              </button>
              <button
                onClick={exportPdf}
                className="rounded-xl bg-gray-900 px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-gray-900"
              >
                PDF’e Aktar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Uyarılar */}
      {warnings.length > 0 && (
        <div className="mx-3 my-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {warnings.slice(0, 3).map((w, i) => (
            <div key={i}>⚠️ {w}</div>
          ))}
          {warnings.length > 3 && (
            <div>… {warnings.length - 3} benzer uyarı daha.</div>
          )}
        </div>
      )}

      {/* Tablo */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-900/60">
              <th className="w-24 px-3 py-3">Saat</th>
              {rooms.map((room, idx) => (
                <th key={idx} className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={room}
                      onChange={(e) =>
                        setRooms((r) =>
                          r.map((x, i) =>
                            i === idx ? e.target.value : x
                          )
                        )
                      }
                      className="h-8 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                    />
                    {currentRole === "admin" && (
                      <button
                        onClick={() =>
                          setRooms((r) => r.filter((_, i) => i !== idx))
                        }
                        className="rounded-lg border border-gray-300 px-2 text-xs transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        aria-label="Salonu kaldır"
                      >
                        ×
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
                <td className="px-3 py-2 text-xs text-gray-500">
                  {h}. Saat
                </td>
                {rooms.map((_, c) => {
                  const filled =
                    dayCells[`${h}-${c}-teacher`] ||
                    dayCells[`${h}-${c}-1-name`] ||
                    dayCells[`${h}-${c}-2-name`];
                  const editable = canEditThisCell(h, c);
                  return (
                    <td
                      key={`${h}-${c}`}
                      className={`px-3 py-2 align-top ${
                        filled
                          ? "bg-green-50 dark:bg-green-900/10 rounded-lg"
                          : ""
                      }`}
                    >
                      {!cellVisible(h, c) ? (
                        <div className="h-[88px] w-full rounded-lg border border-dashed border-gray-300 text-center text-[11px] text-gray-400 dark:border-gray-700">
                          <div className="p-2">
                            Bu hücre size atanmadı.
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {/* Öğretmen (sadece admin atar) */}
                          {currentRole === "admin" ? (
                            <select
                              value={
                                dayCells[`${h}-${c}-teacher`] || ""
                              }
                              onChange={(e) =>
                                setCell(
                                  `${h}-${c}-teacher`,
                                  e.target.value
                                )
                              }
                              className="h-8 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                            >
                              <option value="">Öğretmen ata</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.name}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={
                                dayCells[`${h}-${c}-teacher`] || ""
                              }
                              readOnly
                              placeholder="Öğretmen seçilmemiş"
                              className="h-8 w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40"
                            />
                          )}

                          {/* Öğrenciler: NO + Ad + Sınıf + Sil */}
                          {[1, 2].map((p) => (
                            <div
                              key={p}
                              className="flex items-center gap-1"
                            >
                              <input
                                placeholder={`No`}
                                value={
                                  dayCells[`${h}-${c}-${p}-no`] || ""
                                }
                                onChange={(e) =>
                                  editable &&
                                  onStudentNoChange(
                                    h,
                                    c,
                                    p,
                                    e.target.value
                                  )
                                }
                                disabled={!editable}
                                className={`h-8 w-16 rounded-lg border px-2 text-xs outline-none transition focus:ring-2 dark:border-gray-700 dark:bg-gray-900 ${
                                  !editable
                                    ? "cursor-not-allowed bg-gray-50 text-gray-400"
                                    : "border-gray-300 focus:ring-gray-900/20"
                                }`}
                              />
                              {(() => {
                                const no =
                                  dayCells[`${h}-${c}-${p}-no`];
                                const missing =
                                  no &&
                                  !studentDb[
                                    no?.toString()?.trim?.()
                                  ];
                                return missing ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openStudentSearch(h, c, p)
                                    }
                                    title="No bulunamadı"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100"
                                  >
                                    <AlertCircle size={14} />
                                  </button>
                                ) : null;
                              })()}
                              <input
                                placeholder={`Öğrenci ${p} Adı`}
                                value={
                                  dayCells[
                                    `${h}-${c}-${p}-name`
                                  ] || ""
                                }
                                onChange={(e) =>
                                  editable &&
                                  onStudentNameChange(
                                    h,
                                    c,
                                    p,
                                    e.target.value
                                  )
                                }
                                disabled={!editable}
                                className={`h-8 w-full rounded-lg border px-2 text-xs outline-none transition focus:ring-2 dark:border-gray-700 dark:bg-gray-900 ${
                                  !editable
                                    ? "cursor-not-allowed bg-gray-50 text-gray-400"
                                    : "border-gray-300 focus:ring-gray-900/20"
                                }`}
                              />
                              <select
                                value={
                                  dayCells[
                                    `${h}-${c}-${p}-class`
                                  ] || ""
                                }
                                onChange={(e) =>
                                  editable &&
                                  setCell(
                                    `${h}-${c}-${p}-class`,
                                    e.target.value
                                  )
                                }
                                disabled={
                                  !editable ||
                                  !!dayCells[
                                    `${h}-${c}-${p}-class-auto`
                                  ]
                                }
                                title={
                                  dayCells[
                                    `${h}-${c}-${p}-class-auto`
                                  ]
                                    ? "Sınıf otomatik dolduruldu (salt-okunur)"
                                    : ""
                                }
                                className={`h-8 min-w-[76px] rounded-lg border px-2 text-xs outline-none transition focus:ring-2 dark:border-gray-700 dark:bg-gray-900 ${
                                  !editable ||
                                  dayCells[
                                    `${h}-${c}-${p}-class-auto`
                                  ]
                                    ? "cursor-not-allowed bg-gray-50 text-gray-400"
                                    : "border-gray-300 focus:ring-gray-900/20"
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
                                dayCells[
                                  `${h}-${c}-${p}-class-auto`
                                ] && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      unlockClass(h, c, p)
                                    }
                                    className="h-8 shrink-0 rounded-lg border border-gray-300 px-2 text-xs transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                                    title="Sınıfı düzenlemeye aç"
                                  >
                                    <Unlock size={14} />
                                  </button>
                                )}
                              {currentRole === "admin" && (
                                <button
                                  onClick={() =>
                                    clearPart(h, c, p)
                                  }
                                  className="h-8 w-8 shrink-0 rounded-lg border border-gray-300 text-xs transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                                  aria-label={`Öğrenci ${p}'i sil`}
                                >
                                  ×
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

      {/* Öğrenci Arama Modalı */}
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
              className="mb-3 h-9 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="max-h-80 overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-900/60">
                  <tr>
                    <th className="px-3 py-2 text-left">No</th>
                    <th className="px-3 py-2 text-left">Ad Soyad</th>
                    <th className="px-3 py-2 text-left">Sınıf</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr
                      key={s.no}
                      className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                    >
                      <td className="px-3 py-2">{s.no}</td>
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2">{s.class}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => pickStudent(s)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          Seç
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-xs text-gray-500"
                      >
                        Sonuç yok. Arama terimini değiştirin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 p-3 text-xs text-gray-500 dark:border-gray-800">
        Not: Atamalar <strong>tarih bazlı</strong> tutulur. Excel (.xlsx)
        yüklediğinizde öğrencinin <strong>numarasını</strong> yazınca adı ve
        sınıfı otomatik dolar.
      </div>
    </div>
  );
}

// ——— Excel (.xlsx) okuma ———
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
      if (
        !A ||
        A.toLowerCase() === "öğrenci no" ||
        A.toLowerCase() === "ogrenci no" ||
        A.toLowerCase() === "no"
      )
        continue;
      if (!/\d/.test(A)) continue;
      db[A] = { name: B, class: C };
    }
    setStudentDb(db);
    alert(
      `Öğrenci listesi yüklendi. Kayıt sayısı: ${Object.keys(db).length}`
    );
  };
  reader.readAsArrayBuffer(file);
}
