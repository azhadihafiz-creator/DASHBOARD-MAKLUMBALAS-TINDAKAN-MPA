import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, Clock, 
  Upload, FileText, Plus, Trash2, Search, Filter, 
  UserCheck, Building2, ExternalLink, RefreshCw, Layers,
  BarChart3, ListChecks
} from 'lucide-react';

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbySKbxkRuRcINT2IDAnXjgK8MvtwVXD-9oVttB4qxlVJd5Z9851KxaSjnznqzSIXn4e/exec";

const MBDK_DEPARTMENTS = [
  "Jabatan Khidmat Pengurusan", "Jabatan Kewangan", "Jabatan Kejuruteraan", "Jabatan Perancang Bandar",
  "Jabatan Bangunan", "Jabatan Penilaian dan Pengurusan Harta", "Jabatan Undang-Undang", "Jabatan Kemasyarakatan",
  "Jabatan Penguatkuasa", "Jabatan Pelesenan", "Jabatan Perkhidmatan Persekitaran", "Jabatan Landskap dan Rekreasi",
  "Jabatan Komunikasi Korporat", "Jabatan Teknologi Maklumat", "Jabatan Kesihatan", "Jabatan Pusat Setempat",
  "Jabatan Pesuruhjaya Bangunan", "Bahagian Ukur Bahan", "Unit Integriti", "Bahagian Sekretariat"
];

export default function App() {
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

  const totalFindings = findings.length;
  const countMerah = findings.filter(f => f.status === 'Merah').length;
  const countKuning = findings.filter(f => f.status === 'Kuning').length;
  const countHijau = findings.filter(f => f.status === 'Hijau').length;
  const progressPercentage = totalFindings === 0 ? 0 : Math.round((countHijau / totalFindings) * 100);

  const deptStats = MBDK_DEPARTMENTS.map(dept => {
    const deptFindings = findings.filter(f => f.jabatan === dept);
    const total = deptFindings.length;
    const merah = deptFindings.filter(f => f.status === 'Merah').length;
    const kuning = deptFindings.filter(f => f.status === 'Kuning').length;
    const hijau = deptFindings.filter(f => f.status === 'Hijau').length;
    return { dept, total, merah, kuning, hijau };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  const filteredFindings = findings.filter(f => {
    const matchDept = selectedDeptFilter === 'Semua' || f.jabatan === selectedDeptFilter;
    const matchSearch = f.penemuan.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        f.jabatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        f.justifikasi.toLowerCase().includes(searchTerm.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <header className="bg-red-950 text-white shadow-md border-b-4 border-amber-400">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg shadow">
              <img 
                src="https://www.mbdk.gov.my/sites/default/files/styles/logo_mbdk/public/logo-mbdk-baru.png" 
                alt="Logo MBDK" 
                className="h-12 w-auto object-contain"
                onError={(e)=>{
                  e.target.onerror = null; 
                  e.target.src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Coat_of_arms_of_Selangor.svg/480px-Coat_of_arms_of_Selangor.svg.png";
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

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <button onClick={() => setActiveTab('dashboard')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-red-950 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
            <BarChart3 size={18} /> Ringkasan Keseluruhan
          </button>
          <button onClick={() => setActiveTab('senarai')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'senarai' ? 'bg-red-950 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
            <ListChecks size={18} /> Senarai & Borang Maklum Balas
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-red-950">Statistik Prestasi Semasa</h2>
              <p className="text-sm text-slate-500 mt-1">Status penyelesaian arahan Pengerusi Mesyuarat Penutup Audit mengikut kesediaan jabatan.</p>
              
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
                  <h
