import React, { useEffect, useState } from "react";

const ADMIN_PASSWORD = "123456"; // Yönetici şifresini buradan değiştirebilirsin
const LS_KEY_TEACHERS = "etut_teachers";

export default function App() {
  const [teachers, setTeachers] = useState([]);
  const [role, setRole] = useState("none"); // "none" | "admin" | "teacher"
  const [loggedTeacher, setLoggedTeacher] = useState(null);

  // Giriş formu state'leri
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [teacherUsernameInput, setTeacherUsernameInput] = useState("");
  const [teacherPasswordInput, setTeacherPasswordInput] = useState("");

  // Öğretmen formu state'leri
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formBranch, setFormBranch] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");

  // localStorage'dan öğretmenleri çek
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY_TEACHERS);
    if (stored) {
      try {
        setTeachers(JSON.parse(stored));
      } catch (e) {
        console.error("Öğretmen listesi okunamadı:", e);
      }
    }
  }, []);

  // öğretmen listesi değişince localStorage'a yaz
  useEffect(() => {
    localStorage.setItem(LS_KEY_TEACHERS, JSON.stringify(teachers));
  }, [teachers]);

  // Yönetici girişi
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput.trim() === ADMIN_PASSWORD) {
      setRole("admin");
    } else {
      alert("Yönetici şifresi hatalı!");
    }
  };

  // Öğretmen girişi
  const handleTeacherLogin = (e) => {
    e.preventDefault();
    const t = teachers.find(
      (x) =>
        x.username === teacherUsernameInput.trim() &&
        x.password === teacherPasswordInput.trim()
    );
    if (!t) {
      alert("Kullanıcı adı veya şifre hatalı!");
      return;
    }
    setLoggedTeacher(t);
    setRole("teacher");
  };

  // Öğretmen formunu sıfırla
  const resetTeacherForm = () => {
    setEditingId(null);
    setFormName("");
    setFormBranch("");
    setFormUsername("");
    setFormPassword("");
  };

  // Öğretmen kaydet / güncelle
  const handleSaveTeacher = (e) => {
    e.preventDefault();

    if (!formName.trim() || !formUsername.trim() || !formPassword.trim()) {
      alert("Ad Soyad, Kullanıcı Adı ve Şifre zorunludur.");
      return;
    }

    // Kullanıcı adı benzersiz olsun
    const exists = teachers.find(
      (t) => t.username === formUsername.trim() && t.id !== editingId
    );
    if (exists) {
      alert("Bu kullanıcı adı zaten kullanılıyor.");
      return;
    }

    if (editingId) {
      // Güncelle
      const updated = teachers.map((t) =>
        t.id === editingId
          ? {
              ...t,
              name: formName.trim(),
              branch: formBranch.trim(),
              username: formUsername.trim(),
              password: formPassword.trim(),
            }
          : t
      );
      setTeachers(updated);
    } else {
      // Yeni ekle
      const newTeacher = {
        id: Date.now().toString(),
        name: formName.trim(),
        branch: formBranch.trim(),
        username: formUsername.trim(),
        password: formPassword.trim(),
      };
      setTeachers((prev) => [...prev, newTeacher]);
    }

    resetTeacherForm();
  };

  const handleEditTeacher = (id) => {
    const t = teachers.find((x) => x.id === id);
    if (!t) return;
    setEditingId(t.id);
    setFormName(t.name);
    setFormBranch(t.branch || "");
    setFormUsername(t.username);
    setFormPassword(t.password);
  };

  const handleDeleteTeacher = (id) => {
    if (!window.confirm("Bu öğretmeni silmek istiyor musunuz?")) return;
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogout = () => {
    setRole("none");
    setLoggedTeacher(null);
    setAdminPasswordInput("");
    setTeacherUsernameInput("");
    setTeacherPasswordInput("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ÜST BAR */}
      <header className="bg-sky-900 text-white px-4 py-3 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-semibold text-lg md:text-xl">
            Ünye Fen Lisesi · Etüt Paneli
          </h1>
          {role !== "none" && (
            <button
              onClick={handleLogout}
              className="text-sm bg-sky-700 hover:bg-sky-600 px-3 py-1 rounded-md"
            >
              Çıkış Yap
            </button>
          )}
        </div>
      </header>

      {/* ANA İÇERİK */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {role === "none" && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Yönetici Girişi */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Yönetici Girişi</h2>
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">
                    Yönetici Şifresi
                  </label>
                  <input
                    type="password"
                    className="w-full border rounded-md px-2 py-1 text-sm"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Örn: 123456"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-sky-900 text-white rounded-md py-2 text-sm font-semibold hover:bg-sky-800"
                >
                  Yönetici Olarak Giriş Yap
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                Varsayılan yönetici şifresi:{" "}
                <span className="font-semibold">123456</span> <br />
                Bunu kodun başındaki{" "}
                <code className="bg-gray-100 px-1 rounded">ADMIN_PASSWORD</code>{" "}
                sabitinden değiştirebilirsiniz.
              </p>
            </div>

            {/* Öğretmen Girişi */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Öğretmen Girişi</h2>
              <form onSubmit={handleTeacherLogin} className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-2 py-1 text-sm"
                    value={teacherUsernameInput}
                    onChange={(e) => setTeacherUsernameInput(e.target.value)}
                    placeholder="Örn: bkapici"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Şifre</label>
                  <input
                    type="password"
                    className="w-full border rounded-md px-2 py-1 text-sm"
                    value={teacherPasswordInput}
                    onChange={(e) => setTeacherPasswordInput(e.target.value)}
                    placeholder="Örn: 2025etut"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white rounded-md py-2 text-sm font-semibold hover:bg-emerald-500"
                >
                  Öğretmen Olarak Giriş Yap
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                Öğretmenler, yönetici panelinden eklendikten sonra burada kendi
                kullanıcı adı ve şifresiyle giriş yapar.
              </p>
            </div>
          </div>
        )}

        {role === "admin" && (
          <AdminPanel
            teachers={teachers}
            formName={formName}
            formBranch={formBranch}
            formUsername={formUsername}
            formPassword={formPassword}
            setFormName={setFormName}
            setFormBranch={setFormBranch}
            setFormUsername={setFormUsername}
            setFormPassword={setFormPassword}
            editingId={editingId}
            onSave={handleSaveTeacher}
            onReset={resetTeacherForm}
            onEdit={handleEditTeacher}
            onDelete={handleDeleteTeacher}
          />
        )}

        {role === "teacher" && (
          <TeacherPanel loggedTeacher={loggedTeacher} />
        )}
      </main>
    </div>
  );
}

// --- Yönetici Paneli Bileşeni ---
function AdminPanel({
  teachers,
  formName,
  formBranch,
  formUsername,
  formPassword,
  setFormName,
  setFormBranch,
  setFormUsername,
  setFormPassword,
  editingId,
  onSave,
  onReset,
  onEdit,
  onDelete,
}) {
  return (
    <>
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">
          Yönetici Paneli{" "}
          <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
            Öğretmen Yönetimi
          </span>
        </h2>

        <form
          onSubmit={onSave}
          className="grid md:grid-cols-2 gap-4 items-start"
        >
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Öğretmen Bilgisi</h3>
            <div>
              <label className="block text-xs mb-1">Ad Soyad</label>
              <input
                className="w-full border rounded-md px-2 py-1 text-sm"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Örn: Banu Kapıcı"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Branş</label>
              <input
                className="w-full border rounded-md px-2 py-1 text-sm"
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value)}
                placeholder="Örn: Matematik"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Giriş Bilgileri</h3>
            <div>
              <label className="block text-xs mb-1">Kullanıcı Adı</label>
              <input
                className="w-full border rounded-md px-2 py-1 text-sm"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="Örn: bkapici"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Şifre</label>
              <input
                className="w-full border rounded-md px-2 py-1 text-sm"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Örn: 2025etut"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 bg-sky-900 text-white rounded-md py-1.5 text-sm font-semibold hover:bg-sky-800"
              >
                {editingId ? "Güncelle" : "Kaydet"}
              </button>
              <button
                type="button"
                onClick={onReset}
                className="flex-1 bg-gray-200 text-gray-800 rounded-md py-1.5 text-sm font-semibold hover:bg-gray-300"
              >
                Temizle
              </button>
            </div>

            <p className="text-xs text-gray-500">
              • Yeni öğretmen eklerken kullanıcı adı ve şifre belirleyin. <br />
              • Düzenleme modunda şifreyi değiştirip tekrar kaydedebilirsiniz.
            </p>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-sm mb-2">Kayıtlı Öğretmenler</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left w-10">#</th>
                <th className="border px-2 py-1 text-left">Ad Soyad</th>
                <th className="border px-2 py-1 text-left">Branş</th>
                <th className="border px-2 py-1 text-left">Kullanıcı Adı</th>
                <th className="border px-2 py-1 text-left">Şifre</th>
                <th className="border px-2 py-1 text-left w-32">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border px-2 py-2 text-center text-gray-500"
                  >
                    Henüz öğretmen eklenmemiş.
                  </td>
                </tr>
              ) : (
                teachers.map((t, idx) => (
                  <tr key={t.id}>
                    <td className="border px-2 py-1">{idx + 1}</td>
                    <td className="border px-2 py-1">{t.name}</td>
                    <td className="border px-2 py-1">
                      {t.branch || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="border px-2 py-1">{t.username}</td>
                    <td className="border px-2 py-1">{t.password}</td>
                    <td className="border px-2 py-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEdit(t.id)}
                          className="flex-1 bg-sky-700 text-white rounded px-1 py-0.5 text-[11px] hover:bg-sky-600"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="flex-1 bg-rose-600 text-white rounded px-1 py-0.5 text-[11px] hover:bg-rose-500"
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
        <p className="text-xs text-gray-500 mt-2">
          Not: Gerçek sistemlerde şifreler bu şekilde gösterilmez; okul içi
          kullanım ve pratiklik için burada açık gösterilmektedir.
        </p>
      </section>
    </>
  );
}

// --- Öğretmen Paneli Bileşeni ---
function TeacherPanel({ loggedTeacher }) {
  return (
    <section className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div>
          <h2 className="text-lg font-semibold">Öğretmen Paneli</h2>
          {loggedTeacher && (
            <p className="text-xs text-gray-600">
              Giriş yapan:{" "}
              <span className="font-semibold">{loggedTeacher.name}</span>{" "}
              {loggedTeacher.branch && (
                <span className="text-gray-500">
                  ({loggedTeacher.branch})
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* BURAYA MEVCUT ETÜT PANELİNİ KOY */}
      <div className="mt-2">
        <p className="text-sm text-gray-600 mb-2">
          Buraya daha önce hazırladığınız <b>etüt planlama arayüzünü</b>
          ekleyebilirsiniz.
        </p>
        {/* Örnek: Eğer daha önce EtutPanel diye bir bileşeniniz varsa: */}
        {/* <EtutPanel /> */}
      </div>
    </section>
  );
}
