import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Machine, System, MachineType, SignalNomenclature, Infrastructure, Resolution } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { 
  Plus, 
  Trash2, 
  Cpu, 
  Layers, 
  Monitor, 
  CheckCircle2, 
  XCircle, 
  Settings,
  Link as LinkIcon,
  Unlink,
  AlertCircle,
  ChevronRight,
  Database,
  ArrowRightLeft,
  Server,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const SystemManager = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [infrastructure, setInfrastructure] = useState<Infrastructure | null>(null);
  const [activeTab, setActiveTab] = useState<'machines' | 'systems' | 'infrastructure'>('systems');
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  
  const [machineTypeFilter, setMachineTypeFilter] = useState<string>('All');
  const [machineStatusFilter, setMachineStatusFilter] = useState<string>('All');

  useEffect(() => {
    const qMachines = query(collection(db, 'machines'));
    const unsubscribeMachines = onSnapshot(qMachines, (snapshot) => {
      const fetchedMachines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine));
      fetchedMachines.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      setMachines(fetchedMachines);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'machines');
    });

    const qSystems = query(collection(db, 'systems'));
    const unsubscribeSystems = onSnapshot(qSystems, (snapshot) => {
      const fetchedSystems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as System));
      fetchedSystems.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      setSystems(fetchedSystems);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'systems');
    });

    const unsubscribeInfra = onSnapshot(collection(db, 'infrastructure'), (snapshot) => {
      if (!snapshot.empty) {
        setInfrastructure({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Infrastructure);
      } else {
        // Initialize default infra
        const defaultInfra: Omit<Infrastructure, 'id'> = {
          tielines: { m1ToM2: 8, m2ToM1: 8 },
          matrixNames: { m1: 'Matrix 1 (Acarpet)', m2: 'Matrix 2 (Atgi)' },
          splittingRules: { startPort: 33, endPort: 95, matrix: 'Matrix 1' }
        };
        addDoc(collection(db, 'infrastructure'), defaultInfra).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, 'infrastructure');
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'infrastructure');
    });

    return () => {
      unsubscribeMachines();
      unsubscribeSystems();
      unsubscribeInfra();
    };
  }, []);

  const handleToggleMachineAvailability = async (machine: Machine) => {
    try {
      await updateDoc(doc(db, 'machines', machine.id), {
        isAvailable: !machine.isAvailable
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `machines/${machine.id}`);
    }
  };

  const handleToggleSystemAvailability = async (system: System) => {
    try {
      await updateDoc(doc(db, 'systems', system.id), {
        isAvailable: !system.isAvailable
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `systems/${system.id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">System & Inventory</h2>
          <p className="text-slate-500 text-sm">Manage your production systems and hardware units.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('systems')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === 'systems' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Systems
          </button>
          <button
            onClick={() => setActiveTab('machines')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === 'machines' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Machines
          </button>
          <button
            onClick={() => setActiveTab('infrastructure')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === 'infrastructure' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Infrastructure
          </button>
        </div>
      </div>

      {activeTab === 'systems' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => {
              setEditingSystem(null);
              setIsSystemModalOpen(true);
            }}
            className="h-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all group"
          >
            <div className="p-3 bg-slate-50 rounded-full group-hover:bg-blue-100 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="font-bold uppercase tracking-widest text-xs">Create New System</span>
          </button>

          { (systems || []).map(system => (
            <div key={system.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="p-5 border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleSystemAvailability(system)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                        system.isAvailable 
                          ? "bg-green-50 text-green-700 border-green-100" 
                          : "bg-red-50 text-red-700 border-red-100"
                      )}
                    >
                      {system.isAvailable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {system.isAvailable ? 'Operational' : 'Unavailable'}
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingSystem(system);
                      setIsSystemModalOpen(true);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1">{system.name}</h3>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">{system.signalNomenclature}</span>
                  <div className="flex gap-1">
                    {(Array.isArray(system.resolution) ? system.resolution : [system.resolution || 'HD']).map(res => (
                      <span key={res} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">{res}</span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {system.videoMatrix}
                  </span>
                </div>
              </div>
              <div className="p-5 bg-slate-50/50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Assigned Machines</span>
                    <span>{Array.from(new Set(system.machineIds || [])).length} Units</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(system.machineIds || [])).map(mId => {
                      const machine = machines.find(m => m.id === mId);
                      if (!machine) return null;
                      return (
                        <div key={mId} className="flex items-center justify-between gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">
                          <div className="flex items-center gap-1.5">
                            {machine.type === 'Tracer' && <Cpu className="w-3 h-3 text-purple-500" />}
                            {machine.type === 'Integrator' && <Layers className="w-3 h-3 text-amber-500" />}
                            {machine.type === 'Renderer' && <Monitor className="w-3 h-3 text-emerald-500" />}
                            {machine.name}
                            {machine.type === 'Renderer' && machine.instances && machine.instances > 1 && (
                              <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase">
                                {machine.instances}x Inst
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "text-[8px] px-1 rounded uppercase font-black",
                              (system.mainMachineIds || []).includes(mId) ? "bg-blue-100 text-blue-700" :
                              (system.backupMachineIds || []).includes(mId) ? "bg-purple-100 text-purple-700" :
                              "bg-slate-100 text-slate-500"
                            )}>
                              {(system.mainMachineIds || []).includes(mId) ? 'Main' :
                               (system.backupMachineIds || []).includes(mId) ? 'Bck' : 'Unassigned'}
                            </span>
                            <span className={cn(
                              "text-[8px] px-1 rounded",
                              machine.matrix === 'Matrix 1' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            )}>
                              {machine.matrix === 'Matrix 1' ? 'M1' : 'M2'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'machines' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Hardware Inventory</h3>
            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={machineTypeFilter}
                onChange={(e) => setMachineTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="All">All Types</option>
                <option value="Tracer">Tracer</option>
                <option value="Integrator">Integrator</option>
                <option value="Renderer">Renderer</option>
              </select>
              <select 
                value={machineStatusFilter}
                onChange={(e) => setMachineStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
              </select>
              <button
                onClick={() => {
                  setEditingMachine(null);
                  setIsMachineModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Plus className="w-4 h-4" />
                Add Machine
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Machine Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Res</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matrix</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ports (I/O)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">System</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Constraints</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(machines || []).filter(machine => {
                  if (machineTypeFilter !== 'All' && machine.type !== machineTypeFilter) return false;
                  if (machineStatusFilter === 'Available' && !machine.isAvailable) return false;
                  if (machineStatusFilter === 'Unavailable' && machine.isAvailable) return false;
                  return true;
                }).map(machine => {
                  const assignedSystem = (systems || []).find(s => (s.machineIds || []).includes(machine.id));
                  return (
                    <tr key={machine.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleToggleMachineAvailability(machine)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                            machine.isAvailable 
                              ? "bg-green-50 text-green-700 border-green-100" 
                              : "bg-red-50 text-red-700 border-red-100"
                          )}
                        >
                          {machine.isAvailable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {machine.isAvailable ? 'Available' : 'Unavailable'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">{machine.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-1.5 rounded-lg",
                            machine.type === 'Tracer' ? "bg-purple-50 text-purple-600" :
                            machine.type === 'Integrator' ? "bg-amber-50 text-amber-600" :
                            "bg-emerald-50 text-emerald-600"
                          )}>
                            {machine.type === 'Tracer' && <Cpu className="w-3.5 h-3.5" />}
                            {machine.type === 'Integrator' && <Layers className="w-3.5 h-3.5" />}
                            {machine.type === 'Renderer' && <Monitor className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{machine.type}</span>
                          {machine.type === 'Renderer' && machine.instances && machine.instances > 1 && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase">
                              {machine.instances}x Inst
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(machine.resolution || []).map(res => (
                            <span key={res} className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                              {res}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest",
                          machine.matrix === 'Matrix 1' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
                        )}>
                          {machine.matrix}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-bold text-slate-600 flex flex-col gap-1">
                          {machine.inputs && machine.inputs.length > 0 ? (
                            <div>IN: {machine.inputs.map(p => `${p.label}(${p.port})`).join(', ')}</div>
                          ) : <div>IN: -</div>}
                          {machine.outputs && machine.outputs.length > 0 ? (
                            <div>OUT: {machine.outputs.map(p => `${p.label}(${p.port})`).join(', ')}</div>
                          ) : <div>OUT: -</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {assignedSystem ? (
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                            {assignedSystem.name}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {machine.linkedMachineIds && (machine.linkedMachineIds || []).length > 0 ? (
                            <div className="flex items-center gap-1 text-blue-500">
                              <LinkIcon className="w-3 h-3" />
                              <span className="text-[10px] font-bold">{(machine.linkedMachineIds || []).length} Linked</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 uppercase">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingMachine(machine);
                              setIsMachineModalOpen(true);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setMachineToDelete(machine)}
                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <Server className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-slate-900 uppercase tracking-tight">Matrix Configuration</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Matrix 1 Name</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    value={infrastructure?.matrixNames.m1 || ''}
                    onChange={async (e) => {
                      if (infrastructure) {
                        try {
                          await updateDoc(doc(db, 'infrastructure', infrastructure.id), {
                            'matrixNames.m1': e.target.value
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `infrastructure/${infrastructure.id}`);
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Matrix 2 Name</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    value={infrastructure?.matrixNames.m2 || ''}
                    onChange={async (e) => {
                      if (infrastructure) {
                        try {
                          await updateDoc(doc(db, 'infrastructure', infrastructure.id), {
                            'matrixNames.m2': e.target.value
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `infrastructure/${infrastructure.id}`);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-slate-900 uppercase tracking-tight">Tieline & Splitting</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">M1 → M2 (Cross-Matrix)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                      value={infrastructure?.tielines.m1ToM2 || 0}
                      onChange={async (e) => {
                        if (infrastructure) {
                          try {
                            await updateDoc(doc(db, 'infrastructure', infrastructure.id), {
                              'tielines.m1ToM2': parseInt(e.target.value) || 0
                            });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, `infrastructure/${infrastructure.id}`);
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">M2 → M1 (Cross-Matrix)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                      value={infrastructure?.tielines.m2ToM1 || 0}
                      onChange={async (e) => {
                        if (infrastructure) {
                          try {
                            await updateDoc(doc(db, 'infrastructure', infrastructure.id), {
                              'tielines.m2ToM1': parseInt(e.target.value) || 0
                            });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, `infrastructure/${infrastructure.id}`);
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Output Splitting Rules (Carpet)</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Start Port</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                      value={infrastructure?.splittingRules?.startPort || 0}
                      onChange={async (e) => {
                        if (infrastructure) {
                          await updateDoc(doc(db, 'infrastructure', infrastructure.id), {
                            'splittingRules.startPort': parseInt(e.target.value) || 0
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">End Port</label>
                    <input 
                      type="number"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                      value={infrastructure?.splittingRules?.endPort || 0}
                      onChange={async (e) => {
                        if (infrastructure) {
                          await updateDoc(doc(db, 'infrastructure', infrastructure.id), {
                            'splittingRules.endPort': parseInt(e.target.value) || 0
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Matrix</label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                      value={infrastructure?.splittingRules?.matrix || 'Matrix 1'}
                      onChange={async (e) => {
                        if (infrastructure) {
                          await updateDoc(doc(db, 'infrastructure', infrastructure.id), {
                            'splittingRules.matrix': e.target.value
                          });
                        }
                      }}
                    >
                      <option value="Matrix 1">Matrix 1</option>
                      <option value="Matrix 2">Matrix 2</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-[10px] font-medium text-blue-800 leading-relaxed">
                  Tielines are used for cross-matrix signals. Splitting rules define where outputs are automatically duplicated (e.g. Carpet 33 → 34).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Machine Modal */}
      <AnimatePresence>
        {isMachineModalOpen && (
          <MachineModal 
            machine={editingMachine} 
            allMachines={machines}
            onClose={() => setIsMachineModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* System Modal */}
      <AnimatePresence>
        {isSystemModalOpen && (
          <SystemModal 
            system={editingSystem} 
            availableMachines={machines}
            onClose={() => setIsSystemModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {machineToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4 text-red-600">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Delete Machine</h3>
                </div>
                <p className="text-slate-600 mb-6">
                  Are you sure you want to delete <span className="font-bold text-slate-900">{machineToDelete.name}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setMachineToDelete(null)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deleteDoc(doc(db, 'machines', machineToDelete.id));
                        setMachineToDelete(null);
                      } catch (err) {
                        handleFirestoreError(err, OperationType.DELETE, `machines/${machineToDelete.id}`);
                      }
                    }}
                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Delete Machine
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MachineModal = ({ machine, allMachines, onClose }: { machine: Machine | null, allMachines: Machine[], onClose: () => void }) => {
  const [formData, setFormData] = useState({
    name: machine?.name || '',
    type: machine?.type || 'Tracer' as MachineType,
    isAvailable: machine?.isAvailable ?? true,
    notes: machine?.notes || '',
    linkedMachineIds: machine?.linkedMachineIds || [],
    matrix: machine?.matrix || 'Matrix 1' as 'Matrix 1' | 'Matrix 2',
    resolution: machine?.resolution || ['HD'] as Resolution[],
    supportsMulticam: machine?.supportsMulticam || false,
    instances: machine?.instances || 1,
    inputs: machine?.inputs || [],
    outputs: machine?.outputs || []
  });

  const addPort = (type: 'inputs' | 'outputs') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { id: Math.random().toString(36).substring(7), label: '', port: 1 }]
    }));
  };

  const updatePort = (type: 'inputs' | 'outputs', id: string, field: 'label' | 'port', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((p: any) => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const removePort = (type: 'inputs' | 'outputs', id: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((p: any) => p.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== undefined)
      );
      
      if (machine) {
        await updateDoc(doc(db, 'machines', machine.id), cleanData);
      } else {
        await addDoc(collection(db, 'machines'), cleanData);
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, machine ? OperationType.UPDATE : OperationType.CREATE, 'machines');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            {machine ? 'Edit Machine' : 'Add New Machine'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Machine Name</label>
              <input 
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. TR-01"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Supported Resolutions</label>
              <div className="flex gap-2">
                {(['HD', 'UHD'] as const).map(res => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => {
                      const currentRes = formData.resolution || [];
                      const resList = currentRes.includes(res)
                        ? currentRes.filter(r => r !== res)
                        : [...currentRes, res];
                      setFormData({ ...formData, resolution: resList });
                    }}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      (formData.resolution || []).includes(res)
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 opacity-0">Filler</label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Input Ports</label>
                  <button type="button" onClick={() => addPort('inputs')} className="text-xs text-blue-600 font-bold hover:text-blue-700">+ Add</button>
                </div>
                <div className="space-y-2">
                  {formData.inputs.map(port => (
                    <div key={port.id} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Label (e.g. CK)" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                        value={port.label}
                        onChange={e => updatePort('inputs', port.id, 'label', e.target.value)}
                      />
                      <input 
                        type="number" 
                        placeholder="Port" 
                        className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                        value={port.port || ''}
                        onChange={e => updatePort('inputs', port.id, 'port', parseInt(e.target.value) || 0)}
                      />
                      <button type="button" onClick={() => removePort('inputs', port.id)} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.inputs.length === 0 && <div className="text-xs text-slate-400 italic">No input ports defined</div>}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Output Ports</label>
                  <button type="button" onClick={() => addPort('outputs')} className="text-xs text-blue-600 font-bold hover:text-blue-700">+ Add</button>
                </div>
                <div className="space-y-2">
                  {formData.outputs.map(port => (
                    <div key={port.id} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Label (e.g. Fill)" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                        value={port.label}
                        onChange={e => updatePort('outputs', port.id, 'label', e.target.value)}
                      />
                      <input 
                        type="number" 
                        placeholder="Port" 
                        className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                        value={port.port || ''}
                        onChange={e => updatePort('outputs', port.id, 'port', parseInt(e.target.value) || 0)}
                      />
                      <button type="button" onClick={() => removePort('outputs', port.id)} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.outputs.length === 0 && <div className="text-xs text-slate-400 italic">No output ports defined</div>}
                </div>
              </div>
            </div>
            {formData.type === 'Renderer' && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Hardware Instances (Outputs)</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  value={formData.instances}
                  onChange={e => setFormData({ ...formData, instances: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Machine Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Tracer', 'Integrator', 'Renderer'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    className={cn(
                      "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.type === type 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Assigned Matrix</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Matrix 1', 'Matrix 2'] as const).map(matrix => (
                    <button
                      key={matrix}
                      type="button"
                      onClick={() => setFormData({ ...formData, matrix })}
                      className={cn(
                        "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                        formData.matrix === matrix 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                          : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                      )}
                    >
                      {matrix}
                    </button>
                  ))}
                </div>
              </div>

              {formData.type === 'Integrator' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Multicam Support</label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox"
                        checked={formData.supportsMulticam}
                        onChange={e => setFormData({ ...formData, supportsMulticam: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:border-purple-600 peer-checked:bg-purple-600 transition-colors"></div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">Supports Multicam</span>
                      <span className="text-[10px] text-slate-500 font-medium block leading-tight">Can process &gt;1 camera</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Linked Machines (Constraints)</label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {(allMachines || []).filter(m => m.id !== machine?.id).map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group">
                    <input 
                      type="checkbox"
                      checked={(formData.linkedMachineIds || []).includes(m.id)}
                      onChange={e => {
                        const currentLinked = formData.linkedMachineIds || [];
                        const ids = e.target.checked 
                          ? [...currentLinked, m.id]
                          : currentLinked.filter(id => id !== m.id);
                        setFormData({ ...formData, linkedMachineIds: ids });
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{m.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{m.type}</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Linked machines will be recommended together.
              </p>
            </div>
          </div>
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
            <button
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
            >
              {machine ? 'Update Machine' : 'Create Machine'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const SystemModal = ({ system, availableMachines, onClose }: { system: System | null, availableMachines: Machine[], onClose: () => void }) => {
  const [machineSearch, setMachineSearch] = useState('');
  const [formData, setFormData] = useState({
    name: system?.name || '',
    signalNomenclature: system?.signalNomenclature || 'Acarpet/Carpet' as SignalNomenclature,
    videoMatrix: system?.videoMatrix || 'Matrix 1' as 'Matrix 1' | 'Matrix 2',
    machineIds: system?.machineIds || [],
    mainMachineIds: system?.mainMachineIds || [],
    backupMachineIds: system?.backupMachineIds || [],
    isAvailable: system?.isAvailable ?? true,
    resolution: (Array.isArray(system?.resolution) ? system?.resolution : (system?.resolution ? [system.resolution] : ['HD'])) as Resolution[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanData = Object.fromEntries(
        Object.entries({
          ...formData,
          machineIds: Array.from(new Set(formData.machineIds || [])),
          mainMachineIds: Array.from(new Set(formData.mainMachineIds || [])),
          backupMachineIds: Array.from(new Set(formData.backupMachineIds || []))
        }).filter(([_, v]) => v !== undefined)
      );

      if (system) {
        await updateDoc(doc(db, 'systems', system.id), cleanData);
      } else {
        await addDoc(collection(db, 'systems'), cleanData);
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, system ? OperationType.UPDATE : OperationType.CREATE, 'systems');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            {system ? 'Edit System' : 'Configure New System'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">System Name</label>
              <input 
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. System Alpha"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">System Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                {(['HD', 'UHD'] as const).map(res => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => {
                      const currentRes = formData.resolution || [];
                      const resList = currentRes.includes(res)
                        ? currentRes.filter(r => r !== res)
                        : [...currentRes, res];
                      setFormData({ ...formData, resolution: resList });
                    }}
                    className={cn(
                      "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      (formData.resolution || []).includes(res)
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Signal Nomenclature</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Acarpet/Carpet', 'Atgi/Tgi'] as const).map(nom => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setFormData({ ...formData, signalNomenclature: nom })}
                    className={cn(
                      "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.signalNomenclature === nom 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {nom}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Primary Video Matrix</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Matrix 1', 'Matrix 2'] as const).map(matrix => (
                  <button
                    key={matrix}
                    type="button"
                    onClick={() => setFormData({ ...formData, videoMatrix: matrix })}
                    className={cn(
                      "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.videoMatrix === matrix 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    )}
                  >
                    {matrix}
                  </button>
                ))}
              </div>
              <p className="text-[8px] text-slate-400 mt-2 italic">
                Note: Backup signals will be automatically routed to the alternate matrix for redundancy.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Assign Machines</label>
            </div>
            <div className="mb-2">
              <input 
                type="text" 
                placeholder="Search machines by name, type, or matrix..." 
                value={machineSearch}
                onChange={e => setMachineSearch(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {(availableMachines || []).filter(m => 
                m.name.toLowerCase().includes(machineSearch.toLowerCase()) ||
                m.type.toLowerCase().includes(machineSearch.toLowerCase()) ||
                m.matrix.toLowerCase().includes(machineSearch.toLowerCase())
              ).map(m => {
                const isSelected = (formData.machineIds || []).includes(m.id);
                const isMain = (formData.mainMachineIds || []).includes(m.id);
                const isBck = (formData.backupMachineIds || []).includes(m.id);
                const isSpare = (formData.spareMachineIds || []).includes(m.id);

                return (
                <div key={m.id} className={cn("flex items-center gap-3 p-3 bg-white border rounded-xl transition-all group", isSelected ? "border-blue-300 shadow-sm" : "border-slate-100 hover:border-blue-200")}>
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={e => {
                      if (e.target.checked) {
                        setFormData({ 
                          ...formData, 
                          machineIds: Array.from(new Set([...(formData.machineIds || []), m.id]))
                        });
                      } else {
                        setFormData({ 
                          ...formData, 
                          machineIds: (formData.machineIds || []).filter(id => id !== m.id),
                          mainMachineIds: (formData.mainMachineIds || []).filter(id => id !== m.id),
                          backupMachineIds: (formData.backupMachineIds || []).filter(id => id !== m.id),
                          spareMachineIds: (formData.spareMachineIds || []).filter(id => id !== m.id)
                        });
                      }
                    }}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{m.name}</span>
                        <span className={cn(
                          "text-[8px] font-bold uppercase",
                          m.matrix === 'Matrix 1' ? "text-blue-500" : "text-purple-500"
                        )}>
                          {m.matrix}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                        m.type === 'Tracer' ? "bg-purple-100 text-purple-700" :
                        m.type === 'Integrator' ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      )}>
                        {m.type}
                      </span>
                    </div>
                    {!m.isAvailable && (
                      <span className="text-[8px] font-bold text-red-500 uppercase">Unavailable</span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          const newMain = Array.from(new Set([...(formData.mainMachineIds || []), m.id]));
                          const newBackup = (formData.backupMachineIds || []).filter(id => id !== m.id);
                          const newSpare = (formData.spareMachineIds || []).filter(id => id !== m.id);
                          setFormData({ ...formData, mainMachineIds: newMain, backupMachineIds: newBackup, spareMachineIds: newSpare });
                        }}
                        className={cn("px-2 py-1 text-[8px] font-bold uppercase rounded transition-all", isMain ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200")}
                      >
                        Main
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newBackup = Array.from(new Set([...(formData.backupMachineIds || []), m.id]));
                          const newMain = (formData.mainMachineIds || []).filter(id => id !== m.id);
                          const newSpare = (formData.spareMachineIds || []).filter(id => id !== m.id);
                          setFormData({ ...formData, mainMachineIds: newMain, backupMachineIds: newBackup, spareMachineIds: newSpare });
                        }}
                        className={cn("px-2 py-1 text-[8px] font-bold uppercase rounded transition-all", isBck ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200")}
                      >
                        Bck
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newSpare = Array.from(new Set([...(formData.spareMachineIds || []), m.id]));
                          const newMain = (formData.mainMachineIds || []).filter(id => id !== m.id);
                          const newBackup = (formData.backupMachineIds || []).filter(id => id !== m.id);
                          setFormData({ ...formData, mainMachineIds: newMain, backupMachineIds: newBackup, spareMachineIds: newSpare });
                        }}
                        className={cn("px-2 py-1 text-[8px] font-bold uppercase rounded transition-all", isSpare ? "bg-amber-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200")}
                      >
                        Spare
                      </button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>

          {(formData.mainMachineIds && formData.mainMachineIds.length > 0 || formData.backupMachineIds && formData.backupMachineIds.length > 0) ? (
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Selected Machines Order (Carpet Priority)</label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-black text-blue-600 uppercase mb-2">Main Hardware</h4>
                  <div className="space-y-1">
                    {(formData.mainMachineIds || []).map((mId, index) => {
                      const m = availableMachines.find(x => x.id === mId);
                      if (!m) return null;
                      return (
                        <div key={mId} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
                          <span className="text-xs font-bold">{m.name} <span className="text-[8px] font-normal text-slate-400 uppercase">({m.type})</span></span>
                          <div className="flex gap-2">
                            <button type="button" disabled={index === 0} onClick={() => {
                              const arr = [...formData.mainMachineIds!];
                              [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                              // also mirror to machineIds to maintain global order if possible, though SystemCard relies on Set
                              const newMachineIds = Array.from(new Set([...arr, ...(formData.backupMachineIds || [])]));
                              setFormData({ ...formData, mainMachineIds: arr, machineIds: newMachineIds });
                            }} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                            <button type="button" disabled={index === formData.mainMachineIds!.length - 1} onClick={() => {
                              const arr = [...formData.mainMachineIds!];
                              [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
                              const newMachineIds = Array.from(new Set([...arr, ...(formData.backupMachineIds || [])]));
                              setFormData({ ...formData, mainMachineIds: arr, machineIds: newMachineIds });
                            }} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-purple-600 uppercase mb-2">Backup Hardware</h4>
                  <div className="space-y-1">
                    {(formData.backupMachineIds || []).map((mId, index) => {
                      const m = availableMachines.find(x => x.id === mId);
                      if (!m) return null;
                      return (
                        <div key={mId} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
                          <span className="text-xs font-bold">{m.name} <span className="text-[8px] font-normal text-slate-400 uppercase">({m.type})</span></span>
                          <div className="flex gap-2">
                            <button type="button" disabled={index === 0} onClick={() => {
                              const arr = [...formData.backupMachineIds!];
                              [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                              const newMachineIds = Array.from(new Set([...(formData.mainMachineIds || []), ...arr]));
                              setFormData({ ...formData, backupMachineIds: arr, machineIds: newMachineIds });
                            }} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-purple-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                            <button type="button" disabled={index === formData.backupMachineIds!.length - 1} onClick={() => {
                              const arr = [...formData.backupMachineIds!];
                              [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
                              const newMachineIds = Array.from(new Set([...(formData.mainMachineIds || []), ...arr]));
                              setFormData({ ...formData, backupMachineIds: arr, machineIds: newMachineIds });
                            }} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-purple-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              {/* SPARE LIST HERE */}
              {formData.spareMachineIds && formData.spareMachineIds.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-[10px] font-black text-amber-600 uppercase mb-2">Spare Hardware</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      {(formData.spareMachineIds || []).map((mId, index) => {
                        const m = availableMachines.find(x => x.id === mId);
                        if (!m) return null;
                        return (
                          <div key={mId} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg">
                            <span className="text-xs font-bold">{m.name} <span className="text-[8px] font-normal text-slate-400 uppercase">({m.type})</span></span>
                            <div className="flex gap-2">
                              <button type="button" disabled={index === 0} onClick={() => {
                                const arr = [...formData.spareMachineIds!];
                                [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                                const newMachineIds = Array.from(new Set([...(formData.mainMachineIds || []), ...(formData.backupMachineIds || []), ...arr]));
                                setFormData({ ...formData, spareMachineIds: arr, machineIds: newMachineIds });
                              }} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-500 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                              <button type="button" disabled={index === formData.spareMachineIds!.length - 1} onClick={() => {
                                const arr = [...formData.spareMachineIds!];
                                [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
                                const newMachineIds = Array.from(new Set([...(formData.mainMachineIds || []), ...(formData.backupMachineIds || []), ...arr]));
                                setFormData({ ...formData, spareMachineIds: arr, machineIds: newMachineIds });
                              }} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-500 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
            <button
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
            >
              {system ? 'Update System Config' : 'Initialize System'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
