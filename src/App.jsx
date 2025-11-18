// src/App.jsx

import React, { useEffect, useState } from "react";
import { ShipWheel, AlertCircle, Unlock } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// ——— Supabase client ———
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase URL veya KEY tanımlı değil. .env / Netlify Environment Variables içinde VITE_SUPABASE_URL ve VITE_SUPABASE_KEY eklemeyi unutmayın."
  );
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ——— Sabitler ve Varsayılanlar ———
const ADMIN_USER = { name: "AYHAN KAPICI (Rehber Öğretmen)", role: "admin" };
const ADMIN_PASSWORD = "4321"; // Yönetici şifresi

const MANAGER_USER = { name: "ETÜT SORUMLUSU", role: "manager" };
const MANAGER_PASSWORD = "9999"; // Manager şifresi (isterseniz Supabase'e de taşıyabiliriz)

const TEACHERS_TABLE = "etut_ogretmenler";

// ——— Yardımcı fonksiyonlar ———
function localYMDUtil(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeSheetNameForXLSX(raw) {
  if (!raw) return "";
  // Excel'in izin vermediği karakterleri temizle
  const invalid = /[\\/?*[\]:]/g;
  let name = raw.replace(invalid, " ").trim();
  if (name.length > 31) name = name.slice(0, 31);
  return name || "Sayfa";
}

// ——— Ana Uygulama ———
function App() {
  // Aktif kullanıcı
  const [currentUser, setCurrentUser] = useState(null); // { name, role }
  const currentRole = currentUser?.role || null;
  const currentTeacher = currentRole === "teacher" ? currentUser.name : "";

  // Login form state
  const [loginRole, setLoginRole] = useState("admin");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Öğretmen listesi
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState("");

  // Öğrenci veritabanı (no -> { name, class })
  const [studentDb, setStudentDb] = useState({});
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  // İlk açılışta öğretmenleri çek
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    async function loadTeachers() {
      try {
        setTeachersLoading(true);
        setTeachersError("");

        const { data, error } = await supabase
          .from(TEACHERS_TABLE)
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          console.error("Öğretmenler alınırken hata:", error);
          if (mounted) {
            setTeachersError("Öğretmen listesi alınırken hata oluştu.");
          }
          return;
        }

        if (!mounted) return;
        setTeachers(data || []);
      } catch (e) {
        console.error("Öğretmenler beklenmeyen hata:", e);
        if (mounted) {
          setTeachersError("Öğretmen listesi alınırken beklenmeyen hata oluştu.");
        }
      } finally {
        if (mounted) setTeachersLoading(false);
      }
    }

    loadTeachers();
    return () => {
      mounted = false;
    };
  }, []);

  // İlk açılışta Supabase'ten öğrenci listesi çek (varsa)
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    async function loadStudents() {
      try {
        setStudentsLoading(true);
        setStudentsError("");

        const { data, error } = await supabase
          .from("etut_ogrenciler")
          .select("ogr_no, ad, sinif");

        if (error) {
          console.error("Öğrenciler alınırken hata:", error);
          if (mounted) {
            setStudentsError("Öğrenci listesi alınırken hata oluştu.");
          }
          return;
        }

        if (!mounted) return;

        const db = {};
        (data || []).forEach((row) => {
          const key = (row.ogr_no || "").toString().trim();
          if (!key) return;
          db[key] = {
            name: row.ad || "",
            class: row.sinif || "",
          };
        });

        setStudentDb(db);
      } catch (e) {
        console.error("Öğrenciler beklenmeyen hata:", e);
        if (mounted) {
          setStudentsError("Öğrenci listesi alınırken beklenmeyen hata oluştu.");
        }
      } finally {
        if (mounted) setStudentsLoading(false);
      }
    }

    loadStudents();
    return () => {
      mounted = false;
    };
  }, []);

  // Excel yükleme callback'i (EtutTable'a prop olarak gidecek)
  const handleUploadExcel = (file) => {
    if (!file) return;
    parseStudentExcel(file, setStudentDb, supabase);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginPassword("");
    setLoginError("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (!supabase && loginRole === "teacher") {
      setLoginError("Sunucu bağlantısı yapılamadığı için öğretmen girişi kullanılamıyor.");
      return;
    }

    try {
      setLoginLoading(true);

      // ADMIN
      if (loginRole === "admin") {
        if (loginPassword !== ADMIN_PASSWORD) {
          setLoginError("Yönetici şifresi hatalı.");
          return;
        }
        setCurrentUser(ADMIN_USER);
        return;
      }

      // MANAGER
      if (loginRole === "manager") {
        if (loginPassword !== MANAGER_PASSWORD) {
          setLoginError("Sorumlu şifresi hatalı.");
          return;
        }
        setCurrentUser(MANAGER_USER);
        return;
      }

      // TEACHER
      const name = loginName.trim();
      if (!name || !loginPassword) {
        setLoginError("Lütfen öğretmen adı ve şifre girin.");
        return;
      }

      const { data, error } = await supabase
        .from(TEACHERS_TABLE)
        .select("*")
        .eq("name", name)
        .single();

      if (error || !data) {
        console.error("Öğretmen girişi - kullanıcı bulunamadı:", error);
        setLoginError("Öğretmen kaydı bulunamadı.");
        return;
      }

      if ((data.password || "") !== loginPassword) {
        setLoginError("Öğretmen şifresi hatalı.");
        return;
      }

      setCurrentUser({ name: data.name, role: "teacher" });
    } catch (err) {
      console.error("Login beklenmeyen hata:", err);
      setLoginError("Giriş yapılırken beklenmeyen bir hata oluştu.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ——— GÖRÜNÜM: Giriş ekranı ———
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900">
              <ShipWheel size={22} />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                Ünye Fen Lisesi – Etüt Paneli
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Yönetici, sorumlu ve öğretmen girişi
              </p>
            </div>
          </div>

          <form
            onSubmit={handleLoginSubmit}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
          >
            <div className="mb-3 grid gap-2 text-xs md:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Rol
                </span>
                <select
                  value={loginRole}
                  onChange={(e) => {
                    setLoginRole(e.target.value);
                    setLoginError("");
                  }}
                  className="h-9 rounded-lg border border-slate-300 px-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="admin">Yönetici (Rehber Öğretmen)</option>
                  <option value="manager">Etüt Sorumlusu</option>
                  <option value="teacher">Öğretmen</option>
                </select>
              </label>

              {loginRole === "teacher" && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Öğretmen Adı
                    </span>
                    <input
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder="Ad Soyad"
                      className="h-9 rounded-lg border border-slate-300 px-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Şifre
                    </span>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-9 rounded-lg border border-slate-300 px-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </label>
                </>
              )}

              {loginRole !== "teacher" && (
                <div className="md:col-span-2 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Şifre
                  </span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-9 rounded-lg border border-slate-300 px-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">
                    Yönetici ve sorumlu şifreleri sabittir. (İleride Supabase'e
                    de taşıyabiliriz.)
                  </span>
                </div>
              )}
            </div>

            {loginError && (
              <div className="mb-2 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                {loginError}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <button
                type="submit"
                disabled={loginLoading}
                className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-slate-50 dark:text-slate-900"
              >
                {loginLoading ? "Giriş yapılıyor…" : "Giriş Yap"}
              </button>
              <div className="text-[10px] text-slate-400">
                Supabase durumu:{" "}
                {supabase ? "Bağlı" : "BAĞLI DEĞİL (env değişkenlerini kontrol edin)"}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ——— GÖRÜNÜM: Giriş yapıldı ———
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900">
              <ShipWheel size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold">
                Ünye Fen Lisesi – Etüt Paneli
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Tarih bazlı etüt planlama, özet ve raporlar
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="text-right">
              <div className="font-semibold">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {currentRole === "admin"
                  ? "Yönetici (Rehber Öğretmen)"
                  : currentRole === "manager"
                  ? "Etüt Sorumlusu"
                  : "Öğretmen"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="h-8 rounded-lg border border-slate-300 px-3 text-[11px] transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-3 p-3">
        {/* Üst bilgilendirme / uyarılar */}
        <div className="grid gap-3 text-xs md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-200">
              Rol Bilgisi
            </div>
            {currentRole === "admin" && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Etüt atamalarını yapabilir, tüm salonları görebilir, Excel ile
                öğrenci listesi yükleyebilir ve raporlara erişebilirsiniz.
              </p>
            )}
            {currentRole === "manager" && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tüm öğretmenlerin etüt özetlerini ve raporlarını görebilir,
                CSV/XLSX/PDF çıktıları alabilirsiniz. Etüt hücrelerini{" "}
                <strong>düzenleyemezsiniz</strong>.
              </p>
            )}
            {currentRole === "teacher" && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sadece size atanmış etütleri görebilir, şifrenizi değiştirebilir
                ve kendi özetlerinizi görüntüleyebilirsiniz. Hücre düzenleme{" "}
                <strong>yöneticiye özeldir</strong>.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-200">
              Öğretmen Listesi Durumu
            </div>
            {teachersLoading ? (
              <p className="text-[11px] text-slate-500">Öğretmenler yükleniyor…</p>
            ) : teachersError ? (
              <p className="text-[11px] text-rose-600">{teachersError}</p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kayıtlı öğretmen sayısı:{" "}
                <strong>{teachers.length}</strong>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-200">
              Öğrenci Listesi Durumu
            </div>
            {studentsLoading ? (
              <p className="text-[11px] text-slate-500">
                Supabase'ten öğrenci listesi yükleniyor…
              </p>
            ) : studentsError ? (
              <p className="text-[11px] text-rose-600">{studentsError}</p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kayıtlı öğrenci sayısı:{" "}
                <strong>{Object.keys(studentDb).length}</strong>. Yönetici,
                Excel ile listeyi güncelleyebilir.
              </p>
            )}
          </div>
        </div>

        {/* ANA ETÜT TABLOSU ve ALTLARI */}
        <EtutTable
          teachers={teachers}
          currentTeacher={currentTeacher}
          currentRole={currentRole}
          studentDb={studentDb}
          onUploadExcel={handleUploadExcel}
        />
      </main>
    </div>
  );
}
// ——— Etüt Tablosu ———
function EtutTable({
  teachers,
  currentTeacher,
  currentRole,
  studentDb,
  onUploadExcel,
}) {
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

  // ——— ÖĞRETMEN ÖZET PANELİ (Günlük, Haftalık, Toplam) ———
  const [summary, setSummary] = useState({
    day: 0,
    week: 0,
    total: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  // Öğretmen özet listeleri (sayılara tıklayınca açılan liste)
  const [teacherSummaryOpen, setTeacherSummaryOpen] = useState({
    day: false,
    week: false,
    total: false,
  });
  const [teacherSummaryLists, setTeacherSummaryLists] = useState({
    day: [],
    week: [],
    total: [],
  });
  const [teacherSummaryListLoading, setTeacherSummaryListLoading] = useState({
    day: false,
    week: false,
    total: false,
  });
  const [teacherSummaryListError, setTeacherSummaryListError] = useState({
    day: "",
    week: "",
    total: "",
  });

  // Öğretmenin kendi etüt listesi (bugün + bu hafta ileri tarihli)
  const [myTodaySessions, setMyTodaySessions] = useState([]);
  const [myFutureSessions, setMyFutureSessions] = useState([]);
  const [mySessionsLoading, setMySessionsLoading] = useState(false);
  const [mySessionsError, setMySessionsError] = useState("");

  // Öğretmen "şifremi değiştir" paneli
  const [pwdPanelOpen, setPwdPanelOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [pwdChanging, setPwdChanging] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!oldPwd || !newPwd || !newPwd2) {
      setPwdError("Tüm alanları doldurun.");
      return;
    }
    if (newPwd !== newPwd2) {
      setPwdError("Yeni şifreler birbiriyle uyuşmuyor.");
      return;
    }

    if (!supabase) {
      setPwdError("Sunucu bağlantısı yapılamadı.");
      return;
    }

    try {
      setPwdChanging(true);

      // Mevcut öğretmeni bul
      const { data, error } = await supabase
        .from(TEACHERS_TABLE)
        .select("*")
        .eq("name", currentTeacher)
        .single();

      if (error || !data) {
        console.error("Şifre değiştirirken öğretmen bulunamadı:", error);
        setPwdError("Kullanıcı kaydı bulunamadı.");
        return;
      }

      if ((data.password || "") !== oldPwd) {
        setPwdError("Mevcut şifre yanlış.");
        return;
      }

      const { error: updateError } = await supabase
        .from(TEACHERS_TABLE)
        .update({ password: newPwd })
        .eq("id", data.id);

      if (updateError) {
        console.error("Şifre güncelleme hatası:", updateError);
        setPwdError("Şifre güncellenirken hata oluştu.");
        return;
      }

      setPwdSuccess("Şifreniz başarıyla güncellendi.");
      setOldPwd("");
      setNewPwd("");
      setNewPwd2("");
    } catch (err) {
      console.error("Şifre değiştirirken beklenmeyen hata:", err);
      setPwdError("Şifre değiştirilirken beklenmeyen bir hata oluştu.");
    } finally {
      setPwdChanging(false);
    }
  };

  const computeWeekRange = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      const today = new Date();
      return {
        start: localYMD(today),
        end: localYMD(today),
      };
    }
    const day = d.getDay(); // 0: Pazar, 1: Pazartesi, ...
    const diffToMonday = (day + 6) % 7; // Pazartesiye göre
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: localYMD(monday),
      end: localYMD(sunday),
    };
  };

  // Öğretmen özet sayıları (gün/hafta/toplam)
  useEffect(() => {
    let isMounted = true;

    async function fetchSummary() {
      if (!supabase || currentRole !== "teacher" || !currentTeacher) {
        if (isMounted) {
          setSummary({ day: 0, week: 0, total: 0 });
          setSummaryError("");
        }
        return;
      }

      try {
        setSummaryLoading(true);
        setSummaryError("");

        const { start, end } = computeWeekRange(selectedDate);

        const [dayRes, weekRes, totalRes] = await Promise.all([
          supabase
            .from("etut_atamalari")
            .select("*", { count: "exact", head: true })
            .eq("ogretmen", currentTeacher)
            .eq("tarih", selectedDate),
          supabase
            .from("etut_atamalari")
            .select("*", { count: "exact", head: true })
            .eq("ogretmen", currentTeacher)
            .gte("tarih", start)
            .lte("tarih", end),
          supabase
            .from("etut_atamalari")
            .select("*", { count: "exact", head: true })
            .eq("ogretmen", currentTeacher),
        ]);

        if (dayRes.error || weekRes.error || totalRes.error) {
          console.error("Özet paneli için Supabase hata:", {
            day: dayRes.error,
            week: weekRes.error,
            total: totalRes.error,
          });
          if (isMounted) {
            setSummaryError("Özet bilgileri alınırken hata oluştu.");
          }
        }

        if (!isMounted) return;

        setSummary({
          day: dayRes.count || 0,
          week: weekRes.count || 0,
          total: totalRes.count || 0,
        });
      } catch (e) {
        console.error("Özet paneli beklenmeyen hata:", e);
        if (isMounted) {
          setSummaryError("Özet bilgileri alınırken beklenmeyen hata oluştu.");
        }
      } finally {
        if (isMounted) setSummaryLoading(false);
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, currentTeacher, currentRole]);

  // Öğretmen: özet sayısına tıklayınca listeyi getir/aç
  const toggleTeacherSummaryList = async (kind) => {
    if (currentRole !== "teacher" || !currentTeacher) return;

    const willOpen = !teacherSummaryOpen[kind];

    setTeacherSummaryOpen((prev) => ({
      ...prev,
      [kind]: willOpen,
    }));

    if (!willOpen) return; // Kapatılıyorsa fetch gerekmez
    if (!supabase) return;

    setTeacherSummaryListLoading((prev) => ({ ...prev, [kind]: true }));
    setTeacherSummaryListError((prev) => ({ ...prev, [kind]: "" }));

    try {
      let query = supabase
        .from("etut_atamalari")
        .select("*")
        .eq("ogretmen", currentTeacher);

      if (kind === "day") {
        query = query.eq("tarih", selectedDate);
      } else if (kind === "week") {
        const { start, end } = computeWeekRange(selectedDate);
        query = query.gte("tarih", start).lte("tarih", end);
      } else if (kind === "total") {
        // Tüm zamanlar – ekstra tarih filtresi yok
      }

      const { data, error } = await query
        .order("tarih", { ascending: true })
        .order("saat", { ascending: true });

      if (error) throw error;

      setTeacherSummaryLists((prev) => ({
        ...prev,
        [kind]: data || [],
      }));
    } catch (e) {
      console.error("Öğretmen özet liste hata:", e);
      setTeacherSummaryListError((prev) => ({
        ...prev,
        [kind]: "Liste alınırken hata oluştu.",
      }));
    } finally {
      setTeacherSummaryListLoading((prev) => ({
        ...prev,
        [kind]: false,
      }));
    }
  };

  // Öğretmenin kendi öğrencileri: bugün + bu haftadaki ileri tarihli etütler
  useEffect(() => {
    let isMounted = true;

    async function fetchMySessions() {
      if (!supabase || currentRole !== "teacher" || !currentTeacher) {
        if (isMounted) {
          setMyTodaySessions([]);
          setMyFutureSessions([]);
          setMySessionsError("");
        }
        return;
      }

      try {
        setMySessionsLoading(true);
        setMySessionsError("");

        const { start, end } = computeWeekRange(selectedDate);

        const { data, error } = await supabase
          .from("etut_atamalari")
          .select("*")
          .eq("ogretmen", currentTeacher)
          .gte("tarih", start)
          .lte("tarih", end)
          .order("tarih", { ascending: true })
          .order("saat", { ascending: true });

        if (error) {
          console.error(
            "Öğretmen öğrenci listesi için Supabase hata:",
            error
          );
          if (isMounted) {
            setMySessionsError(
              "Atanan öğrenciler listesi alınırken hata oluştu."
            );
            setMyTodaySessions([]);
            setMyFutureSessions([]);
          }
          return;
        }

        if (!isMounted) return;

        const today = [];
        const future = [];

        (data || []).forEach((r) => {
          if (r.tarih === selectedDate) today.push(r);
          else if (r.tarih > selectedDate) future.push(r);
        });

        setMyTodaySessions(today);
        setMyFutureSessions(future);
      } catch (e) {
        console.error("Öğretmen öğrenci listesi beklenmeyen hata:", e);
        if (isMounted) {
          setMySessionsError(
            "Atanan öğrenciler listesi alınırken beklenmeyen bir hata oluştu."
          );
          setMyTodaySessions([]);
          setMyFutureSessions([]);
        }
      } finally {
        if (isMounted) setMySessionsLoading(false);
      }
    }

    fetchMySessions();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, currentTeacher, currentRole]);

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

  // Supabase senkronizasyonu: belli bir saat ve salon için kayıtları güncelle
  const syncHourRoom = async (hour, col, draft) => {
    const roomName = rooms[col];
    if (!roomName || !supabase) return;

    const teacher = draft[`${hour}-${col}-teacher`] || null;

    const students = [1, 2]
      .map((p) => {
        const no = (draft[`${hour}-${col}-${p}-no`] || "").trim();
        const name = (draft[`${hour}-${col}-${p}-name`] || "").trim();
        const cls = (draft[`${hour}-${col}-${p}-class`] || "").trim();
        if (!no && !name && !cls) return null;
        return { no, name, cls };
      })
      .filter(Boolean);

    try {
      setDbError("");
      // Önce bu saat + salon + tarih için tüm kayıtları sil
      const { error: delError } = await supabase
        .from("etut_atamalari")
        .delete()
        .eq("tarih", selectedDate)
        .eq("saat", hour)
        .eq("salon", roomName);

      if (delError) {
        console.error("Supabase delete error", delError);
        setDbError("Sunucuya kaydederken hata oluştu (silme).");
        return;
      }

      if (students.length === 0) {
        // Öğrenci yoksa sadece silmek yeterli
        return;
      }

      const payload = students.map((s) => ({
        tarih: selectedDate,
        saat: hour,
        salon: roomName,
        ogretmen: teacher,
        ogr_no: s.no,
        ogr_ad: s.name,
        sinif: s.cls,
      }));

      const { error: insError } = await supabase
        .from("etut_atamalari")
        .insert(payload);

      if (insError) {
        console.error("Supabase insert error", insError);
        setDbError("Sunucuya kaydederken hata oluştu (ekleme).");
      }
    } catch (e) {
      console.error("Supabase sync error", e);
      setDbError("Sunucuya kaydederken beklenmeyen bir hata oluştu.");
    }
  };

  const setCell = (key, value) => {
    const draft = { ...dayCells, [key]: value };
    updateDayCells(draft);

    // key -> "hour-col-..." yapısından hour ve col çıkar
    const parts = key.split("-");
    const hour = parseInt(parts[0], 10);
    const col = parseInt(parts[1], 10);
    if (!Number.isNaN(hour) && !Number.isNaN(col)) {
      syncHourRoom(hour, col, draft);
    }
  };

  const clearPart = (hour, col, part) => {
    const draft = { ...dayCells };
    draft[`${hour}-${col}-${part}-no`] = "";
    draft[`${hour}-${col}-${part}-name`] = "";
    draft[`${hour}-${col}-${part}-class`] = "";
    draft[`${hour}-${col}-${part}-class-auto`] = false;
    updateDayCells(draft);
    syncHourRoom(hour, col, draft);
  };

  const isCellAssignedToMe = (hour, col) =>
    (dayCells[`${hour}-${col}-teacher`] || "") === currentTeacher;

  const cellVisible = (hour, col) =>
    currentRole === "admin" || currentRole === "manager"
      ? true
      : isCellAssignedToMe(hour, col);

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
    syncHourRoom(hour, col, draft);
  };

  const onStudentNameChange = (hour, col, part, name) => {
    const draft = { ...dayCells, [`${hour}-${col}-${part}-name`]: name };
    const q = (name || "").trim().toLocaleUpperCase("tr-TR");
    if (q) {
      const entries = Object.entries(studentDb);
      let match = entries.find(
        ([_, v]) => (v.name || "").toLocaleUpperCase("tr-TR") === q
      );
      if (!match) {
        const starts = entries.filter(([_, v]) =>
          (v.name || "").toLocaleUpperCase("tr-TR").startsWith(q)
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
    syncHourRoom(hour, col, draft);
  };

  const unlockClass = (hour, col, part) => {
    const draft = { ...dayCells };
    draft[`${hour}-${col}-${part}-class-auto`] = false;
    updateDayCells(draft);
    syncHourRoom(hour, col, draft);
  };

  // Öğrenci arama modalı
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSlot, setSearchSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canEditThisCell = (hour, col) => {
    // SADECE YÖNETİCİ DÜZENLEYEBİLİR
    if (currentRole === "admin") return true;
    return false;
  };

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
    syncHourRoom(hour, col, draft);
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
          .map((v) => `"${(v ?? "").toString().replaceAll('"', '""')}"`)
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
                ? `${s1no ? s1no + " - " : ""}${s1}${s1c ? ` (${s1c})` : ""}`
                : null,
              s2 || s2no
                ? `${s2no ? s2no + " - " : ""}${s2}${s2c ? ` (${s2c})` : ""}`
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
        .map(([t, c]) => `<tr><td>${t}</td><td>${c}</td></tr>`)
        .join("") || '<tr><td colspan="2">Kayıt yok</td></tr>';
    const studentRows =
      Array.from(studentCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([s, c]) => `<tr><td>${s}</td><td>${c}</td></tr>`)
        .join("") || '<tr><td colspan="2">Kayıt yok</td></tr>';
    const detailRows =
      entries
        .sort((a, b) => a.hour - b.hour || a.room.localeCompare(b.room))
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
      <div class="small">Oluşturma: ${new Date().toLocaleString("tr-TR")}</div>
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

  // Seçili tarihteki kayıtları Supabase'ten yükle
  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setDbError("");
        const { data, error } = await supabase
          .from("etut_atamalari")
          .select("*")
          .eq("tarih", selectedDate);

        if (error) {
          console.error("Supabase select error", error);
          if (isMounted) {
            setDbError("Sunucudan veriler alınırken hata oluştu.");
          }
          return;
        }

        if (!isMounted) return;

        const grouped = {};
        (data || []).forEach((row) => {
          const key = `${row.saat}||${row.salon}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(row);
        });

        const draft = {};
        hours.forEach((h) => {
          rooms.forEach((roomName, col) => {
            const key = `${h}||${roomName}`;
            const list = grouped[key] || [];
            if (list.length > 0) {
              const first = list[0];
              if (first.ogretmen) {
                draft[`${h}-${col}-teacher`] = first.ogretmen;
              }
              list.slice(0, 2).forEach((row, idx) => {
                const part = idx + 1;
                draft[`${h}-${col}-${part}-no`] = row.ogr_no || "";
                draft[`${h}-${col}-${part}-name`] = row.ogr_ad || "";
                draft[`${h}-${col}-${part}-class`] = row.sinif || "";
                draft[`${h}-${col}-${part}-class-auto`] = !!row.sinif;
              });
            }
          });
        });

        setCellsByDate((prev) => ({ ...prev, [selectedDate]: draft }));
        checkConflicts(draft);
      } catch (e) {
        console.error("Supabase fetch error", e);
        if (isMounted) {
          setDbError("Veriler yüklenirken beklenmeyen bir hata oluştu.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, rooms.length]);

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
            {loading && (
              <span className="ml-2 text-[11px] text-gray-500">
                Yükleniyor…
              </span>
            )}
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

          {/* Yönetici aksiyonları */}
          {currentRole === "admin" && (
            <button
              onClick={() =>
                setRooms((r) => [...r, `ETÜT ${r.length + 1}`])
              }
              className="rounded-xl border border-gray-300 px-3 py-1 text-xs transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Salon Ekle
            </button>
          )}

          {(currentRole === "admin" || currentRole === "manager") && (
            <>
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

      {/* ÖĞRETMEN PANELİ: Şifre değiştir + Atanan öğrenciler + Etüt özeti */}
      {currentRole === "teacher" && (
        <div className="mx-3 mt-3 space-y-3 text-xs">
          {/* Şifremi değiştir (küçük açılır panel) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900/60">
            <button
              type="button"
              onClick={() => setPwdPanelOpen((p) => !p)}
              className="flex w-full items-center justify-between gap-2 text-[11px] font-semibold"
            >
              <span>🔐 Şifremi Değiştir</span>
              <span className="text-[10px] text-gray-500">
                {pwdPanelOpen ? "Kapat ▲" : "Aç ▼"}
              </span>
            </button>

            {pwdPanelOpen && (
              <form
                onSubmit={handlePasswordChange}
                className="mt-2 grid gap-2 md:grid-cols-3"
              >
                <input
                  type="password"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  placeholder="Mevcut şifre"
                  className="h-8 rounded-lg border border-gray-300 px-2 text-[11px] outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                />
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Yeni şifre"
                  className="h-8 rounded-lg border border-gray-300 px-2 text-[11px] outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                />
                <div className="flex gap-1">
                  <input
                    type="password"
                    value={newPwd2}
                    onChange={(e) => setNewPwd2(e.target.value)}
                    placeholder="Yeni şifre (tekrar)"
                    className="h-8 flex-1 rounded-lg border border-gray-300 px-2 text-[11px] outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={pwdChanging}
                    className="h-8 shrink-0 rounded-lg bg-gray-900 px-3 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-gray-900"
                  >
                    Kaydet
                  </button>
                </div>

                {(pwdError || pwdSuccess) && (
                  <div className="md:col-span-3 text-[11px]">
                    {pwdError && (
                      <div className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                        {pwdError}
                      </div>
                    )}
                    {pwdSuccess && (
                      <div className="mt-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200">
                        {pwdSuccess}
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Atanan öğrenciler kartı */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="mb-2 flex items-center justify_between">
              <span className="font-semibold">
                Bugün ve Bu Hafta Atanan Öğrenciler
              </span>
              {mySessionsLoading && (
                <span className="text-[11px] text-gray-500">
                  Güncelleniyor…
                </span>
              )}
            </div>

            {mySessionsError && (
              <div className="mb-2 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                {mySessionsError}
              </div>
            )}

            {!mySessionsLoading &&
              !mySessionsError &&
              myTodaySessions.length === 0 &&
              myFutureSessions.length === 0 && (
                <div className="text-[11px] text-gray-500">
                  Seçili hafta için size atanmış etüt bulunmuyor.
                </div>
              )}

            {(myTodaySessions.length > 0 || myFutureSessions.length > 0) && (
              <div className="grid gap-3 md:grid-cols-2">
                {/* Bugünkü etütler */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2 shadow-sm dark:border-blue-900 dark:bg-blue-900/20">
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-200">
                    <span className="text-base">📅</span>
                    <span>Bugünkü Etütler ({selectedDate})</span>
                  </div>
                  <div className="space-y-1">
                    {myTodaySessions.map((s, idx) => (
                      <div
                        key={`today-${s.ogr_no || idx}-${s.saat}-${s.salon}`}
                        className="rounded-lg border border-blue-300 bg-blue-100 px-2 py-1 text-[11px] shadow-sm dark:border-blue-800 dark:bg-blue-900/40"
                      >
                        <div className="flex items-center gap-1 font-semibold">
                          <span>👤</span>
                          <span>{s.ogr_ad || "İsimsiz Öğrenci"}</span>
                          <span className="text-[10px] text-blue-700 dark:text-blue-300">
                            • #{s.ogr_no || "-"}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-blue-700 dark:text-blue-300">
                          <span>🏫 {s.sinif || "-"}</span>
                          <span>⏰ {s.saat}. ders</span>
                          <span>🏛️ Salon {s.salon || "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* İleri tarihli etütler */}
                <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-2 shadow-sm dark:border-purple-900/60 dark:bg-purple-900/20">
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-200">
                    <span className="text-base">⏭️</span>
                    <span>İleri Tarihli Etütler (Bu Hafta)</span>
                  </div>
                  <div className="space-y-1">
                    {myFutureSessions.map((s, idx) => (
                      <div
                        key={`future-${s.ogr_no || idx}-${s.tarih}-${s.saat}-${s.salon}`}
                        className="rounded-lg border border-purple-300 bg-purple-100 px-2 py-1 text-[11px] shadow-sm dark:border-purple-800 dark:bg-purple-900/40"
                      >
                        <div className="flex items-center gap-1 font-semibold">
                          <span>👤</span>
                          <span>{s.ogr_ad || "İsimsiz Öğrenci"}</span>
                          <span className="text-[10px] text-purple-700 dark:text-purple-300">
                            • #{s.ogr_no || "-"}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-purple-700 dark:text-purple-300">
                          <span>📅 {s.tarih}</span>
                          <span>🏫 {s.sinif || "-"}</span>
                          <span>⏰ {s.saat}. ders</span>
                          <span>🏛️ Salon {s.salon || "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Etüt özeti kartı (gün/hafta/toplam + tıklanabilir listeler) */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">
                Etüt Özeti – {selectedDate}
              </span>
              {summaryLoading && (
                <span className="text-[11px] text-gray-500">
                  Güncelleniyor…
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => toggleTeacherSummaryList("day")}
                className="rounded-xl bg-white p-2 text-center shadow-sm transition hover:bg-gray-50 dark:bg-gray-900/80 dark:hover:bg-gray-900"
              >
                <div className="text-[11px] text-gray-500">Bugün</div>
                <div className="text-lg font-bold">{summary.day}</div>
                <div className="text-[10px] text-gray-400">
                  Seçili tarihteki toplam etüt
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleTeacherSummaryList("week")}
                className="rounded-xl bg-white p-2 text-center shadow-sm transition hover:bg-gray-50 dark:bg-gray-900/80 dark:hover:bg-gray-900"
              >
                <div className="text-[11px] text-gray-500">Bu Hafta</div>
                <div className="text-lg font-bold">{summary.week}</div>
                <div className="text-[10px] text-gray-400">
                  Pazartesi–Pazar arası
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleTeacherSummaryList("total")}
                className="rounded-xl bg-white p-2 text-center shadow-sm transition hover:bg-gray-50 dark:bg-gray-900/80 dark:hover:bg-gray-900"
              >
                <div className="text-[11px] text-gray-500">Toplam</div>
                <div className="text-lg font-bold">{summary.total}</div>
                <div className="text-[10px] text-gray-400">
                  Tüm zamanlardaki etüt
                </div>
              </button>
            </div>

            {summaryError && (
              <div className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                {summaryError}
              </div>
            )}

            {/* Tıklanan özet için detay listeleri */}
            {["day", "week", "total"].map(
              (kind) =>
                teacherSummaryOpen[kind] && (
                  <div
                    key={kind}
                    className="mt-3 rounded-xl border border-gray-200 bg-white p-2 text-[11px] dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">
                        {kind === "day"
                          ? "Bugünkü etüt listesi"
                          : kind === "week"
                          ? "Bu haftaki etütler"
                          : "Tüm etütler"}
                      </span>
                      {teacherSummaryListLoading[kind] && (
                        <span className="text-[10px] text-gray-500">
                          Yükleniyor…
                        </span>
                      )}
                    </div>

                    {teacherSummaryListError[kind] && (
                      <div className="mb-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                        {teacherSummaryListError[kind]}
                      </div>
                    )}

                    {teacherSummaryLists[kind].length === 0 &&
                    !teacherSummaryListLoading[kind] &&
                    !teacherSummaryListError[kind] ? (
                      <div className="text-[10px] text-gray-500">
                        Kayıt bulunamadı.
                      </div>
                    ) : null}

                    {teacherSummaryLists[kind].length > 0 && (
                      <div className="max-h-40 overflow-auto rounded-lg border border-gray-100 dark:border-gray-800">
                        <table className="w-full text-[10px]">
                          <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-900/70">
                            <tr>
                              <th className="px-2 py-1 text-left">Tarih</th>
                              <th className="px-2 py-1 text-left">Saat</th>
                              <th className="px-2 py-1 text-left">Öğrenci</th>
                              <th className="px-2 py-1 text-left">Sınıf</th>
                              <th className="px-2 py-1 text-left">Salon</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teacherSummaryLists[kind].map((r, idx) => (
                              <tr
                                key={`${kind}-${idx}`}
                                className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                              >
                                <td className="px-2 py-1">{r.tarih}</td>
                                <td className="px-2 py-1">{r.saat}. saat</td>
                                <td className="px-2 py-1">
                                  {r.ogr_no} – {r.ogr_ad}
                                </td>
                                <td className="px-2 py-1">{r.sinif}</td>
                                <td className="px-2 py-1">{r.salon}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
            )}
          </div>
        </div>
      )}

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

      {dbError && (
        <div className="mx-3 my-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
          {dbError}
        </div>
      )}

      {/* Tablo – SADECE ADMIN */}
      {currentRole === "admin" && (
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
                          currentRole === "admin"
                            ? setRooms((r) =>
                                r.map((x, i) =>
                                  i === idx ? e.target.value : x
                                )
                              )
                            : null
                        }
                        readOnly={currentRole !== "admin"}
                        className={`h-8 w-full rounded-lg border px-2 text-xs outline-none transition focus:ring-2 dark:border-gray-700 dark:bg-gray-900 ${
                          currentRole === "admin"
                            ? "border-gray-300 focus:ring-gray-900/20"
                            : "cursor-not-allowed border-gray-300 bg-gray-50 text-gray-500"
                        }`}
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
                            ? "rounded-lg bg-green-50 dark:bg-green-900/10"
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
                                value={dayCells[`${h}-${c}-teacher`] || ""}
                                onChange={(e) =>
                                  setCell(`${h}-${c}-teacher`, e.target.value)
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
                                value={dayCells[`${h}-${c}-teacher`] || ""}
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
                                  placeholder="No"
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
                                  const no = dayCells[`${h}-${c}-${p}-no`];
                                  const missing =
                                    no &&
                                    !studentDb[
                                      no?.toString()?.trim?.()
                                    ];
                                  return missing &&
                                    currentRole === "admin" ? (
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
                                    dayCells[`${h}-${c}-${p}-name`] || ""
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
                                    dayCells[`${h}-${c}-${p}-class`] || ""
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
      )}

      {/* Öğrenci Arama Modalı (sadece admin fiilen açabilir) */}
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
        Not: Atamalar <strong>tarih bazlı</strong> Supabase üzerinde
        saklanmaktadır. Öğretmen farklı bir bilgisayardan giriş yapsa bile
        aynı tarihteki atamaları görebilir.
      </div>

      {/* Admin / Manager için: ÖZET + RAPORLAR */}
      {(currentRole === "admin" || currentRole === "manager") && (
        <AdminGlobalSummarySection selectedDate={selectedDate} />
      )}

      {(currentRole === "admin" || currentRole === "manager") && (
        <AdminReportsSection selectedDate={selectedDate} teachers={teachers} />
      )}
    </div>
  );
}
// ——— Admin / Manager: Genel Özet (Gün / Hafta / Toplam) ———
function AdminGlobalSummarySection({ selectedDate }) {
  const [counts, setCounts] = useState({ day: 0, week: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [open, setOpen] = useState({
    day: false,
    week: false,
    total: false,
  });

  const [lists, setLists] = useState({
    day: [],
    week: [],
    total: [],
  });

  const [listLoading, setListLoading] = useState({
    day: false,
    week: false,
    total: false,
  });

  const [listError, setListError] = useState({
    day: "",
    week: "",
    total: "",
  });

  const computeWeekRange = (dateStr) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
      const today = new Date();
      return {
        start: localYMDUtil(today),
        end: localYMDUtil(today),
      };
    }
    const day = d.getDay(); // 0: Pazar, 1: Pazartesi, ...
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: localYMDUtil(monday),
      end: localYMDUtil(sunday),
    };
  };

  // Genel sayıları çek (gün / hafta / toplam)
  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;

    async function fetchCounts() {
      try {
        setLoading(true);
        setError("");

        const { start, end } = computeWeekRange(selectedDate);

        const [dayRes, weekRes, totalRes] = await Promise.all([
          supabase
            .from("etut_atamalari")
            .select("*", { count: "exact", head: true })
            .eq("tarih", selectedDate),
          supabase
            .from("etut_atamalari")
            .select("*", { count: "exact", head: true })
            .gte("tarih", start)
            .lte("tarih", end),
          supabase
            .from("etut_atamalari")
            .select("*", { count: "exact", head: true }),
        ]);

        if (dayRes.error || weekRes.error || totalRes.error) {
          console.error("AdminGlobalSummary counts error:", {
            day: dayRes.error,
            week: weekRes.error,
            total: totalRes.error,
          });
          if (isMounted) {
            setError("Genel özet bilgileri alınırken hata oluştu.");
          }
        }

        if (!isMounted) return;

        setCounts({
          day: dayRes.count || 0,
          week: weekRes.count || 0,
          total: totalRes.count || 0,
        });
      } catch (e) {
        console.error("AdminGlobalSummary counts unexpected error:", e);
        if (isMounted) {
          setError("Genel özet bilgileri alınırken beklenmeyen hata oluştu.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCounts();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Karttaki sayıya tıklayınca listeyi aç / kapat + veriyi çek
  const toggleList = async (kind) => {
    if (!supabase) return;

    const willOpen = !open[kind];

    setOpen((prev) => ({
      ...prev,
      [kind]: willOpen,
    }));

    if (!willOpen) return; // kapatılıyorsa fetch yok

    setListLoading((prev) => ({ ...prev, [kind]: true }));
    setListError((prev) => ({ ...prev, [kind]: "" }));

    try {
      let query = supabase.from("etut_atamalari").select("*");

      if (kind === "day") {
        query = query.eq("tarih", selectedDate);
      } else if (kind === "week") {
        const { start, end } = computeWeekRange(selectedDate);
        query = query.gte("tarih", start).lte("tarih", end);
      } else if (kind === "total") {
        // tüm kayıtlar – ekstra filtre yok
      }

      const { data, error } = await query
        .order("tarih", { ascending: true })
        .order("saat", { ascending: true })
        .order("ogretmen", { ascending: true });

      if (error) throw error;

      setLists((prev) => ({
        ...prev,
        [kind]: data || [],
      }));
    } catch (e) {
      console.error("AdminGlobalSummary list error:", e);
      setListError((prev) => ({
        ...prev,
        [kind]: "Detay listesi alınırken hata oluştu.",
      }));
    } finally {
      setListLoading((prev) => ({
        ...prev,
        [kind]: false,
      }));
    }
  };

  return (
    <div className="mx-3 mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs shadow-sm dark:border-indigo-900/50 dark:bg-indigo-900/20">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-100">
            Genel Etüt Özeti (Tüm Öğretmenler)
          </div>
          <div className="text-[10px] text-indigo-800/80 dark:text-indigo-200/80">
            Seçili tarih: <strong>{selectedDate}</strong>
          </div>
        </div>
        {loading && (
          <div className="text-[11px] text-indigo-900/70 dark:text-indigo-200">
            Güncelleniyor…
          </div>
        )}
      </div>

      {/* Kartlar: Gün / Hafta / Toplam */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => toggleList("day")}
          className="rounded-xl bg-white/90 p-2 text-left shadow-sm transition hover:bg-white dark:bg-gray-950/80"
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-500">Bugün</div>
            <div className="text-[10px] text-indigo-500">
              {open.day ? "Listeyi gizle ▲" : "Listeyi göster ▼"}
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-700 dark:text-indigo-200">
            {counts.day}
          </div>
          <div className="text-[10px] text-gray-400">
            {selectedDate} tarihindeki toplam etüt
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleList("week")}
          className="rounded-xl bg-white/90 p-2 text-left shadow-sm transition hover:bg-white dark:bg-gray-950/80"
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-500">Bu Hafta</div>
            <div className="text-[10px] text-indigo-500">
              {open.week ? "Listeyi gizle ▲" : "Listeyi göster ▼"}
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-700 dark:text-indigo-200">
            {counts.week}
          </div>
          <div className="text-[10px] text-gray-400">
            Pazartesi–Pazar arası tüm etütler
          </div>
        </button>

        <button
          type="button"
          onClick={() => toggleList("total")}
          className="rounded-xl bg-white/90 p-2 text-left shadow-sm transition hover:bg-white dark:bg-gray-950/80"
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-500">Toplam</div>
            <div className="text-[10px] text-indigo-500">
              {open.total ? "Listeyi gizle ▲" : "Listeyi göster ▼"}
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-700 dark:text-indigo-200">
            {counts.total}
          </div>
          <div className="text-[10px] text-gray-400">
            Tüm zamanlarda kaydedilen etütler
          </div>
        </button>
      </div>

      {error && (
        <div className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Detay tablolar (tıklanan karta göre) */}
      {["day", "week", "total"].map(
        (kind) =>
          open[kind] && (
            <div
              key={kind}
              className="mt-3 rounded-xl border border-indigo-100 bg-white/90 p-2 text-[11px] shadow-sm dark:border-indigo-900/60 dark:bg-gray-950/80"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                  {kind === "day"
                    ? "Bugünkü Etüt Listesi"
                    : kind === "week"
                    ? "Bu Haftaki Etütler"
                    : "Tüm Etütler"}
                </span>
                {listLoading[kind] && (
                  <span className="text-[10px] text-gray-500">
                    Yükleniyor…
                  </span>
                )}
              </div>

              {listError[kind] && (
                <div className="mb-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                  {listError[kind]}
                </div>
              )}

              {lists[kind].length === 0 &&
              !listLoading[kind] &&
              !listError[kind] ? (
                <div className="text-[10px] text-gray-500">
                  Kayıt bulunamadı.
                </div>
              ) : null}

              {lists[kind].length > 0 && (
                <div className="max-h-56 overflow-auto rounded-lg border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-[10px]">
                    <thead className="bg-indigo-50 text-[10px] uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200">
                      <tr>
                        <th className="px-2 py-1 text-left">Tarih</th>
                        <th className="px-2 py-1 text-left">Saat</th>
                        <th className="px-2 py-1 text-left">Öğretmen</th>
                        <th className="px-2 py-1 text-left">Öğrenci</th>
                        <th className="px-2 py-1 text-left">Sınıf</th>
                        <th className="px-2 py-1 text-left">Salon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lists[kind].map((r, idx) => (
                        <tr
                          key={`${kind}-${idx}`}
                          className="border-t border-gray-100 hover:bg-indigo-50/60 dark:border-gray-800 dark:hover:bg-gray-900/70"
                        >
                          <td className="px-2 py-1">{r.tarih}</td>
                          <td className="px-2 py-1">{r.saat}. saat</td>
                          <td className="px-2 py-1">{r.ogretmen}</td>
                          <td className="px-2 py-1">
                            {r.ogr_no} – {r.ogr_ad}
                          </td>
                          <td className="px-2 py-1">{r.sinif}</td>
                          <td className="px-2 py-1">{r.salon}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
      )}
    </div>
  );
}
// ——— Rehber Öğretmen RAPORLAR BÖLÜMÜ ———
function AdminReportsSection({ selectedDate, teachers }) {
  const [studentQuery, setStudentQuery] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [studentRecords, setStudentRecords] = useState([]);
  const [studentSummary, setStudentSummary] = useState({});

  const [topStudents, setTopStudents] = useState([]);
  const [topStudentsLoading, setTopStudentsLoading] = useState(false);
  const [topStudentsError, setTopStudentsError] = useState("");

  const [teacherForList, setTeacherForList] = useState("");
  const [teacherRecords, setTeacherRecords] = useState([]);
  const [teacherSearchLoading, setTeacherSearchLoading] = useState(false);
  const [teacherSearchError, setTeacherSearchError] = useState("");

  const [teacherTotals, setTeacherTotals] = useState([]);
  const [teacherTotalsLoading, setTeacherTotalsLoading] = useState(false);
  const [teacherTotalsError, setTeacherTotalsError] = useState("");

  // Özet kutuları: bugün ve toplam etüt sayısı
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Branşa göre ders kategorisi
  const categoryFromBranch = (branchRaw) => {
    const b = (branchRaw || "").toLocaleUpperCase("tr-TR");
    if (b.includes("MATEM")) return "Matematik";
    if (b.includes("FİZ") || b.includes("FIZ")) return "Fizik";
    if (b.includes("KİMYA") || b.includes("KIMYA")) return "Kimya";
    if (b.includes("BİYO") || b.includes("BIYO")) return "Biyoloji";
    if (b.includes("EDEB") || b.includes("TÜRK DİL") || b.includes("TURK DIL"))
      return "Türk Dili ve Edebiyatı";
    return "Diğer";
  };

  const teacherBranchMap = React.useMemo(() => {
    const map = new Map();
    (teachers || []).forEach((t) => {
      if (t?.name) map.set(t.name, t.branch || "");
    });
    return map;
  }, [teachers]);

  // Ortak PDF açma yardımcı fonksiyonu
  const openPdfWindow = (title, innerHtml) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const style = `
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        h2 { font-size: 16px; margin: 16px 0 8px; }
        p { font-size: 12px; margin: 4px 0; color: #4b5563; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .small { font-size: 11px; color: #6b7280; }
      </style>
    `;
    win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
${style}
</head>
<body>
${innerHtml}
<script>window.print();</script>
</body>
</html>`);
    win.document.close();
  };

  // PDF 1: Öğrenciye göre etüt dağılımı
  const exportStudentDetailPdf = () => {
    if (!studentRecords.length || !studentQuery) return;
    const stu = studentRecords[0];
    const headerName = (stu.ogr_ad || "").trim() || "(Ad bilgisi yok)";
    const headerNo = (stu.ogr_no || "").toString().trim();
    const headerClass = (stu.sinif || "").trim();

    const summaryRows = [
      "Matematik",
      "Fizik",
      "Kimya",
      "Biyoloji",
      "Türk Dili ve Edebiyatı",
      "Diğer",
    ]
      .filter((cat) => studentSummary[cat])
      .map(
        (cat) =>
          `<tr><td>${cat}</td><td>${studentSummary[cat] || 0}</td></tr>`
      )
      .join("") || '<tr><td colspan="2">Kategori bulunamadı</td></tr>';

    const detailRows =
      studentRecords
        .map(
          (r) =>
            `<tr>
              <td>${r.tarih}</td>
              <td>${r.saat}. saat</td>
              <td>${r.salon}</td>
              <td>${r.ogretmen || ""}</td>
            </tr>`
        )
        .join("") || '<tr><td colspan="4">Kayıt bulunamadı</td></tr>';

    const html = `
      <h1>Öğrenci Etüt Raporu</h1>
      <p class="small">Rapor tarihi: ${new Date().toLocaleString(
        "tr-TR"
      )}</p>
      <p><strong>Filtre:</strong> ${selectedDate} tarihine kadar olan tüm etütler</p>
      <p><strong>Öğrenci:</strong> ${
        headerNo ? headerNo + " - " : ""
      }${headerName}${headerClass ? " (" + headerClass + ")" : ""}</p>

      <h2>Ders Kategorilerine Göre Etüt Sayıları</h2>
      <table>
        <thead><tr><th>Ders</th><th>Etüt Sayısı</th></tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>

      <h2>Tarih Bazlı Etüt Listesi</h2>
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Saat</th>
            <th>Salon</th>
            <th>Öğretmen</th>
          </tr>
        </thead>
        <tbody>${detailRows}</tbody>
      </table>
    `;
    openPdfWindow("Öğrenci Etüt Raporu", html);
  };

  // PDF 2: En çok etüt alan öğrenciler
  const exportTopStudentsPdf = () => {
    if (!topStudents.length) return;
    const rows =
      topStudents
        .map(
          (s, idx) =>
            `<tr>
              <td>${idx + 1}</td>
              <td>${s.ogr_no || ""}</td>
              <td>${s.ogr_ad || ""}</td>
              <td>${s.sinif || ""}</td>
              <td>${s.count || 0}</td>
            </tr>`
        )
        .join("") || '<tr><td colspan="5">Kayıt bulunamadı</td></tr>';

    const html = `
      <h1>En Çok Etüt Alan Öğrenciler</h1>
      <p class="small">Rapor tarihi: ${new Date().toLocaleString(
        "tr-TR"
      )}</p>
      <p><strong>Filtre:</strong> ${selectedDate} tarihine kadar olan tüm etütler</p>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Öğrenci No</th>
            <th>Ad Soyad</th>
            <th>Sınıf</th>
            <th>Etüt Sayısı</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    openPdfWindow("Öğrenci Toplu Etüt Raporu", html);
  };

  // PDF 3: Öğretmene göre detay listesi
  const exportTeacherDetailPdf = () => {
    if (!teacherRecords.length || !teacherForList) return;

    const rows =
      teacherRecords
        .map(
          (r) =>
            `<tr>
              <td>${r.tarih}</td>
              <td>${r.saat}. saat</td>
              <td>${r.ogr_no || ""}</td>
              <td>${r.ogr_ad || ""}</td>
              <td>${r.sinif || ""}</td>
            </tr>`
        )
        .join("") || '<tr><td colspan="5">Kayıt bulunamadı</td></tr>';

    const html = `
      <h1>Öğretmen Etüt Raporu</h1>
      <p class="small">Rapor tarihi: ${new Date().toLocaleString(
        "tr-TR"
      )}</p>
      <p><strong>Filtre:</strong> ${selectedDate} tarihine kadar olan tüm etütler</p>
      <p><strong>Öğretmen:</strong> ${teacherForList}</p>

      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Saat</th>
            <th>Öğrenci No</th>
            <th>Öğrenci Adı</th>
            <th>Sınıf</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    openPdfWindow("Öğretmen Detay Etüt Raporu", html);
  };

  // PDF 4: Öğretmenlerin toplam etüt sayıları
  const exportTeacherTotalsPdf = () => {
    if (!teacherTotals.length) return;

    const rows =
      teacherTotals
        .map(
          (t, idx) =>
            `<tr>
              <td>${idx + 1}</td>
              <td>${t.ogretmen || "(Öğretmen adı yok)"}</td>
              <td>${t.count || 0}</td>
            </tr>`
        )
        .join("") || '<tr><td colspan="3">Kayıt bulunamadı</td></tr>';

    const html = `
      <h1>Öğretmen Toplam Etüt Raporu</h1>
      <p class="small">Rapor tarihi: ${new Date().toLocaleString(
        "tr-TR"
      )}</p>
      <p><strong>Filtre:</strong> ${selectedDate} tarihine kadar olan tüm etütler</p>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Öğretmen</th>
            <th>Toplam Etüt Sayısı</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    openPdfWindow("Öğretmen Toplam Etüt Raporu", html);
  };

  // Toplu veriler: öğrenci listesi & öğretmen toplamları + özet rakamlar
  useEffect(() => {
    let mounted = true;

    async function loadAggregatedData() {
      if (!supabase) return;
      try {
        setTopStudentsLoading(true);
        setTeacherTotalsLoading(true);
        setTopStudentsError("");
        setTeacherTotalsError("");

        const { data, error } = await supabase
          .from("etut_atamalari")
          .select("*")
          .lte("tarih", selectedDate);

        if (error) {
          console.error("Toplu raporlar select hata:", error);
          if (mounted) {
            setTopStudentsError(
              "Öğrenci listesi alınırken beklenmeyen hata oluştu."
            );
            setTeacherTotalsError(
              "Öğretmen toplam etüt listesi alınırken beklenmeyen hata oluştu."
            );
          }
          return;
        }

        if (!mounted) return;

        const rows = data || [];

        // Özet rakamlar
        const allCount = rows.length;
        const today = selectedDate;
        const todayOnlyCount = rows.filter((r) => r.tarih === today).length;

        setTotalCount(allCount);
        setTodayCount(todayOnlyCount);

        // Öğrenci bazlı toplama
        const stuMap = new Map();
        rows.forEach((r) => {
          const key =
            (r.ogr_no && r.ogr_no.toString().trim()) ||
            (r.ogr_ad && r.ogr_ad.trim()) ||
            "NO-ID";
          const prev = stuMap.get(key) || {
            ogr_no: r.ogr_no || "",
            ogr_ad: r.ogr_ad || "",
            sinif: r.sinif || "",
            count: 0,
          };
          prev.count += 1;
          prev.ogr_no = r.ogr_no || prev.ogr_no;
          prev.ogr_ad = r.ogr_ad || prev.ogr_ad;
          prev.sinif = r.sinif || prev.sinif;
          stuMap.set(key, prev);
        });

        const stuArr = Array.from(stuMap.values()).sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return (a.ogr_ad || "").localeCompare(b.ogr_ad || "", "tr");
        });

        // Öğretmen bazlı toplama
        const teacherMap = new Map();
        rows.forEach((r) => {
          const key = r.ogretmen || "(Öğretmen adı yok)";
          const prev = teacherMap.get(key) || { ogretmen: key, count: 0 };
          prev.count += 1;
          teacherMap.set(key, prev);
        });

        const teacherArr = Array.from(teacherMap.values()).sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return (a.ogretmen || "").localeCompare(b.ogretmen || "", "tr");
        });

        setTopStudents(stuArr);
        setTeacherTotals(teacherArr);
      } catch (e) {
        console.error("Toplu raporlar beklenmeyen hata:", e);
        if (mounted) {
          setTopStudentsError(
            "Öğrenci listesi alınırken beklenmeyen hata oluştu."
          );
          setTeacherTotalsError(
            "Öğretmen toplam etüt listesi alınırken beklenmeyen hata oluştu."
          );
        }
      } finally {
        if (mounted) {
          setTopStudentsLoading(false);
          setTeacherTotalsLoading(false);
        }
      }
    }

    loadAggregatedData();
    return () => {
      mounted = false;
    };
  }, [selectedDate, teachers]);

  // 1. Öğrenci arama
  const handleStudentSearch = async () => {
    const q = studentQuery.trim();
    if (!q) {
      setStudentError("Lütfen öğrenci no veya ad girin.");
      setStudentRecords([]);
      setStudentSummary({});
      return;
    }
    if (!supabase) return;

    try {
      setStudentLoading(true);
      setStudentError("");
      setStudentRecords([]);
      setStudentSummary({});

      const isNumeric = /^[0-9]+$/.test(q);
      let query = supabase
        .from("etut_atamalari")
        .select("*")
        .lte("tarih", selectedDate);

      if (isNumeric) {
        query = query.eq("ogr_no", q);
      } else {
        query = query.ilike("ogr_ad", `%${q}%`);
      }

      const { data, error } = await query.order("tarih", {
        ascending: true,
      });

      if (error) {
        console.error("Öğrenci arama hata:", error);
        setStudentError("Öğrenci kayıtları alınırken hata oluştu.");
        return;
      }

      const rows = data || [];
      setStudentRecords(rows);

      const summary = {};
      rows.forEach((r) => {
        const branch = teacherBranchMap.get(r.ogretmen) || "";
        const cat = categoryFromBranch(branch);
        summary[cat] = (summary[cat] || 0) + 1;
      });
      setStudentSummary(summary);
    } catch (e) {
      console.error("Öğrenci arama beklenmeyen hata:", e);
      setStudentError("Öğrenci kayıtları alınırken beklenmeyen hata oluştu.");
    } finally {
      setStudentLoading(false);
    }
  };

  // 2. Öğretmen arama
  const handleTeacherSearch = async () => {
    const teacherName = teacherForList.trim();
    if (!teacherName) {
      setTeacherSearchError("Lütfen bir öğretmen seçin.");
      setTeacherRecords([]);
      return;
    }
    if (!supabase) return;
    try {
      setTeacherSearchLoading(true);
      setTeacherSearchError("");
      setTeacherRecords([]);

      const { data, error } = await supabase
        .from("etut_atamalari")
        .select("*")
        .eq("ogretmen", teacherName)
        .lte("tarih", selectedDate)
        .order("tarih", { ascending: true })
        .order("ogr_ad", { ascending: true });

      if (error) {
        console.error("Öğretmen arama hata:", error);
        setTeacherSearchError("Öğretmen kayıtları alınırken hata oluştu.");
        return;
      }
      setTeacherRecords(data || []);
    } catch (e) {
      console.error("Öğretmen arama beklenmeyen hata:", e);
      setTeacherSearchError(
        "Öğretmen kayıtları alınırken beklenmeyen hata oluştu."
      );
    } finally {
      setTeacherSearchLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-2 text-sm font-semibold">Raporlar (Rehber Öğretmen)</h3>
      <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">
        Tarih filtresi: <strong>{selectedDate}</strong> tarihine kadar olan
        tüm etütler raporlara dahildir.
      </p>

      {/* Özet kutuları: Bugün ve toplam etüt sayısı */}
      <div className="mb-3 grid gap-2 text-xs md:grid-cols-2">
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-purple-900/40 dark:bg-purple-900/20">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            Bugün yapılan etüt sayısı
          </div>
          <div className="text-lg font-semibold">{todayCount}</div>
          <div className="text-[10px] text-gray-400">
            Tarih: <strong>{selectedDate}</strong>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-cyan-900/40 dark:bg-cyan-900/20">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            Toplam etüt sayısı
          </div>
          <div className="text-lg font-semibold">{totalCount}</div>
          <div className="text-[10px] text-gray-400">
            Başlangıçtan <strong>{selectedDate}</strong> tarihine kadar
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ÖĞРENCI RAPORLARI */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3 shadow-sm backdrop-blur-sm dark:border-blue-900/40 dark:bg-blue-900/20">
          <h4 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Öğrenci Raporları</span>
          </h4>

          {/* 1. Öğrenci ara */}
          <div className="mb-3 rounded-xl bg-white p-2 shadow-sm dark:bg-gray-900">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold">
                1) Öğrenciye göre etüt dağılımı
              </span>
              {studentRecords.length > 0 && (
                <button
                  type="button"
                  onClick={exportStudentDetailPdf}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-[10px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  PDF’e Aktar
                </button>
              )}
            </div>
            <div className="mb-2 flex gap-1">
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Öğrenci no veya adı"
                className="h-8 flex-1 rounded-lg border border-gray-300 px-2 text-xs outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                type="button"
                onClick={handleStudentSearch}
                className="h-8 rounded-lg bg-gray-900 px-3 text-[11px] font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-gray-900"
              >
                Ara
              </button>
            </div>
            {studentLoading && (
              <div className="text-[11px] text-gray-500">Yükleniyor…</div>
            )}
            {studentError && (
              <div className="mt-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                {studentError}
              </div>
            )}

            {/* Kategorik özet */}
            {Object.keys(studentSummary).length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                {[
                  "Matematik",
                  "Fizik",
                  "Kimya",
                  "Biyoloji",
                  "Türk Dili ve Edebiyatı",
                  "Diğer",
                ].map(
                  (cat) =>
                    studentSummary[cat] && (
                      <div
                        key={cat}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1 dark:bg-gray-900/60"
                      >
                        <span>{cat}</span>
                        <span className="font-semibold">
                          {studentSummary[cat]}
                        </span>
                      </div>
                    )
                )}
              </div>
            )}

            {/* Kayıt listesi */}
            {studentRecords.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-[11px]">
                  <thead className="bg-white/70 backdrop-blur-sm text-[10px] uppercase tracking-wide text-gray-600 dark:bg-gray-800/30">
                    <tr>
                      <th className="px-2 py-1 text-left">Tarih</th>
                      <th className="px-2 py-1 text-left">Saat</th>
                      <th className="px-2 py-1 text-left">Salon</th>
                      <th className="px-2 py-1 text-left">Öğretmen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRecords.map((r, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                      >
                        <td className="px-2 py-1">{r.tarih}</td>
                        <td className="px-2 py-1">{r.saat}. saat</td>
                        <td className="px-2 py-1">{r.salon}</td>
                        <td className="px-2 py-1">{r.ogretmen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!studentLoading &&
              !studentError &&
              studentQuery &&
              studentRecords.length === 0 && (
                <div className="mt-1 text-[11px] text-gray-500">
                  Bu öğrenci için {selectedDate} tarihine kadar kayıt
                  bulunamadı.
                </div>
              )}
          </div>

          {/* 2. Tüm öğrenciler – çoktan aza sıralı */}
          <div className="rounded-xl bg-white p-2 shadow-sm dark:bg-gray-900">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold">
                2) {selectedDate} tarihine kadar en çok etüt alan öğrenciler
              </span>
              {topStudents.length > 0 && (
                <button
                  type="button"
                  onClick={exportTopStudentsPdf}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-[10px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  PDF’e Aktar
                </button>
              )}
            </div>

            {topStudentsLoading && (
              <div className="text-[11px] text-gray-500">Yükleniyor…</div>
            )}

            {topStudentsError && (
              <div className="mt-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                {topStudentsError}
              </div>
            )}

            {!topStudentsLoading && topStudents.length > 0 && (
              <div className="mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-900/60">
                    <tr>
                      <th className="px-2 py-1 text-left">#</th>
                      <th className="px-2 py-1 text-left">No</th>
                      <th className="px-2 py-1 text-left">Ad Soyad</th>
                      <th className="px-2 py-1 text-left">Sınıf</th>
                      <th className="px-2 py-1 text-right">Etüt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStudents.slice(0, 100).map((s, idx) => (
                      <tr
                        key={`${s.ogr_no}-${idx}`}
                        className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                      >
                        <td className="px-2 py-1">{idx + 1}</td>
                        <td className="px-2 py-1">{s.ogr_no}</td>
                        <td className="px-2 py-1">{s.ogr_ad}</td>
                        <td className="px-2 py-1">{s.sinif}</td>
                        <td className="px-2 py-1 text-right font-semibold">
                          {s.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!topStudentsLoading &&
              !topStudentsError &&
              topStudents.length === 0 && (
                <div className="text-[11px] text-gray-500">
                  {selectedDate} tarihine kadar etüt kaydı bulunamadı.
                </div>
              )}
          </div>
        </div>

        {/* ÖĞRETMEN RAPORLARI */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 shadow-sm backdrop-blur-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
            Öğretmen Raporları
          </h4>

          {/* 1) Öğretmene göre liste */}
          <div className="mb-3 rounded-xl bg-white p-2 shadow-sm dark:bg-gray-900">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold">
                1) Öğretmene göre etüt listesi
              </span>
              {teacherRecords.length > 0 && (
                <button
                  type="button"
                  onClick={exportTeacherDetailPdf}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-[10px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  PDF’e Aktar
                </button>
              )}
            </div>
            <div className="mb-2 flex gap-1">
              <select
                value={teacherForList}
                onChange={(e) => setTeacherForList(e.target.value)}
                className="h-8 flex-1 rounded-lg border border-gray-300 px-2 text-xs outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Öğretmen seçin…</option>
                {(teachers || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleTeacherSearch}
                className="h-8 rounded-lg bg-gray-900 px-3 text-[11px] font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-gray-900"
              >
                Getir
              </button>
            </div>
            {teacherSearchLoading && (
              <div className="text-[11px] text-gray-500">Yükleniyor…</div>
            )}
            {teacherSearchError && (
              <div className="mt-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                {teacherSearchError}
              </div>
            )}
            {teacherRecords.length > 0 && (
              <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-[11px]">
                  <thead className="bg-white/70 backdrop-blur-sm text-[10px] uppercase tracking-wide text-gray-600 dark:bg-gray-800/30">
                    <tr>
                      <th className="px-2 py-1 text-left">Tarih</th>
                      <th className="px-2 py-1 text-left">Saat</th>
                      <th className="px-2 py-1 text-left">Öğrenci</th>
                      <th className="px-2 py-1 text-left">Sınıf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherRecords.map((r, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                      >
                        <td className="px-2 py-1">{r.tarih}</td>
                        <td className="px-2 py-1">{r.saat}. saat</td>
                        <td className="px-2 py-1">
                          {r.ogr_no} – {r.ogr_ad}
                        </td>
                        <td className="px-2 py-1">{r.sinif}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!teacherSearchLoading &&
              !teacherSearchError &&
              teacherForList &&
              teacherRecords.length === 0 && (
                <div className="mt-1 text-[11px] text-gray-500">
                  Bu öğretmen için {selectedDate} tarihine kadar etüt kaydı
                  bulunamadı.
                </div>
              )}
          </div>

          {/* 2) Tüm öğretmenlerin toplam etüt sayıları */}
          <div className="rounded-xl bg-white p-2 shadow-sm dark:bg-gray-900">
            <div className="mb-1 flex items-center justify_between">
              <span className="text-[11px] font-semibold">
                2) {selectedDate} tarihine kadar öğretmenlerin toplam etüt
                sayıları
              </span>
              {teacherTotals.length > 0 && (
                <button
                  type="button"
                  onClick={exportTeacherTotalsPdf}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-[10px] hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  PDF’e Aktar
                </button>
              )}
            </div>

            {teacherTotalsLoading && (
              <div className="text-[11px] text-gray-500">Yükleniyor…</div>
            )}

            {teacherTotalsError && (
              <div className="mt-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
                {teacherTotalsError}
              </div>
            )}

            {!teacherTotalsLoading && teacherTotals.length > 0 && (
              <div className="mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-[11px]">
                  <thead className="bg-white/70 backdrop-blur-sm text-[10px] uppercase tracking-wide text-gray-600 dark:bg-gray-800/30">
                    <tr>
                      <th className="px-2 py-1 text-left">#</th>
                      <th className="px-2 py-1 text-left">Öğretmen</th>
                      <th className="px-2 py-1 text-right">Etüt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherTotals.slice(0, 100).map((t, idx) => (
                      <tr
                        key={`${t.ogretmen || "bos"}-${idx}`}
                        className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/60"
                      >
                        <td className="px-2 py-1">{idx + 1}</td>
                        <td className="px-2 py-1">
                          {t.ogretmen || "(Öğretmen adı yok)"}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold">
                          {t.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!teacherTotalsLoading &&
              !teacherTotalsError &&
              teacherTotals.length === 0 && (
                <div className="text-[11px] text-gray-500">
                  {selectedDate} tarihine kadar etüt kaydı bulunamadı.
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ——— Excel (.xlsx) okuma ———
function parseStudentExcel(file, setStudentDb, supabase) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // A sütunu: Numara, B: Ad Soyad, C: Sınıf
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: ["A", "B", "C"],
      defval: "",
    });

    const db = {};
    const payload = [];

    for (let i = 0; i < rows.length; i++) {
      const A = String(rows[i]["A"]).trim(); // Öğrenci no
      const B = String(rows[i]["B"]).trim(); // Ad soyad
      const C = String(rows[i]["C"]).trim(); // Sınıf

      // Başlık satırlarını atla
      if (
        !A ||
        A.toLowerCase() === "öğrenci no" ||
        A.toLowerCase() === "ogrenci no" ||
        A.toLowerCase() === "no"
      ) {
        continue;
      }

      // Numara içermiyorsa (boş/yanlış satır) atla
      if (!/\d/.test(A)) continue;

      // Ekrandaki anlık kullanım için
      db[A] = { name: B, class: C };

      // Supabase'e yazmak için
      payload.push({
        ogr_no: A,
        ad: B,
        sinif: C,
      });
    }

    // React state: sayfada hemen kullanılabilsin
    setStudentDb(db);

    // Supabase'e kaydet
    if (supabase && payload.length > 0) {
      try {
        const { error } = await supabase
          .from("etut_ogrenciler")
          .upsert(payload, { onConflict: "ogr_no" });

        if (error) {
          console.error("Öğrenciler Supabase'e yazılırken hata:", error);
          alert(
            `Öğrenci listesi yüklendi ama Supabase'e kaydederken hata oluştu. (Satır sayısı: ${payload.length})`
          );
          return;
        }

        alert(
          `Öğrenci listesi yüklendi ve Supabase'e kaydedildi. Kayıt sayısı: ${Object.keys(
            db
          ).length}`
        );
      } catch (e) {
        console.error("Supabase upsert beklenmeyen hata:", e);
        alert(
          "Öğrenci listesi okundu fakat Supabase'e kaydedilirken beklenmeyen bir hata oluştu."
        );
      }
    } else {
      // Supabase kullanılamıyorsa en azından ekranda dursun
      alert(
        `Öğrenci listesi yüklendi. Kayıt sayısı: ${Object.keys(db).length}`
      );
    }
  };
  reader.readAsArrayBuffer(file);
}
export default App;
