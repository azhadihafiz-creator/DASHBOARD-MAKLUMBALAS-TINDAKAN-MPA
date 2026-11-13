import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, Clock, 
  Upload, FileText, Plus, Trash2, Search, Filter, 
  UserCheck, Building2, ExternalLink, RefreshCw, Layers,
  BarChart3, ListChecks
} from 'lucide-react';

// Tukar nama import kepada logo.jpg (tanpa jarak)
import logoImage from './logo.jpg';

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbySKbxkRuRcINT2IDAnXjgK8MvtwVXD-9oVttB4qxlVJd5Z9851KxaSjnznqzSIXn4e/exec";

const MBDK_DEPARTMENTS = [
  "Jabatan Khidmat Pengurusan", "Jabatan Kewangan", "Jabatan Kejuruteraan", "Jabatan Perancang Bandar",
  "Jabatan Bangunan", "Jabatan Penilaian dan Pengurusan Harta", "Jabatan Undang-Undang", "Jabatan Kemasyarakatan",
  "Jabatan Penguatkuasa", "Jabatan Pelesenan", "Jabatan Perkhidmatan Persekitaran", "Jabatan Landskap dan Rekreasi",
  "Jabatan Komunikasi Korporat", "Jabatan Teknologi Maklumat", "Jabatan Kesihatan", "Jabatan Pusat Setempat",
  "Jabatan Pesuruhjaya Bangunan", "Bahagian Ukur Bahan", "Unit Integriti", "Bahagian Sekretariat"
];

export default function App() {
  // Tab kawalan: 'dashboard' atau 'senarai'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [role, setRole] = useState('admin'); 
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);

  const [findings, setFindings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newFinding, setNewFinding] = useState({
    jabatan: MBDK_DEPARTMENTS[0], penemuan: '', justifikasi: '', penambahbaikan: '', bukti_penambahbaikan: '',
    tindakan: '', bukti_tindakan: '', impak: '', status: 'Merah'
  });

  const [activeEditId, setActiveEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    justifikasi: '', penambahbaikan: '', bukti_penambahbaikan: '', tindakan: '', bukti_tindakan: '', impak: '', status: 'Merah'
  });

  const fetchFindingsFromSheets = async () => {
    setSyncing(true);
    try {
      const response = await fetch(GAS_API_URL);
      const data = await response.json();
      if (Array.isArray(data)) {
        const formatted = data.map((item, index) => ({
          id: item.ID || String(index + 1),
          tarikh: item.Tarikh || new Date().toISOString().split('T')[0],
          jabatan: item.Jabatan || 'Jabatan Khidmat Pengurusan',
          penemuan: item.Penemuan_Audit || '',
          justifikasi: item.Justifikasi || '',
          penambahbaikan: item.Penambahbaikan || '',
          bukti_penambahbaikan: item.Bukti_Penambahbaikan_URL || '',
          tindakan: item.Tindakan_Seterusnya || '',
          bukti_tindakan: item.Bukti_Tindakan_URL || '',
          impak: item.Impak || '',
          status: item.Status || 'Merah'
        }));
        setFindings(formatted);
      }
    } catch (error) {
      console.error("Ralat memuat turun:", error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchFindingsFromSheets(); }, []);

  const postToSheets = async (payload) => {
    setSyncing(true);
    try {
      await fetch(GAS_API_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setTimeout(() => { fetchFindingsFromSheets(); }, 1500);
    } catch (error) {
      console.error("Ralat memuat naik:", error);
      setSyncing(false);
    }
  };

  const handleAddFindingSubmit = (e) => {
    e.preventDefault();
    if (!newFinding.penemuan) return;
    const id = 'MBDK-' + Date.now().toString().slice(-4);
    postToSheets({ id: id, tarikh: new Date().toISOString().split('T')[0], ...newFinding });
    setShowAddModal(false);
    setNewFinding({
      jabatan: MBDK_DEPARTMENTS[0], penemuan: '', justifikasi: '', penambahbaikan: '',
      bukti_penambahbaikan: '', tindakan: '', bukti_tindakan: '', impak: '', status: 'Merah'
    });
  };

  const handleSaveEdit = (id) => {
    const target = findings.find(f => f.id === id);
    if (!target) return;
    postToSheets({ action: 'update', id: id, tarikh: target.tarikh, jabatan: target.jabatan, penemuan: target.penemuan, ...editForm });
    setActiveEditId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Pasti mahu memadam rekod ini?")) {
      postToSheets({ action: 'delete', id: id });
    }
  };

  const handleStatusChange = (id, newStatus) => {
    const target = findings.find(f => f.id === id);
    if (!target) return;
    postToSheets({
      action: 'update', id: id, tarikh: target.tarikh, jabatan: target.jabatan, penemuan: target.penemuan,
      justifikasi: target.justifikasi, penambahbaikan: target.penambahbaikan, bukti_penambahbaikan: target.bukti_penambahbaikan,
      tindakan: target.tindakan, bukti_tindakan: target.bukti_tindakan, impak: target.impak, status: newStatus
    });
  };

  // KIRAAN STATISTIK KESELURUHAN
  const totalFindings = findings.length;
  const countMerah = findings.filter(f => f.status === 'Merah').length;
  const countKuning = findings.filter(f => f.status === 'Kuning').length;
  const countHijau = findings.filter(f => f.status === 'Hijau').length;
  const progressPercentage = totalFindings === 0 ? 0 : Math.round((countHijau / totalFindings) * 100);

  // KIRAAN STATISTIK MENGIKUT JABATAN UNTUK CARTA DASHBOARD
  const deptStats = MBDK_DEPARTMENTS.map(dept => {
    const deptFindings = findings.filter(f => f.jabatan === dept);
    const total = deptFindings.length;
    const merah = deptFindings.filter(f => f.status === 'Merah').length;
    const kuning = deptFindings.filter(f => f.status === 'Kuning').length;
    const hijau = deptFindings.filter(f => f.status === 'Hijau').length;
    return { dept, total, merah, kuning, hijau };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total); // Tapis jabatan yang ada data sahaja

  const filteredFindings = findings.filter(f => {
    const matchDept = selectedDeptFilter === 'Semua' || f.jabatan === selectedDeptFilter;
    const matchSearch = f.penemuan.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        f.jabatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        f.justifikasi.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* HEADER */}
      <header className="bg-red-950 text-white shadow-md border-b-4 border-amber-400">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-black p-1.5 rounded-lg shadow border border-slate-700">
              <img 
                src={logoImage} 
                alt="Logo MBDK" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://www.mbdk.gov.my/sites/default/files/styles/logo_mbdk/public/logo-mbdk-baru.png";
                }}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">MAJLIS BANDARAYA DIRAJA KLANG</h1>
              <p className="text-xs text-amber-300 font-medium">Bahagian Audit Dalam | Sistem Pemantauan Rasmi</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-red-900/80 px-4 py-2 rounded-xl border border-red-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">Mod:</span>
              <button onClick={() => setRole(role === 'admin' ? 'dept' : 'admin')} className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${role === 'admin' ? 'bg-amber-500 text-red-950 shadow' : 'bg-slate-700 text-white'}`}>
                {role === 'admin' ? '🛡️ Urusetia (Admin)' : '🏢 Jabatan (Pegawai)'}
              </button>
            </div>
            <button onClick={fetchFindingsFromSheets} className="p-2 bg-red-800 hover:bg-red-700 rounded-lg text-amber-300 transition-all flex items-center gap-1 text-xs">
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* MENU NAVIGASI (TABS) */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-red-950 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BarChart3 size={18} /> Ringkasan Keseluruhan
          </button>
          <button 
            onClick={() => setActiveTab('senarai')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'senarai' ? 'bg-red-950 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ListChecks size={18} /> Senarai & Borang Maklum Balas
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {/* ========================================================= */}
        {/* PAPARAN 1: DASHBOARD RINGKASAN */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-red-950">Statistik Prestasi Semasa</h2>
              <p className="text-sm text-slate-500 mt-1">Status penyelesaian arahan Pengerusi Mesyuarat Penutup Audit mengikut kesediaan jabatan.</p>
              
              {/* KAD STATISTIK UTAMA */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Jumlah Penemuan</p>
                  <h3 className="text-4xl font-black text-slate-800 mt-2">{totalFindings}</h3>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm text-center">
                  <p className="text-xs text-red-600 font-bold uppercase tracking-wide">Belum Laksana</p>
                  <h3 className="text-4xl font-black text-red-700 mt-2">{countMerah}</h3>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm text-center">
                  <p className="text-xs text-amber-600 font-bold uppercase tracking-wide">Dalam Pelaksanaan</p>
                  <h3 className="text-4xl font-black text-amber-700 mt-2">{countKuning}</h3>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm text-center">
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Selesai (Hijau)</p>
                  <h3 className="text-4xl font-black text-emerald-700 mt-2">{countHijau}</h3>
                </div>
              </div>

              {/* BAR KEMAJUAN KESELURUHAN */}
              <div className="mt-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-bold text-slate-700">Kadar Penyelesaian Keseluruhan MBDK</span>
                  <span className="text-lg font-black text-emerald-600">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
                  {totalFindings > 0 && (
                    <>
                      <div style={{ width: `${(countHijau/totalFindings)*100}%` }} className="bg-emerald-500 h-full transition-all duration-500"></div>
                      <div style={{ width: `${(countKuning/totalFindings)*100}%` }} className="bg-amber-400 h-full transition-all duration-500"></div>
                      <div style={{ width: `${(countMerah/totalFindings)*100}%` }} className="bg-red-500 h-full transition-all duration-500"></div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CARTA PRESTASI JABATAN */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Prestasi Mengikut Jabatan Terlibat</h3>
              
              {deptStats.length === 0 ? (
                <p className="text-center text-slate-400 py-10">Tiada rekod penemuan jabatan buat masa ini.</p>
              ) : (
                <div className="space-y-5">
                  {deptStats.map((stat, index) => (
                    <div key={index} className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="w-full md:w-1/3">
                        <span className="text-sm font-semibold text-slate-700">{stat.dept}</span>
                        <div className="text-xs text-slate-400 font-medium">{stat.total} Teguran</div>
                      </div>
                      <div className="w-full md:w-2/3">
                        <div className="w-full bg-slate-100 rounded-lg h-6 overflow-hidden flex shadow-inner">
                          {stat.hijau > 0 && <div style={{ width: `${(stat.hijau/stat.total)*100}%` }} className="bg-emerald-500 h-full flex items-center justify-center text-[10px] text-white font-bold">{stat.hijau}</div>}
                          {stat.kuning > 0 && <div style={{ width: `${(stat.kuning/stat.total)*100}%` }} className="bg-amber-400 h-full flex items-center justify-center text-[10px] text-amber-900 font-bold">{stat.kuning}</div>}
                          {stat.merah > 0 && <div style={{ width: `${(stat.merah/stat.total)*100}%` }} className="bg-red-500 h-full flex items-center justify-center text-[10px] text-white font-bold">{stat.merah}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PAPARAN 2: SENARAI & BORANG MAKLUM BALAS */}
        {/* ========================================================= */}
        {activeTab === 'senarai' && (
          <div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-red-950">Pengurusan Maklum Balas</h2>
                <p className="text-sm text-slate-500 mt-1">Sila kemas kini butiran tindakan dan muat naik dokumen bukti (PDF) bagi setiap penemuan.</p>
              </div>
              {role === 'admin' && (
                <button onClick={() => setShowAddModal(true)} className="bg-red-900 hover:bg-red-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-md transition-all">
                  <Plus size={18} /> Rekod Penemuan Baharu
                </button>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={18} className="text-slate-400" />
                <select value={selectedDeptFilter} onChange={(e) => setSelectedDeptFilter(e.target.value)} className="w-full md:w-80 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-900">
                  <option value="Semua">Semua Jabatan MBDK ({MBDK_DEPARTMENTS.length})</option>
                  {MBDK_DEPARTMENTS.map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                </select>
              </div>
              <div className="relative w-full md:w-80">
                <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input type="text" placeholder="Cari penemuan atau jabatan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-900" />
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {filteredFindings.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                  <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                  <h3 className="text-lg font-semibold text-slate-700">Tiada Rekod Ditemui</h3>
                </div>
              ) : (
                filteredFindings.map((item) => (
                  <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${item.status === 'Hijau' ? 'border-emerald-200' : item.status === 'Kuning' ? 'border-amber-200' : 'border-red-200'}`}>
                    <div className={`px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${item.status === 'Hijau' ? 'bg-emerald-50/60' : item.status === 'Kuning' ? 'bg-amber-50/60' : 'bg-red-50/60'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${item.status === 'Hijau' ? 'bg-emerald-600 text-white' : item.status === 'Kuning' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}`}>
                          {item.status === 'Hijau' ? '🟢 Selesai' : item.status === 'Kuning' ? '🟡 Dalam Pelaksanaan' : '🔴 Belum Laksana'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{item.id} • Tarikh: {item.tarikh}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-950 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5"><Building2 size={13} className="text-red-800" /> {item.jabatan}</span>
                        {role === 'admin' && <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-all" title="Padam"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Penemuan Audit / Arahan Pengerusi</span>
                        <p className="text-base font-semibold text-slate-800 mt-1 leading-relaxed">{item.penemuan}</p>
                      </div>
                      <hr className="border-slate-100" />
                      
                      {activeEditId === item.id ? (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                          <h4 className="text-sm font-bold text-red-950">Kemaskini Maklum Balas Jabatan</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Justifikasi</label><textarea rows={3} value={editForm.justifikasi} onChange={(e) => setEditForm({...editForm, justifikasi: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Penambahbaikan (Borang ISO/dll)</label><textarea rows={3} value={editForm.penambahbaikan} onChange={(e) => setEditForm({...editForm, penambahbaikan: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">URL Bukti Penambahbaikan (Link Google Drive)</label><input type="text" value={editForm.bukti_penambahbaikan} onChange={(e) => setEditForm({...editForm, bukti_penambahbaikan: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Tindakan</label><input type="text" value={editForm.tindakan} onChange={(e) => setEditForm({...editForm, tindakan: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">URL Bukti Tindakan (Gambar dsb)</label><input type="text" value={editForm.bukti_tindakan} onChange={(e) => setEditForm({...editForm, bukti_tindakan: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Impak Tindakan</label><input type="text" value={editForm.impak} onChange={(e) => setEditForm({...editForm, impak: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm" /></div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setActiveEditId(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Batal</button><button type="button" onClick={() => handleSaveEdit(item.id)} className="px-4 py-2 bg-red-900 text-white rounded-lg text-sm font-medium shadow">Simpan Maklum Balas</button></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2"><span className="text-xs font-bold text-slate-400 uppercase">Justifikasi Jabatan</span><p className="text-slate-700">{item.justifikasi || '-'}</p></div>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2"><span className="text-xs font-bold text-slate-400 uppercase">Penambahbaikan & Fail</span><p className="text-slate-700">{item.penambahbaikan || '-'}</p>{item.bukti_penambahbaikan && <a href={item.bukti_penambahbaikan} target="_blank" rel="noreferrer" className="text-xs font-semibold text-red-800 hover:underline inline-flex items-center gap-1"><ExternalLink size={12}/> Buka Bukti</a>}</div>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2"><span className="text-xs font-bold text-slate-400 uppercase">Tindakan & Impak</span><p className="text-slate-700">{item.tindakan || '-'}</p>{item.bukti_tindakan && <a href={item.bukti_tindakan} target="_blank" rel="noreferrer" className="text-xs font-semibold text-red-800 hover:underline inline-flex items-center gap-1"><ExternalLink size={12}/> Lihat Gambar</a>}<p className="text-xs text-slate-500 pt-1 font-medium">Impak: {item.impak || '-'}</p></div>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                        <button onClick={() => { setActiveEditId(item.id); setEditForm({ ...item }); }} className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"><FileText size={14} /> Isi / Kemaskini Maklum Balas Jabatan</button>
                        {role === 'admin' ? (
                          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                            <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
                            <button onClick={() => handleStatusChange(item.id, 'Merah')} className={`px-2.5 py-1 rounded-lg text-xs font-bold ${item.status === 'Merah' ? 'bg-red-600 text-white shadow' : 'bg-white text-red-600 border'}`}>Merah</button>
                            <button onClick={() => handleStatusChange(item.id, 'Kuning')} className={`px-2.5 py-1 rounded-lg text-xs font-bold ${item.status === 'Kuning' ? 'bg-amber-500 text-white shadow' : 'bg-white text-amber-600 border'}`}>Kuning</button>
                            <button onClick={() => handleStatusChange(item.id, 'Hijau')} className={`px-2.5 py-1 rounded-lg text-xs font-bold ${item.status === 'Hijau' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-emerald-600 border'}`}>Hijau</button>
                          </div>
                        ) : ( <span className="text-xs text-slate-400 italic">Status dikawal oleh Urusetia.</span> )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-10 py-6 border-t border-slate-200 text-center">
          <p className="text-xs font-semibold text-slate-500 tracking-wide">Hak Cipta Terpelihara Bahagian Audit Dalam MBDK &copy; 2026</p>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-red-950 mb-4">Rekod Penemuan Audit Baharu</h3>
            <form onSubmit={handleAddFindingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jabatan Bertanggungjawab</label>
                <select value={newFinding.jabatan} onChange={(e) => setNewFinding({...newFinding, jabatan: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  {MBDK_DEPARTMENTS.map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Arahan Pengerusi</label>
                <textarea rows={3} required value={newFinding.penemuan} onChange={(e) => setNewFinding({...newFinding, penemuan: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Masukkan teguran audit..."></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Batal</button>
                <button type="submit" className="px-4 py-2 bg-red-900 text-white rounded-lg text-sm font-medium shadow">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
