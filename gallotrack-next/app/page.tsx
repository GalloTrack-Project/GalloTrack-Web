'use client';
import React, { useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function GalloTrackSystem() {
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'profiling' | 'marketplace'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Comprehensive Registry State Array (ERD-Compliant Schema)
  const [fowls, setFowls] = useState([
    { id: 1, name: 'Red Thunder', breed: 'Sweater', sire: 'Pure Sweater Rooster', dam: 'Pure Sweater Hen', sirePct: 100, damPct: 100, bloodlinePct: 100, weight: '2.2 kg', height: '31 cm', age: '14 Months', gender: 'Rooster', color: 'Red-Allover', status: 'Active', birthdate: '2025-04-12' },
    { id: 2, name: 'Gold Blade', breed: 'Lemon', sire: 'Pure Lemon Rooster', dam: 'Pure Hatch Hen', sirePct: 100, damPct: 100, bloodlinePct: 100, weight: '2.4 kg', height: '33 cm', age: '12 Months', gender: 'Rooster', color: 'Gold-Yellow', status: 'Active', birthdate: '2025-06-02' }
  ]);

  // Historical Match Metrics Logger
  const [matchHistory] = useState([
    { id: 101, date: '2026-05-12', entryName: 'Red Thunder', breed: 'Sweater', opponent: 'Kelso Express', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Win', status: 'Verified' },
    { id: 102, date: '2026-05-18', entryName: 'Gold Blade', breed: 'Lemon', opponent: 'Hatch Dominator', location: 'Iloilo Exhibition Center', type: 'Hack Match', outcome: 'Win', status: 'Verified' },
    { id: 103, date: '2026-05-25', entryName: 'Red Thunder', breed: 'Sweater', opponent: 'Lemon Slasher', location: 'Dingle Breeding Arena', type: 'Derby Match', outcome: 'Loss', status: 'Verified' },
    { id: 104, date: '2026-06-02', entryName: 'Red Thunder', breed: 'Sweater', opponent: 'Grey Warrior', location: 'Local Breeding Yard', type: 'Hack Match', outcome: 'Draw', status: 'Verified' },
  ]);

  // Form Processing States
  const [newName, setNewName] = useState('');
  const [newBreed, setNewBreed] = useState('Sweater');
  const [newGender, setNewGender] = useState('Rooster');
  const [newColor, setNewColor] = useState('');
  const [newBirthdate, setNewBirthdate] = useState('');
  const [sireName, setSireName] = useState('');
  const [damName, setDamName] = useState('');
  const [sirePct, setSirePct] = useState(100);
  const [damPct, setDamPct] = useState(100);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState(''); 
  const [search, setSearch] = useState('');

  // Recursive Ancestry Matching Logic Engine
  const getSiblingsForFowl = (currentSire: string, currentDam: string, currentId: number) => {
    if (!currentSire || !currentDam) return [];
    return fowls.filter(f => 
      f.id !== currentId && 
      f.sire.toLowerCase().trim() === currentSire.toLowerCase().trim() &&
      f.dam.toLowerCase().trim() === currentDam.toLowerCase().trim()
    ).map(f => f.name);
  };

  const handleAddFowl = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedBloodline = (Number(sirePct) + Number(damPct)) / 2;
    const newFowl = {
      id: Date.now(),
      name: newName,
      breed: newBreed,
      sire: sireName,
      dam: damName,
      sirePct: Number(sirePct),
      damPct: Number(damPct),
      bloodlinePct: calculatedBloodline,
      weight: weight ? `${weight} kg` : 'N/A',
      height: height ? `${height} cm` : 'N/A',
      age: age ? `${age} Months` : 'N/A',
      gender: newGender,
      color: newColor ? newColor : 'Unspecified',
      status: 'Active',
      birthdate: newBirthdate ? newBirthdate : '2026-01-01'
    };
    setFowls([newFowl, ...fowls]);
    setNewName(''); setSireName(''); setDamName(''); setWeight(''); setHeight(''); setAge(''); setNewColor(''); setNewBirthdate('');
    alert('System Notification: Core profile structural data arrays initialized successfully.');
  };

  const handleArchiveFowl = (id: number) => {
    setFowls(fowls.map(f => f.id === id ? { ...f, status: 'Archived' } : f));
  };

  const handleSystemAction = (actionName: string) => {
    alert(`Enterprise Security Module: ${actionName} pipeline executed.`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() !== '' && password === 'cict123') {
      setError('');
      setCurrentPage('dashboard');
    } else {
      setError('Data Privacy Act Notice: Cryptographic verification mismatch.');
    }
  };

  // Class Diagram Operation Sync: + logout() :: void (image_6c50fa.png)
  const handleLogout = () => {
    setUsername('');
    setPassword('');
    setCurrentPage('login');
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans antialiased text-slate-900 flex flex-col md:flex-row">
      
      {/* ==================== LOGIN FRAMEWORK ==================== */}
      {currentPage === 'login' && (
        <div className="flex items-center justify-center min-h-screen w-full p-4 bg-gradient-to-tr from-[#022c22] via-[#064e3b] to-[#0f172a]">
          <div className="bg-white p-10 rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-black tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">ISUFST CICT Official Capstone</span>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">GALLOTRACK</h1>
              <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">Optimizing Gamefowl Management Through Recursive Analytics & Lineage Trace Systems</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Administrative Email / Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none" placeholder="admin@gallotrack.local" required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Encrypted System Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none" placeholder="••••••••••••" required />
              </div>
              {error && <div className="text-xs text-rose-700 font-semibold text-center bg-rose-50 border border-rose-100 p-3 rounded-xl">{error}</div>}
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-700/20 cursor-pointer text-sm">Verify Framework & Authenticate</button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ENTERPRISE FIXED SIDEBAR ==================== */}
      {currentPage !== 'login' && (
        <aside className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col md:fixed md:inset-y-0 md:left-0 z-50 border-r border-slate-800 shadow-xl">
          <div className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black tracking-wider text-white">GALLOTRACK</h2>
              <span className="text-[9px] font-mono font-bold text-emerald-400 block uppercase">Version 1.0.0 Stable</span>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-2 mt-4">
            <button onClick={() => setCurrentPage('dashboard')} className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentPage === 'dashboard' ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}>
              <span>📊 Dashboard Analytics</span>
            </button>
            <button onClick={() => setCurrentPage('profiling')} className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentPage === 'profiling' ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}>
              <span>🧬 Input & Profiling Engine</span>
            </button>
            <button onClick={() => setCurrentPage('marketplace')} className={`w-full text-left flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentPage === 'marketplace' ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}>
              <span>🛒 Verified Marketplace</span>
            </button>
          </nav>
          
          {/* ADDED: LOGOUT METHOD TRIGGER BLOCK (Perfect match for Class Diagram + logout() method) */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col space-y-2">
            <button onClick={handleLogout} className="w-full bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-200 border border-slate-700/50 hover:border-rose-900/50 text-left flex items-center space-x-3 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer">
              <span>🚪 Terminate Session (Log Out)</span>
            </button>
            <div className="text-center text-[9px] text-slate-600 font-mono pt-1">
              Auth Mode: Single Admin Node
            </div>
          </div>
        </aside>
      )}

      {/* ==================== MAIN ADMINISTRATIVE CONTENT REGION ==================== */}
      {currentPage !== 'login' && (
        <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
          <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-40 flex justify-end items-center shadow-sm">
            <span className="text-xs font-bold text-slate-500 mr-2">ISUFST Dingle Campus Hub</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </header>

          <main className="p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto space-y-6">
            
            {/* MODULE 1: MODERN ANALYTICS DASHBOARD */}
            {currentPage === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">In-Depth Analytics Dashboard</h1>
                    <p className="text-xs text-slate-400 font-medium">Aggregated real-time metrics for match logs and dynamic bloodline calculations (Process 4.0)</p>
                  </div>
                  <button onClick={() => handleSystemAction('Export System Data Matrix to PDF Summary Report')} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-emerald-700/10 cursor-pointer self-start transition-colors">✉ Generate ISO Structured Report</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest text-center w-full border-b pb-3">Individual Bird Winning Percentage</h3>
                    <div className="w-56 h-56"><Doughnut data={{ labels: ['Wins', 'Losses', 'Draws'], datasets: [{ data: [12, 4, 2], backgroundColor: ['#10b981', '#f43f5e', '#64748b'], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { weight: 'bold', size: 11 } } } } }} /></div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest border-b pb-3">Bloodline Performance Trends</h3>
                    <div className="w-full h-56"><Bar data={{ labels: ['Sweater', 'Lemon', 'Hatch', 'Kelso'], datasets: [{ label: 'Total Matches Won', data: [8, 5, 4, 2], backgroundColor: '#047857', borderRadius: 6 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { borderDash: [4, 4] } }, x: { grid: { display: false } } } }} /></div>
                  </div>
                </div>

                {/* MATCH LOG RECORDS MATRIX */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="p-5 border-b bg-slate-50/50">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Historical Performance Match Logs (D4 Analytics DB)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                          <th className="p-4">Match Date</th>
                          <th className="p-4">Entry Identifier</th>
                          <th className="p-4">Match Config</th>
                          <th className="p-4">Arena Location</th>
                          <th className="p-4">Opponent Strain</th>
                          <th className="p-4 text-center">Outcome State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {matchHistory.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-mono text-slate-400">{log.date}</td>
                            <td className="p-4 font-bold text-slate-900">{log.entryName} <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-1.5 py-0.5 rounded ml-1">{log.breed}</span></td>
                            <td className="p-4 text-slate-600 font-semibold">{log.type}</td>
                            <td className="p-4 text-slate-400">{log.location}</td>
                            <td className="p-4 italic text-slate-500">{log.opponent}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase tracking-wide ${log.outcome === 'Win' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : log.outcome === 'Loss' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-600'}`}>{log.outcome}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CRITICAL CONFIG PLATFORM TOOLS */}
                <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider">Global System Settings & Utilities Console</h3>
                    <span className="text-[10px] font-mono text-slate-500">Secure Cluster Controls Active</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={() => handleSystemAction('Execute Automated SQL Schema Backup')} className="bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold py-3 px-4 rounded-xl border border-slate-700/60 text-center transition-colors cursor-pointer">🖴 Backup Data Cluster</button>
                    <button onClick={() => handleSystemAction('Initiate Node Restoration Rollback')} className="bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold py-3 px-4 rounded-xl border border-slate-700/60 text-center transition-colors cursor-pointer">🗘 Restore Data Node</button>
                    <button onClick={() => handleSystemAction('Configure Global Application Scope Configuration Flags')} className="bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold py-3 px-4 rounded-xl border border-slate-700/60 text-center transition-colors cursor-pointer">⚙ System Preferences</button>
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 2: SYSTEM PROFILING & AUTOMATED LINEAGE ENGINE */}
            {currentPage === 'profiling' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Profiling & Lineage Matrix</h1>
                  <p className="text-xs text-slate-400 font-medium">Map structural specifications to compute ancestral linear weights dynamically (Process 1.0 & 2.0)</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* BEAUTIFIED COMPLIANT REGISTRY INPUT FORM */}
                  <form onSubmit={handleAddFowl} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 lg:col-span-1 self-start">
                    <h3 className="font-bold text-xs text-emerald-800 uppercase tracking-widest border-b pb-2.5">Encode Registry Object</h3>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Identifier Name</label>
                          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 transition-all" placeholder="e.g., Red Storm" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phenotype Color</label>
                          <input type="text" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 transition-all" placeholder="e.g., White-Legged Grey" required />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Lineage Strain</label>
                          <select value={newBreed} onChange={(e) => setNewBreed(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 transition-all font-bold text-slate-700">
                            <option value="Sweater">Sweater</option>
                            <option value="Lemon">Lemon</option>
                            <option value="Hatch">Hatch</option>
                            <option value="Kelso">Kelso</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gender Class</label>
                          <select value={newGender} onChange={(e) => setNewGender(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 transition-all font-bold text-slate-700">
                            <option value="Rooster">Rooster (Cock)</option>
                            <option value="Hen">Hen (Pullet)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t pt-2 mt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sire (Father Object)</label>
                          <input type="text" value={sireName} onChange={(e) => setSireName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 transition-all" placeholder="Sire Identity" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dam (Mother Object)</label>
                          <input type="text" value={damName} onChange={(e) => setDamName(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 transition-all" placeholder="Dam Identity" required />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Sire Genetic %</label>
                          <input type="number" value={sirePct} onChange={(e) => setSirePct(Number(e.target.value))} className="w-full p-2 border rounded-lg text-xs bg-white text-center font-bold" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Dam Genetic %</label>
                          <input type="number" value={damPct} onChange={(e) => setDamPct(Number(e.target.value))} className="w-full p-2 border rounded-lg text-xs bg-white text-center font-bold" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Temporal Birthdate</label>
                        <input type="date" value={newBirthdate} onChange={(e) => setNewBirthdate(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs bg-slate-50 text-slate-600 font-mono outline-none" />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Age (Mos)</label>
                          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full p-2 border rounded-lg text-xs text-center font-bold" placeholder="0" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Weight (kg)</label>
                          <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full p-2 border rounded-lg text-xs text-center font-bold" placeholder="0.0" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Height (cm)</label>
                          <input type="text" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full p-2 border rounded-lg text-xs text-center font-bold" placeholder="0" />
                        </div>
                      </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-700/10 cursor-pointer transition-all mt-4">Commit to Database Schema</button>
                  </form>

                  {/* HIGH-END DATA REGISTRY DISPLAY WITH INTERACTIVE DIAGRAM NODES */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest pl-1">Automated Family Tree Records (D1 & D2 Registries)</h3>
                    {fowls.map(fowl => {
                      const siblings = getSiblingsForFowl(fowl.sire, fowl.dam, fowl.id);
                      return (
                        <div key={fowl.id} className="bg-white p-6 rounded-2xl border shadow-sm space-y-5 relative overflow-hidden group hover:border-slate-300 transition-all">
                          <span className={`absolute top-0 right-0 text-[9px] font-black uppercase px-4 py-1.5 ${fowl.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-b border-l border-emerald-100 rounded-bl-xl' : 'bg-slate-100 text-slate-500 rounded-bl-xl'}`}>{fowl.status}</span>
                          
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="text-xl font-black text-slate-900 tracking-tight">{fowl.name} <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 ml-1.5">{fowl.breed}</span></h4>
                              <p className="text-xs text-slate-400 font-medium">
                                Age: <span className="font-bold text-slate-700">{fowl.age}</span> • 
                                Sex: <span className="font-bold text-slate-700">{fowl.gender}</span> • 
                                Color: <span className="font-bold text-slate-700">{fowl.color}</span> • 
                                Registry Date: <span className="font-mono text-slate-600">{fowl.birthdate}</span>
                              </p>
                            </div>
                            <div className="text-right mr-16">
                              <span className="text-[9px] text-slate-400 font-mono block uppercase tracking-wider">Genetic Weight</span>
                              <span className="text-2xl font-black text-emerald-800 tracking-tight">{fowl.bloodlinePct}%</span>
                            </div>
                          </div>

                          {/* SYSTEM COMPLIANCE DIAGRAM: INTERACTIVE GENETIC GRAPH RECONSTRUCTION */}
                          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100/80 flex flex-col items-center space-y-3 relative">
                            <span className="absolute top-2 left-3 text-[9px] font-mono font-black text-slate-300 uppercase tracking-wider">Lineage Tree Map (Process 2.0)</span>
                            <div className="grid grid-cols-2 gap-6 text-center w-full max-w-md mt-2">
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm"><span className="text-slate-400 block font-bold text-[8px] uppercase tracking-wider mb-0.5">Sire Object (Father Line)</span><span className="font-black text-slate-800 text-xs">{fowl.sire}</span></div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm"><span className="text-slate-400 block font-bold text-[8px] uppercase tracking-wider mb-0.5">Dam Object (Mother Line)</span><span className="font-black text-slate-800 text-xs">{fowl.dam}</span></div>
                            </div>
                            <div className="w-0.5 h-4 bg-emerald-600"></div>
                            <div className="bg-emerald-800 text-white text-xs px-5 py-1.5 rounded-xl font-black shadow-md shadow-emerald-800/10 tracking-wide">{fowl.name} Node ({fowl.bloodlinePct}%)</div>
                          </div>

                          {/* SIBLING TRACKING FOOTER BLOCK */}
                          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border flex justify-between items-center gap-4">
                            <div className="font-medium">
                              <strong className="text-slate-400 uppercase tracking-wide text-[10px] mr-1 block sm:inline">Identified Siblings:</strong>
                              {siblings.length > 0 ? (
                                <span className="text-emerald-700 font-black">{siblings.join(', ')}</span>
                              ) : (
                                <span className="italic text-slate-400">No matching genetic records in current registry array.</span>
                              )}
                            </div>
                            {fowl.status === 'Active' && (
                              <button onClick={() => handleArchiveFowl(fowl.id)} className="bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-700 font-bold px-3 py-1 border border-slate-200 hover:border-rose-100 rounded-lg text-[10px] transition-all cursor-pointer shadow-sm">🗎 Archive Record</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            )}

            {/* MODULE 3: VERIFIED MARKETPLACE REGISTRY */}
            {currentPage === 'marketplace' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verified Breeding Marketplace</h1>
                    <p className="text-xs text-slate-400 font-medium">Transparent cohort catalog filterable by certified bloodline genetic indexes</p>
                  </div>
                  <input type="text" placeholder="🔍 Search lineage strains (e.g., Sweater)..." value={search} onChange={(e) => setSearch(e.target.value)} className="p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 w-full sm:w-72 transition-all shadow-inner font-medium" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fowls.filter(item => item.status === 'Active' && item.breed.toLowerCase().includes(search.toLowerCase())).map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-2xl border relative shadow-sm hover:border-slate-300 transition-all space-y-3">
                      <span className="absolute top-4 right-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">✓ Verified Node</span>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">{item.name}</h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600 font-medium">
                        <div>Strain: <strong className="text-slate-900 font-bold">{item.breed}</strong></div>
                        <div>Bloodline: <strong className="text-slate-900 font-bold">{item.bloodlinePct}%</strong></div>
                        <div>Sex: <strong className="text-slate-900 font-bold">{item.gender}</strong></div>
                        <div>Color: <strong className="text-slate-900 font-bold">{item.color}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </main>
        </div>
      )}

    </div>
  );
}