import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './Auth';
import { SystemManager } from './SystemManager';
import { CreateUserModal } from './CreateUserModal';
import { BroadcastEvent, EventStatus, EventType, EventLog, LogActor, Machine, System, Infrastructure, Resolution } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { getRecommendedSystems, RecSystem } from '../lib/recommendations';
import { 
  Plus, 
  Minus,
  Shield,
  LayoutGrid, 
  List as ListIcon, 
  Calendar, 
  Filter, 
  Search, 
  MoreVertical,
  Clock,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Cpu,
  Layers,
  Monitor,
  Box,
  Globe,
  MapPin,
  Upload,
  Image as ImageIcon,
  X,
  Settings,
  ArrowRightLeft,
  AlertTriangle,
  Download,
  ChevronDown,
  Star,
  Trash2
} from 'lucide-react';
import tzlookup from 'tz-lookup';
import { format, isSameDay, startOfDay, endOfDay, addDays, subDays, eachDayOfInterval, startOfWeek, endOfWeek, differenceInDays, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { enUS } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import logo from '../logo.png';
import tgiLogo from '../TGISport_Black.png';
import coverWorkorder from '../CoverWorkorder.png';
type ViewMode = 'list' | 'gantt' | 'cards';
export const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'events' | 'systems'>('events');
  const [events, setEvents] = useState<BroadcastEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BroadcastEvent | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<EventType | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'All'>('All');
  const [filterSport, setFilterSport] = useState<string>('All');
  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastEvent));
      setEvents(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
    return unsubscribe;
  }, []);
  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                         e.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || e.type === filterType;
    const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
    const matchesSport = filterSport === 'All' || e.sport === filterSport;
    return matchesSearch && matchesType && matchesStatus && matchesSport;
  });
  const sportsList = Array.from(new Set(events.map(e => e.sport).filter(Boolean))) as string[];
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-5">
          <img 
            src={tgiLogo} 
            alt="TGI Sport" 
            className="h-8 w-auto object-contain opacity-90"
            referrerPolicy="no-referrer"
          />
          <div className="h-8 w-px bg-slate-300 hidden sm:block" />
          <img 
            src={logo} 
            alt="OmniLive Logo" 
            className="h-10 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setCurrentView('events')}
              className={cn(
                "px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                currentView === 'events' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Events
            </button>
            <button 
              onClick={() => setCurrentView('systems')}
              className={cn(
                "px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                currentView === 'systems' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Systems
            </button>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          {currentView === 'events' && (
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('cards')}
                className={cn("p-2 rounded-md transition-all", viewMode === 'cards' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('gantt')}
                className={cn("p-2 rounded-md transition-all", viewMode === 'gantt' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{profile?.displayName || profile?.email}</p>
              <div className="flex items-center gap-2 justify-end">
                <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
                {profile?.role === 'admin' && (
                  <button 
                    onClick={() => setIsCreateUserModalOpen(true)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase hover:underline"
                  >
                    + Add User
                  </button>
                )}
              </div>
            </div>
            <button 
              onClick={() => signOut()}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="flex-1 p-6 w-full space-y-6">
        {currentView === 'events' ? (
          <>
            {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search events..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
            >
              <option value="All">All Sports</option>
              {sportsList.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
            <select 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="All">All Types</option>
              <option value="Live Event">Live Event</option>
              <option value="POC">POC</option>
            </select>
            <select 
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="All">All Statuses</option>
              <option value="TBC">TBC</option>
              <option value="Confirmed-In progress">Confirmed-In progress</option>
              <option value="Confirmed-Ready for live">Confirmed-Ready for live</option>
              <option value="Live">Live</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <button 
            onClick={() => { setEditingEvent(null); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
        {/* Views */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'cards' && <CardsView events={filteredEvents} onEdit={(e) => { setEditingEvent(e); setIsModalOpen(true); }} />}
            {viewMode === 'list' && <ListView events={filteredEvents} onEdit={(e) => { setEditingEvent(e); setIsModalOpen(true); }} />}
            {viewMode === 'gantt' && <GanttView events={filteredEvents} onEdit={(e) => { setEditingEvent(e); setIsModalOpen(true); }} />}
          </motion.div>
        </AnimatePresence>
          </>
        ) : (
          <SystemManager />
        )}
      </main>
      {/* Modal */}
      {isModalOpen && (
        <EventModal 
          event={editingEvent} 
          existingSports={sportsList}
          allEvents={events}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
      {isCreateUserModalOpen && (
        <CreateUserModal onClose={() => setIsCreateUserModalOpen(false)} />
      )}
    </div>
  );
};
const StatusBadge = ({ status }: { status: EventStatus }) => {
  const styles = {
    'TBC': 'bg-slate-100 text-slate-700 border-slate-200',
    'Confirmed-In progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Confirmed-Ready for live': 'bg-orange-100 text-orange-700 border-orange-200',
    'Live': 'bg-red-100 text-red-700 border-red-200 animate-pulse',
    'Done': 'bg-green-100 text-green-700 border-green-200'
  };
  const icons = {
    'TBC': <Clock className="w-3 h-3" />,
    'Confirmed-In progress': <Loader2 className="w-3 h-3 animate-spin" />,
    'Confirmed-Ready for live': <CheckCircle2 className="w-3 h-3" />,
    'Live': <PlayCircle className="w-3 h-3" />,
    'Done': <CheckCircle2 className="w-3 h-3" />
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 w-fit", styles[status])}>
      {icons[status]}
      {status}
    </span>
  );
};
const TypeBadge = ({ type }: { type: EventType }) => {
  const styles = {
    'Live Event': 'bg-red-50 text-red-600',
    'POC': 'bg-yellow-50 text-yellow-600'
  };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest", styles[type])}>
      {type}
    </span>
  );
};
const CardsView = ({ events, onEdit }: { events: BroadcastEvent[], onEdit: (e: BroadcastEvent) => void }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {events.map(event => (
        <div 
          key={event.id} 
          onClick={() => onEdit(event)}
          className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <TypeBadge type={event.type} />
            <div className="flex items-center gap-2">
              {event.projectHubUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(event.projectHubUrl, '_blank');
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Open Project Hub"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </button>
              )}
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {event.competition && (
            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
              {event.competition}
            </div>
          )}
          
          <h3 className="font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {event.isSingleMatch !== false && event.teamA && event.teamB ? (
              <div className="flex items-center gap-2">
                <span>{event.teamA}</span>
                <span className="text-slate-400 font-normal text-xs">vs</span>
                <span>{event.teamB}</span>
              </div>
            ) : (
              event.isSingleMatch === false && event.competition ? event.competition : event.title
            )}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{event.description || 'No description'}</p>
          
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(event.startDate), 'dd MMM yyyy', { locale: enUS })}
              </div>
              {event.galleries?.some(g => g.layoutPreview) && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                  <ImageIcon className="w-3 h-3" />
                  LAYOUT
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {event.galleries?.map(g => g.systemId && (
                <div key={g.id} className="flex items-center gap-1 text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">
                  <Settings className="w-2.5 h-2.5" />
                  {g.name}
                </div>
              ))}
            </div>
            <StatusBadge status={event.status} />
          </div>
        </div>
      ))}
    </div>
  );
};
const ListView = ({ events, onEdit }: { events: BroadcastEvent[], onEdit: (e: BroadcastEvent) => void }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Event</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => (
            <tr 
              key={event.id} 
              onClick={() => onEdit(event)}
              className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0"
            >
              <td className="px-6 py-4">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  {event.competition && <span className="text-[10px] text-blue-600 uppercase">{event.competition}</span>}
                  {event.isSingleMatch !== false && event.teamA && event.teamB ? `${event.teamA} vs ${event.teamB}` : (event.isSingleMatch === false && event.competition ? event.competition : event.title)}
                  {event.galleries?.some(g => g.layoutPreview) && (
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate max-w-xs">{event.description}</div>
              </td>
              <td className="px-6 py-4">
                <TypeBadge type={event.type} />
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">
                {format(new Date(event.startDate), 'dd/MM/yyyy HH:mm')}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <StatusBadge status={event.status} />
                  <div className="flex flex-wrap gap-1">
                    {event.galleries?.map(g => g.systemId && (
                      <span key={g.id} className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3 justify-end">
                  {event.projectHubUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(event.projectHubUrl, '_blank');
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Open Project Hub"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                    </button>
                  )}
                  <button className="text-slate-400 hover:text-blue-600">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
const GanttView = ({ events, onEdit }: { events: BroadcastEvent[], onEdit: (e: BroadcastEvent) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Production Calendar
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-white rounded border border-slate-200"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-bold px-4">{format(monthStart, 'MMMM yyyy', { locale: enUS })}</span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white rounded border border-slate-200"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      
      <div className="flex flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase">{day}</div>
          ))}
        </div>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-slate-200 gap-[1px]">
          {days.map(day => {
            const dayStart = startOfDay(day).getTime();
            const dayEnd = endOfDay(day).getTime();
            // Find events block that overlap with this day
            const dayBlocks: any[] = [];
            events.forEach(event => {
              if (event.isSingleMatch !== false) {
                // Single Match
                const blocks = (event.sessions && event.sessions.length > 0)
                  ? event.sessions.map(s => {
                      let displayTitle = s.title;
                      if (s.teamA && s.teamB) {
                        const tA = s.teamA.substring(0, 3).toUpperCase();
                        const tB = s.teamB.substring(0, 3).toUpperCase();
                        displayTitle = `${tA} vs ${tB}`;
                      }
                      const finalTitle = event.competition ? `${event.competition} - ${displayTitle}` : displayTitle;
                      return { start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime(), title: finalTitle, event };
                    })
                  : [{ 
                      start: new Date(event.startDate).getTime(), 
                      end: new Date(event.endDate).getTime(), 
                      title: event.competition 
                        ? `${event.competition} - ${(event.teamA && event.teamB) ? `${event.teamA.substring(0, 3).toUpperCase()} vs ${event.teamB.substring(0, 3).toUpperCase()}` : event.title}`
                        : ((event.teamA && event.teamB) ? `${event.teamA.substring(0, 3).toUpperCase()} vs ${event.teamB.substring(0, 3).toUpperCase()}` : event.title), 
                      event 
                    }];
                blocks.forEach(block => {
                  if (block.start <= dayEnd && block.end >= dayStart) {
                    dayBlocks.push(block);
                  }
                });
              } else {
                // Competition
                const eventStart = new Date(event.startDate).getTime();
                const eventEnd = new Date(event.endDate).getTime();
                
                if (eventStart <= dayEnd && eventEnd >= dayStart) {
                  const titleBase = event.competition || event.title;
                  let dayTitle = titleBase;
                  
                  if (event.sessions && event.sessions.length > 0) {
                    let sessionsToday = 0;
                    event.sessions.forEach(s => {
                      const sStart = new Date(s.startDate).getTime();
                      const sEnd = new Date(s.endDate).getTime();
                      if (sStart <= dayEnd && sEnd >= dayStart) {
                        sessionsToday++;
                      }
                    });
                    
                    if (sessionsToday > 0) {
                      dayTitle = `${titleBase}: ${sessionsToday} session${sessionsToday > 1 ? 's' : ''}`;
                    } else {
                      // Skip rendering on days where competition has explicit sessions but none on this day
                      return;
                    }
                  }
                  
                  dayBlocks.push({
                    start: Math.max(eventStart, dayStart),
                    end: Math.min(eventEnd, dayEnd),
                    title: dayTitle,
                    event
                  });
                }
              }
            });
            // Sort by start time
            dayBlocks.sort((a, b) => a.start - b.start);
            return (
              <div key={day.toISOString()} className={cn(
                "min-h-[120px] bg-white p-2 flex flex-col gap-1 transition-colors",
                !isSameMonth(day, monthStart) && "bg-slate-50/50"
              )}>
                <div className={cn(
                  "text-right text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ml-auto",
                  isSameDay(day, new Date()) ? "bg-blue-600 text-white" : (!isSameMonth(day, monthStart) ? "text-slate-400" : "text-slate-700")
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1 flex-1 overflow-y-auto max-h-[160px] hide-scrollbar">
                  {dayBlocks.map((block, idx) => (
                    <div 
                      key={`${block.event.id}-${idx}`}
                      onClick={() => onEdit(block.event)}
                      className={cn(
                        "rounded px-1.5 py-1 text-[10px] font-bold text-white cursor-pointer hover:opacity-80 transition-opacity truncate shadow-sm",
                        block.event.status === 'Live' ? "bg-red-500" : 
                        block.event.type === 'Live Event' ? "bg-red-500" : "bg-yellow-500"
                      )}
                      title={block.title}
                    >
                      {format(new Date(Math.max(block.start, dayStart)), 'HH:mm')} - {block.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
const TIMEZONES = typeof Intl !== 'undefined' && (Intl as any).supportedValuesOf 
  ? (Intl as any).supportedValuesOf('timeZone') as string[]
  : [
      "Europe/Rome",
      "Europe/London",
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Tokyo",
      "Asia/Dubai",
      "Australia/Sydney",
      "UTC"
    ];
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
const CityAutocomplete = ({ value, onChange }: { value: string, onChange: (city: string, tz: string | null) => void }) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<{place_id: string, description: string, lat: string, lon: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!inputValue || inputValue.length < 3 || !showSuggestions) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&addressdetails=1&limit=5&featuretype=city`
        );
        const data = await response.json();
        setSuggestions(data.map((item: any) => ({
          place_id: item.place_id,
          description: item.display_name,
          lat: item.lat,
          lon: item.lon
        })));
      } catch (error) {
        console.error("Error fetching city suggestions:", error);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue, showSuggestions]);
  const handleSelect = (item: {description: string, lat: string, lon: string}) => {
    setInputValue(item.description);
    setShowSuggestions(false);
    
    try {
      const tz = tzlookup(parseFloat(item.lat), parseFloat(item.lon));
      onChange(item.description, tz);
    } catch (error) {
      console.error("Error looking up timezone:", error);
      onChange(item.description, null);
    }
  };
  return (
    <div className="relative">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">City</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
          placeholder="Search for a city..."
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-60 overflow-auto py-1">
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              onClick={() => handleSelect(item)}
              className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0 transition-colors"
            >
              {item.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
const EventModal = ({ event, existingSports, allEvents, onClose }: { event: BroadcastEvent | null, existingSports: string[], allEvents: BroadcastEvent[], onClose: () => void }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [logs, setLogs] = useState<EventLog[]>(event?.logs || []);
  const [newLog, setNewLog] = useState({ 
    message: '', 
    actor: 'TGI' as LogActor,
    date: format(new Date(), 'yyyy-MM-dd')
  });
  
  const DEFAULT_SPORTS = ['Football', 'Basketball', 'Rugby', 'Cricket'];
  const [customSports, setCustomSports] = useState<string[]>([]);
  const [isAddingSport, setIsAddingSport] = useState(false);
  const [newSportInput, setNewSportInput] = useState('');
  
  const [addingAssetToGallery, setAddingAssetToGallery] = useState<string | null>(null);
  const [newAssetValue, setNewAssetValue] = useState('');
  const [availableSystems, setAvailableSystems] = useState<System[]>([]);
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [infrastructure, setInfrastructure] = useState<Infrastructure | null>(null);
  useEffect(() => {
    const qSystems = query(collection(db, 'systems'));
    const unsubscribeSystems = onSnapshot(qSystems, (snapshot) => {
      const fetchedSystems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as System));
      fetchedSystems.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      setAvailableSystems(fetchedSystems);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'systems');
    });
    const qMachines = query(collection(db, 'machines'));
    const unsubscribeMachines = onSnapshot(qMachines, (snapshot) => {
      const fetchedMachines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine));
      fetchedMachines.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      setAvailableMachines(fetchedMachines);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'machines');
    });
    const unsubscribeInfra = onSnapshot(collection(db, 'infrastructure'), (snapshot) => {
      if (!snapshot.empty) {
        setInfrastructure({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Infrastructure);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'infrastructure');
    });
    return () => {
      unsubscribeSystems();
      unsubscribeMachines();
      unsubscribeInfra();
    };
  }, []);
  
  const allSports = Array.from(new Set([...DEFAULT_SPORTS, ...existingSports, ...customSports, ...(event?.sport ? [event.sport] : [])]));
  const [formData, setFormData] = useState({
    title: event?.title || '',
    competition: event?.competition || '',
    isSingleMatch: event?.isSingleMatch ?? true,
    teamA: event?.teamA || '',
    teamB: event?.teamB || '',
    description: event?.description || '',
    contacts: event?.contacts || '',
    sport: event?.sport || '',
    venue: event?.venue || '',
    city: event?.city || '',
    venueTimezone: event?.venueTimezone || 'Europe/Rome',
    projectHubUrl: event?.projectHubUrl || '',
    signalsTransport: {
      inputsCount: event?.signalsTransport?.inputsCount || 1,
      signalType: event?.signalsTransport?.signalType || 'Clean',
      colorProfile: event?.signalsTransport?.colorProfile || 'SDR',
      transportTypesMain: event?.signalsTransport?.transportTypesMain || [],
      transportTypesBck: event?.signalsTransport?.transportTypesBck || [],
      videoStandard: event?.signalsTransport?.videoStandard || '1080p50',
      audioConfig: event?.signalsTransport?.audioConfig || '4 Pairs (8 Ch)',
      transportDetails: event?.signalsTransport?.transportDetails || [],
      outputTransportDetails: event?.signalsTransport?.outputTransportDetails || [],
      outputsCount: event?.signalsTransport?.outputsCount || 1,
      outputDelivery: event?.signalsTransport?.outputDelivery || 'Main Only',
      outputTransportTypes: event?.signalsTransport?.outputTransportTypes || [],
      notes: event?.signalsTransport?.notes || ''
    },
    schedule: event?.schedule || [],
    costs: event?.costs || [],
    galleries: event?.galleries?.map((g: any) => ({
      ...g,
      resolution: Array.isArray(g.resolution) ? g.resolution : [g.resolution || 'HD'],
      videoMatrix: g.videoMatrix || 'Any',
      mainConfig: g.mainConfig || {
        trackingType: g.trackingType || 'Tracking 1',
        cameras: typeof g.hardware?.tracer === 'object' ? g.hardware.tracer.main : (g.hardware?.tracer || 1),
        pgms: typeof g.hardware?.integrator === 'object' ? g.hardware.integrator.main : (g.hardware?.integrator || 1),
        outputs: typeof g.hardware?.renderer === 'object' ? g.hardware.renderer.main : (g.hardware?.renderer || 1)
      },
      hasBackup: g.hasBackup || false,
      redundantMatrix: g.redundantMatrix || false,
      backupConfig: g.backupConfig || (g.hasBackup && g.hardware ? {
        trackingType: 'Tracking 1',
        cameras: typeof g.hardware.tracer === 'object' ? g.hardware.tracer.bck : 1,
        pgms: typeof g.hardware.integrator === 'object' ? g.hardware.integrator.bck : 1,
        outputs: typeof g.hardware.renderer === 'object' ? g.hardware.renderer.bck : 1
      } : null)
    })) || [
      {
        id: 'gallery-1',
        name: 'Gallery 1',
        resolution: (event as any)?.resolution ? (Array.isArray((event as any).resolution) ? (event as any).resolution : [(event as any).resolution]) : ['HD'],
        videoMatrix: 'Any',
        mainConfig: {
          trackingType: (event as any)?.trackingType || 'Tracking 1',
          cameras: 1,
          pgms: 1,
          outputs: 1
        },
        hasBackup: false,
        redundantMatrix: false,
        backupConfig: null,
        virtualAssets: (event as any)?.galleries?.[0]?.virtualAssets || [],
        layoutPreview: (event as any)?.galleries?.[0]?.layoutPreview || ''
      }
    ],
    status: event?.status || 'TBC' as EventStatus,
    type: event?.type || 'Live Event' as EventType,
    startDate: event?.startDate ? formatInTimeZone(new Date(event.startDate), event?.venueTimezone || 'Europe/Rome', "yyyy-MM-dd'T'HH:mm") : formatInTimeZone(new Date(), 'Europe/Rome', "yyyy-MM-dd'T'HH:mm"),
    endDate: event?.endDate ? formatInTimeZone(new Date(event.endDate), event?.venueTimezone || 'Europe/Rome', "yyyy-MM-dd'T'HH:mm") : formatInTimeZone(addDays(new Date(), 1), 'Europe/Rome', "yyyy-MM-dd'T'HH:mm"),
    sessions: event?.sessions?.map(s => ({
      ...s,
      startDate: formatInTimeZone(new Date(s.startDate), event?.venueTimezone || 'Europe/Rome', "yyyy-MM-dd'T'HH:mm"),
      endDate: formatInTimeZone(new Date(s.endDate), event?.venueTimezone || 'Europe/Rome', "yyyy-MM-dd'T'HH:mm"),
    })) || [],
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let globalA = formData.isSingleMatch ? formData.teamA : '';
      let globalB = formData.isSingleMatch ? formData.teamB : '';
      if (formData.isSingleMatch && !globalA && !globalB && formData.sessions && formData.sessions.length > 0) {
        globalA = formData.sessions[0].teamA || '';
        globalB = formData.sessions[0].teamB || '';
      }
      const displayTitle = (formData.isSingleMatch && globalA && globalB)
        ? `${globalA} vs ${globalB}`
        : (formData.competition || formData.title || 'Event');
      const parsedSessions = formData.sessions?.map(s => ({
        id: s.id,
        title: s.title || '',
        teamA: s.teamA || '',
        teamB: s.teamB || '',
        startDate: fromZonedTime(s.startDate, formData.venueTimezone || 'Europe/Rome').toISOString(),
        endDate: fromZonedTime(s.endDate, formData.venueTimezone || 'Europe/Rome').toISOString(),
      }));
      const data = {
        ...formData,
        teamA: globalA,
        teamB: globalB,
        title: displayTitle,
        logs,
        createdBy: user.uid,
        createdAt: event?.createdAt || new Date().toISOString(),
        startDate: fromZonedTime(formData.startDate!, formData.venueTimezone || 'Europe/Rome').toISOString(),
        endDate: fromZonedTime(formData.endDate!, formData.venueTimezone || 'Europe/Rome').toISOString(),
        sessions: parsedSessions,
      };
      if (event) {
        await updateDoc(doc(db, 'events', event.id), data);
      } else {
        await addDoc(collection(db, 'events'), data);
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, event ? OperationType.UPDATE : OperationType.CREATE, 'events');
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async () => {
    if (!event) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'events', event.id));
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${event.id}`);
    } finally {
      setLoading(false);
    }
  };
  const handleAddLog = () => {
    if (!newLog.message.trim() || !newLog.date) return;
    const logEntry: EventLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(newLog.date).toISOString(),
      actor: newLog.actor,
      message: newLog.message.trim()
    };
    setLogs([...logs, logEntry]);
    setNewLog({ message: '', actor: 'TGI', date: format(new Date(), 'yyyy-MM-dd') });
  };
  const handleRemoveLog = (id: string) => {
    setLogs(logs.filter(l => l.id !== id));
  };
  const getActorColor = (actor: LogActor) => {
    switch (actor) {
      case 'TGI': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Connectivity Provider': return 'bg-red-100 text-red-700 border-red-200';
      case 'Client': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-7xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        <div className="flex flex-row flex-1 min-h-0">
          {/* Sidebar Navigation */}
          <nav className="w-48 bg-slate-50 border-r border-slate-200 p-6 shrink-0 overflow-y-auto">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Navigation</h3>
            <div className="space-y-4">
              <a href="#info" className="block text-sm font-medium text-slate-600 hover:text-blue-600">General Info</a>
              <a href="#galleries" className="block text-sm font-medium text-slate-600 hover:text-blue-600">Galleries & Hardware</a>
              <a href="#signals" className="block text-sm font-medium text-slate-600 hover:text-blue-600">Signals & Transport</a>
              <a href="#schedule" className="block text-sm font-medium text-slate-600 hover:text-blue-600">Running Order</a>
              {profile?.role === 'admin' && (
                <a href="#costs" className="block text-sm font-medium text-slate-600 hover:text-blue-600">Production Costs</a>
              )}
            </div>
          </nav>
          {/* Scrolling Content Area */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-8" style={{ pointerEvents: profile?.role === 'operator' ? 'none' : 'auto' }}>
              
              {/* Cover Image & Header inside scrolling area */}
              <div className="w-full relative bg-white">
                <img 
                  src={coverWorkorder} 
                  alt="Workorder Cover" 
                  className="w-full h-auto object-contain"
                />
                <button 
                  onClick={onClose} 
                  className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-sm transition-all z-10"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="border-b border-slate-100 pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {event ? 'Edit Workorder' : 'New Workorder'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Fill in the details to generate the production document.
                    </p>
                  </div>
                  
                  {/* Global Conflict Warning */}
                  {(() => {
                    if (!allEvents || !formData.galleries) return null;
                    const start = new Date(formData.startDate).getTime();
                    const end = new Date(formData.endDate).getTime();
                    const selectedSystemIds = formData.galleries.map(g => g.systemId).filter(Boolean);
                    if (selectedSystemIds.length === 0) return null;
                    
                    const overlappingEvents = allEvents.filter(e => {
                      if (event && e.id === event.id) return false;
                      // Convert current checking times to a list of blocks
                      const currentBlocks = (formData.sessions && formData.sessions.length > 0) 
                        ? formData.sessions.map(s => ({ start: new Date(fromZonedTime(s.startDate, formData.venueTimezone || 'Europe/Rome')).getTime(), end: new Date(fromZonedTime(s.endDate, formData.venueTimezone || 'Europe/Rome')).getTime() }))
                        : [{ start: new Date(fromZonedTime(formData.startDate!, formData.venueTimezone || 'Europe/Rome')).getTime(), end: new Date(fromZonedTime(formData.endDate!, formData.venueTimezone || 'Europe/Rome')).getTime() }];
                      // Convert target event times to a list of blocks
                      const targetBlocks = (e.sessions && e.sessions.length > 0)
                        ? e.sessions.map(s => ({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() }))
                        : [{ start: new Date(e.startDate).getTime(), end: new Date(e.endDate).getTime() }];
                      let isOverlap = false;
                      for (const cur of currentBlocks) {
                        for (const tgt of targetBlocks) {
                          if (cur.start < tgt.end && cur.end > tgt.start) {
                            isOverlap = true;
                            break;
                          }
                        }
                        if (isOverlap) break;
                      }
                      
                      if (isOverlap) {
                        return Array.isArray(e.galleries) && e.galleries.some(g => g.systemId && selectedSystemIds.includes(g.systemId));
                      }
                      return false;
                    });
                    if (overlappingEvents.length > 0) {
                      return (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 max-w-sm">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                          <div className="text-sm">
                            <p className="font-bold mb-1">Avviso di Conflitto di Sistema</p>
                            <p className="opacity-90 text-[11px] leading-snug">
                              I sistemi selezionati sono già assegnati ad eventi concomitanti: 
                              <span className="font-bold"> {overlappingEvents.map(e => e.title).join(', ')}</span>.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              <section id="info" className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">
              Event Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      checked={formData.isSingleMatch}
                      onChange={(e) => setFormData({ ...formData, isSingleMatch: e.target.checked })}
                    />
                    <span className="text-sm font-bold text-slate-700">Single Match (Global Home/Away Teams)</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1 ml-6">
                    Se non attivata, il calendario mostrerà solo il nome della competizione e la sua intera durata.
                  </p>
                </div>
                <div className={formData.isSingleMatch ? "md:col-span-1" : "md:col-span-3"}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Competition</label>
                  <input 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
                    value={formData.competition}
                    onChange={e => setFormData({ ...formData, competition: e.target.value })}
                    placeholder="e.g. Champions League"
                  />
                </div>
                {formData.isSingleMatch && (
                  <>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Team A</label>
                      <input 
                        required={!formData.title && formData.isSingleMatch}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
                        value={formData.teamA}
                        onChange={e => setFormData({ ...formData, teamA: e.target.value })}
                        placeholder="Home Team"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Team B</label>
                      <input 
                        required={!formData.title && formData.isSingleMatch}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
                        value={formData.teamB}
                        onChange={e => setFormData({ ...formData, teamB: e.target.value })}
                        placeholder="Away Team"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <input 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Champions League Final 2026"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sport</label>
                {isAddingSport ? (
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
                      value={newSportInput}
                      onChange={e => setNewSportInput(e.target.value)}
                      placeholder="New sport..."
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSportInput.trim()) {
                            const sportName = newSportInput.trim();
                            if (!allSports.includes(sportName)) {
                              setCustomSports(prev => [...prev, sportName]);
                            }
                            setFormData({ ...formData, sport: sportName });
                          }
                          setIsAddingSport(false);
                          setNewSportInput('');
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (newSportInput.trim()) {
                          const sportName = newSportInput.trim();
                          if (!allSports.includes(sportName)) {
                            setCustomSports(prev => [...prev, sportName]);
                          }
                          setFormData({ ...formData, sport: sportName });
                        }
                        setIsAddingSport(false);
                        setNewSportInput('');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Save
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsAddingSport(false);
                        setNewSportInput('');
                      }}
                      className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
                      value={formData.sport}
                      onChange={e => setFormData({ ...formData, sport: e.target.value })}
                    >
                      <option value="">Select a sport...</option>
                      {allSports.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setIsAddingSport(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> New
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Venue (Stadium/Arena)</label>
                <input 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  value={formData.venue}
                  onChange={e => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Wembley Stadium"
                />
              </div>
              <CityAutocomplete 
                value={formData.city} 
                onChange={(city, tz) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    city, 
                    venueTimezone: tz || prev.venueTimezone 
                  }));
                }} 
              />
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date (Venue Local Time)</label>
                <input 
                  type="datetime-local"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
                {formData.venueTimezone && formData.startDate && (
                  <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Rome Time: {formatInTimeZone(fromZonedTime(formData.startDate, formData.venueTimezone), 'Europe/Rome', "dd MMM yyyy, HH:mm")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End Date (Venue Local Time)</label>
                <input 
                  type="datetime-local"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
                {formData.venueTimezone && formData.endDate && (
                  <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Rome Time: {formatInTimeZone(fromZonedTime(formData.endDate, formData.venueTimezone), 'Europe/Rome', "dd MMM yyyy, HH:mm")}
                  </p>
                )}
              </div>
            </div>
            {/* Event Sessions (Tournament / Daily Matches) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Event Sessions / Matches</h4>
                  <p className="text-xs text-slate-500">Add daily sessions for tournaments (e.g. World Cup) to only allocate hardware during these times.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newSession = {
                      id: crypto.randomUUID(),
                      title: `Session ${(formData.sessions?.length || 0) + 1}`,
                      startDate: formData.startDate || '',
                      endDate: formData.endDate || '',
                    };
                    setFormData({ ...formData, sessions: [...(formData.sessions || []), newSession] });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  <Plus className="w-4 h-4" /> Add Session
                </button>
              </div>
              {formData.sessions && formData.sessions.length > 0 && (
                <div className="space-y-3">
                  {formData.sessions.map((session, idx) => (
                    <div key={session.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Session Title</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
                          value={session.title}
                          onChange={e => {
                            const updated = [...(formData.sessions || [])];
                            updated[idx].title = e.target.value;
                            setFormData({ ...formData, sessions: updated });
                          }}
                          placeholder="e.g. Match 1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Home Team</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
                          value={session.teamA || ''}
                          onChange={e => {
                            const updated = [...(formData.sessions || [])];
                            updated[idx].teamA = e.target.value;
                            setFormData({ ...formData, sessions: updated });
                          }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Away Team</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
                          value={session.teamB || ''}
                          onChange={e => {
                            const updated = [...(formData.sessions || [])];
                            updated[idx].teamB = e.target.value;
                            setFormData({ ...formData, sessions: updated });
                          }}
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start (Local)</label>
                        <input
                          type="datetime-local"
                          className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-xs"
                          value={session.startDate || (formData.startDate ? formData.startDate.substring(0, 16) : '')}
                          onChange={e => {
                            const updated = [...(formData.sessions || [])];
                            updated[idx].startDate = e.target.value;
                            setFormData({ ...formData, sessions: updated });
                          }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End (Local)</label>
                        <input
                          type="datetime-local"
                          className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-xs"
                          value={session.endDate || (formData.endDate ? formData.endDate.substring(0, 16) : '')}
                          onChange={e => {
                            const updated = [...(formData.sessions || [])];
                            updated[idx].endDate = e.target.value;
                            setFormData({ ...formData, sessions: updated });
                          }}
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-center pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.sessions?.filter((_, i) => i !== idx);
                            setFormData({ ...formData, sessions: updated });
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent shadow-none"
                          title="Remove Session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Timezone Venue</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  value={formData.venueTimezone}
                  onChange={e => setFormData({ ...formData, venueTimezone: e.target.value })}
                >
                  {Array.from(new Set([...TIMEZONES, formData.venueTimezone])).filter(Boolean).map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as EventType })}
                >
                  <option value="Live Event">Live Event</option>
                  <option value="POC">POC</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <select 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as EventStatus })}
                >
                  <option value="TBC">TBC</option>
                  <option value="Confirmed-In progress">Confirmed-In progress</option>
                  <option value="Confirmed-Ready for live">Confirmed-Ready for live</option>
                  <option value="Live">Live</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Useful Contacts</label>
                <textarea 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none shadow-sm"
                  value={formData.contacts}
                  onChange={e => setFormData({ ...formData, contacts: e.target.value })}
                  placeholder="Names, emails, phone numbers of contacts..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description / Notes</label>
                <textarea 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none shadow-sm"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional production details..."
                />
              </div>
            </div>
          </section>
          {/* Project Overview / Timeline Section */}
          <section className="space-y-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">
              Project Overview / Timeline
            </h3>
            <div className="space-y-4">
              {/* Add new log */}
              <div className="flex flex-col sm:flex-row gap-3 items-start bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-2 w-full sm:w-60 shrink-0">
                  <input 
                    type="date"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full"
                    value={newLog.date}
                    onChange={e => setNewLog({ ...newLog, date: e.target.value })}
                  />
                  <select 
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full"
                    value={newLog.actor}
                    onChange={e => setNewLog({ ...newLog, actor: e.target.value as LogActor })}
                  >
                    <option value="TGI">TGI</option>
                    <option value="Connectivity Provider">Connectivity Provider</option>
                    <option value="Client">Client</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <textarea 
                  placeholder="Enter a new update..."
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full min-h-[88px] resize-y"
                  value={newLog.message}
                  onChange={e => setNewLog({ ...newLog, message: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddLog(); } }}
                />
                <button 
                  type="button"
                  onClick={handleAddLog}
                  disabled={!newLog.message.trim()}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors w-full sm:w-auto whitespace-nowrap self-stretch sm:self-auto"
                >
                  Add Log
                </button>
              </div>
              {/* Timeline Display */}
              {logs.length > 0 ? (
                <div className="flex overflow-x-auto pb-6 pt-2 px-2 gap-4 snap-x">
                  {logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((log, index, sortedLogs) => {
                    const prevLog = index > 0 ? sortedLogs[index - 1] : null;
                    const daysElapsed = prevLog ? differenceInDays(new Date(log.timestamp), new Date(prevLog.timestamp)) : 0;
                    return (
                      <div key={log.id} className="flex items-center shrink-0 snap-start">
                        {/* Connection Line with Days */}
                        {index > 0 && (
                          <div className="flex flex-col items-center justify-center w-16 sm:w-24 px-2">
                            <div className="h-px w-full bg-slate-300"></div>
                            <span className="text-[10px] font-bold text-slate-400 mt-1 bg-slate-50 px-1 rounded-full whitespace-nowrap">
                              {daysElapsed} {daysElapsed === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        )}
                        {/* Timeline Card */}
                        <div className="w-64 p-4 rounded-xl border border-slate-200 bg-white shadow-sm relative flex flex-col h-full">
                          <button 
                            type="button"
                            onClick={() => handleRemoveLog(log.id)}
                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Plus className="w-4 h-4 rotate-45" />
                          </button>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full shrink-0",
                              log.actor === 'TGI' ? 'bg-blue-500' : 
                              log.actor === 'Connectivity Provider' ? 'bg-red-500' : 
                              log.actor === 'Client' ? 'bg-green-500' : 'bg-slate-500'
                            )}></div>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border", getActorColor(log.actor))}>
                              {log.actor}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium mb-2 block">
                            {format(new Date(log.timestamp), 'dd MMM yyyy')}
                          </span>
                          <p className="text-sm text-slate-700 flex-1 whitespace-pre-wrap overflow-y-auto pr-2 hide-scrollbar">{log.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  No logs present. Add the first update to start the timeline.
                </div>
              )}
            </div>
          </section>
          {/* Hardware & Asset Section */}
          <section id="galleries" className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                Galleries & Hardware
              </h3>
              <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Galleries</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.galleries.length > 1) {
                        setFormData(prev => ({
                          ...prev,
                          galleries: prev.galleries.slice(0, -1)
                        }));
                      }
                    }}
                    className="p-1 hover:bg-white rounded transition-colors text-slate-500 hover:text-red-600 disabled:opacity-30"
                    disabled={formData.galleries.length <= 1}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-bold text-slate-900 min-w-[1rem] text-center">
                    {formData.galleries.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = crypto.randomUUID();
                      setFormData(prev => ({
                        ...prev,
                        galleries: [
                          ...prev.galleries,
                          {
                            id: newId,
                            name: `Gallery ${prev.galleries.length + 1}`,
                            resolution: ['HD'],
                            videoMatrix: 'Any',
                            mainConfig: {
                              trackingType: 'Tracking 1',
                              cameras: 1,
                              pgms: 1,
                              outputs: 1
                            },
                            hasBackup: false,
                            redundantMatrix: false,
                            backupConfig: null,
                            virtualAssets: [],
                            layoutPreview: ''
                          }
                        ]
                      }));
                    }}
                    className="p-1 hover:bg-white rounded transition-colors text-slate-500 hover:text-blue-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-12">
              {formData.galleries.map((gallery, gIndex) => (
                <div key={gallery.id} className="space-y-6 relative">
                  {formData.galleries.length > 1 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                        {gallery.name}
                      </span>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                  )}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resolution</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          {(['HD', 'UHD'] as const).map(res => {
                            const currentRes = Array.isArray(gallery.resolution) ? gallery.resolution : [gallery.resolution || 'HD'];
                            const isSelected = currentRes.includes(res);
                            return (
                              <button
                                key={res}
                                type="button"
                                onClick={() => {
                                  let newRes = [...currentRes];
                                  if (isSelected) {
                                    if (newRes.length > 1) {
                                      newRes = newRes.filter(r => r !== res);
                                    }
                                  } else {
                                    newRes.push(res);
                                  }
                                  const newGalleries = [...formData.galleries];
                                  const updatedGallery = { ...newGalleries[gIndex], resolution: newRes as any };
                                  if (!newRes.includes('UHD')) {
                                      delete updatedGallery.uhdAssignment;
                                  } else if (newRes.includes('UHD') && !updatedGallery.uhdAssignment) {
                                      updatedGallery.uhdAssignment = 'Unilateral';
                                  }
                                  newGalleries[gIndex] = updatedGallery;
                                  setFormData({ ...formData, galleries: newGalleries });
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all",
                                  isSelected
                                    ? "bg-blue-600 border-blue-600 text-white" 
                                    : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                                )}
                              >
                                {res}
                              </button>
                            );
                          })}
                        </div>
                        {Array.isArray(gallery.resolution) && gallery.resolution.includes('UHD') && (
                          <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Destinazione PGM UHD</label>
                            <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGalleries = [...formData.galleries];
                                    newGalleries[gIndex] = { ...newGalleries[gIndex], uhdAssignment: 'Unilateral' };
                                    setFormData({ ...formData, galleries: newGalleries });
                                  }}
                                  className={cn("px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-widest transition-all", gallery.uhdAssignment === 'Unilateral' ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50")}
                                >
                                  Unilaterale
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newGalleries = [...formData.galleries];
                                    newGalleries[gIndex] = { ...newGalleries[gIndex], uhdAssignment: 'Multilateral' };
                                    setFormData({ ...formData, galleries: newGalleries });
                                  }}
                                  className={cn("px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-widest transition-all", gallery.uhdAssignment === 'Multilateral' ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50")}
                                >
                                  Multilaterale
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 opacity-80 leading-snug">Seleziona a quale feed è associato il PGM UHD (es. Multilaterale = Int 4, Unilaterale = Int 17 su Sys 1). Attiva l'uscita superchiave in NDI.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Matrix</label>
                      <div className="flex flex-wrap gap-2">
                        {(['Matrix 1', 'Matrix 2', 'Any'] as const).map(mat => (
                          <button
                            key={mat}
                            type="button"
                            onClick={() => {
                              const newGalleries = [...formData.galleries];
                              newGalleries[gIndex] = { ...newGalleries[gIndex], videoMatrix: mat };
                              setFormData({ ...formData, galleries: newGalleries });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all",
                              gallery.videoMatrix === mat 
                                ? "bg-purple-600 border-purple-600 text-white" 
                                : "bg-white border-slate-200 text-slate-500 hover:border-purple-300"
                            )}
                          >
                            {mat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Main Configuration</p>
                        <p className="text-xs text-slate-500">Set the operational requirements for the main chain</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tracking Type</label>
                        <div className="flex items-center gap-6">
                          {(['Tracking 1', 'Tracking 2'] as const).map((type) => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer group">
                              <div className="relative flex items-center justify-center">
                                <input 
                                  type="radio" 
                                  name={`mainTrackingType-${gallery.id}`}
                                  value={type}
                                  checked={gallery.mainConfig.trackingType === type}
                                  onChange={() => {
                                    const newGalleries = [...formData.galleries];
                                    newGalleries[gIndex] = { 
                                      ...newGalleries[gIndex], 
                                      mainConfig: { ...newGalleries[gIndex].mainConfig, trackingType: type } 
                                    };
                                    setFormData({ ...formData, galleries: newGalleries });
                                  }}
                                  className="peer sr-only"
                                />
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-colors group-hover:border-blue-500"></div>
                                <div className="absolute w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                              </div>
                              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'cameras', label: 'Cameras to Virtualize', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { id: 'pgms', label: 'PGM Inputs', icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { id: 'outputs', label: 'Output Feeds', icon: Monitor, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                      ].map((item) => (
                        <div key={`main-${item.id}`} className={cn("p-4 rounded-xl border border-slate-200 flex flex-col items-center gap-3", item.bg)}>
                          <div className={cn("p-2 rounded-lg bg-white shadow-sm", item.color)}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">{item.label}</span>
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => {
                                const key = item.id as 'cameras' | 'pgms' | 'outputs';
                                const newGalleries = [...formData.galleries];
                                newGalleries[gIndex] = {
                                  ...newGalleries[gIndex],
                                  mainConfig: {
                                    ...newGalleries[gIndex].mainConfig,
                                    [key]: Math.max(1, newGalleries[gIndex].mainConfig[key] - 1)
                                  }
                                };
                                setFormData({ ...formData, galleries: newGalleries });
                              }}
                              className="p-2 hover:bg-slate-50 text-slate-500 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-black text-slate-700">
                              {gallery.mainConfig[item.id as 'cameras' | 'pgms' | 'outputs']}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const key = item.id as 'cameras' | 'pgms' | 'outputs';
                                const newGalleries = [...formData.galleries];
                                newGalleries[gIndex] = {
                                  ...newGalleries[gIndex],
                                  mainConfig: {
                                    ...newGalleries[gIndex].mainConfig,
                                    [key]: newGalleries[gIndex].mainConfig[key] + 1
                                  }
                                };
                                setFormData({ ...formData, galleries: newGalleries });
                              }}
                              className="p-2 hover:bg-slate-50 text-slate-500 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Backup Chain</p>
                          <p className="text-xs text-slate-500">Enable redundant hardware for this gallery</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newGalleries = [...formData.galleries];
                          const hasBackup = !newGalleries[gIndex].hasBackup;
                          newGalleries[gIndex] = {
                            ...newGalleries[gIndex],
                            hasBackup,
                            backupConfig: hasBackup ? {
                              trackingType: 'Tracking 1',
                              cameras: 1,
                              pgms: 1,
                              outputs: 1
                            } : null
                          };
                          setFormData({ ...formData, galleries: newGalleries });
                        }}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                          gallery.hasBackup ? "bg-blue-600" : "bg-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            gallery.hasBackup ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                    {gallery.hasBackup && gallery.backupConfig && (
                      <div className="space-y-6 p-4 border border-blue-100 bg-blue-50/30 rounded-xl">
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <span className="text-sm font-bold text-slate-700 block">Ridondanza di Matrice (Disaster Recovery)</span>
                            <span className="text-[10px] text-slate-500 font-medium block leading-tight">Forza il backup hardware sulla matrice opposta al Main</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newGalleries = [...formData.galleries];
                              newGalleries[gIndex] = {
                                ...newGalleries[gIndex],
                                redundantMatrix: !newGalleries[gIndex].redundantMatrix
                              };
                              setFormData({ ...formData, galleries: newGalleries });
                            }}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                              gallery.redundantMatrix ? "bg-purple-600" : "bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                gallery.redundantMatrix ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Backup Tracking Type</label>
                            <div className="flex items-center gap-6">
                              {(['Tracking 1', 'Tracking 2'] as const).map((type) => (
                                <label key={`bck-${type}`} className="flex items-center gap-2 cursor-pointer group">
                                  <div className="relative flex items-center justify-center">
                                    <input 
                                      type="radio" 
                                      name={`bckTrackingType-${gallery.id}`}
                                      value={type}
                                      checked={gallery.backupConfig!.trackingType === type}
                                      onChange={() => {
                                        const newGalleries = [...formData.galleries];
                                        newGalleries[gIndex] = { 
                                          ...newGalleries[gIndex], 
                                          backupConfig: { ...newGalleries[gIndex].backupConfig!, trackingType: type } 
                                        };
                                        setFormData({ ...formData, galleries: newGalleries });
                                      }}
                                      className="peer sr-only"
                                    />
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-blue-600 peer-checked:bg-blue-600 transition-colors group-hover:border-blue-500"></div>
                                    <div className="absolute w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                  </div>
                                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{type}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { id: 'cameras', label: 'Cameras to Virtualize', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50' },
                            { id: 'pgms', label: 'PGM Inputs', icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { id: 'outputs', label: 'Output Feeds', icon: Monitor, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                          ].map((item) => (
                            <div key={`bck-${item.id}`} className={cn("p-4 rounded-xl border border-slate-200 flex flex-col items-center gap-3", item.bg)}>
                              <div className={cn("p-2 rounded-lg bg-white shadow-sm", item.color)}>
                                <item.icon className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">{item.label}</span>
                              <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const key = item.id as 'cameras' | 'pgms' | 'outputs';
                                    const newGalleries = [...formData.galleries];
                                    newGalleries[gIndex] = {
                                      ...newGalleries[gIndex],
                                      backupConfig: {
                                        ...newGalleries[gIndex].backupConfig!,
                                        [key]: Math.max(0, newGalleries[gIndex].backupConfig![key] - 1)
                                      }
                                    };
                                    setFormData({ ...formData, galleries: newGalleries });
                                  }}
                                  className="p-2 hover:bg-slate-50 text-slate-500 transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-10 text-center text-sm font-black text-slate-700">
                                  {gallery.backupConfig![item.id as 'cameras' | 'pgms' | 'outputs']}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const key = item.id as 'cameras' | 'pgms' | 'outputs';
                                    const newGalleries = [...formData.galleries];
                                    newGalleries[gIndex] = {
                                      ...newGalleries[gIndex],
                                      backupConfig: {
                                        ...newGalleries[gIndex].backupConfig!,
                                        [key]: newGalleries[gIndex].backupConfig![key] + 1
                                      }
                                    };
                                    setFormData({ ...formData, galleries: newGalleries });
                                  }}
                                  className="p-2 hover:bg-slate-50 text-slate-500 transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">System Recommendation</label>
                    </div>
                    {(() => {
                      const recs = getRecommendedSystems(gallery, availableMachines, availableSystems, formData, allEvents, event || undefined);
                      if (recs.length === 0) {
                        return (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {gallery.mainConfig.cameras === 0 && gallery.mainConfig.pgms === 0 && gallery.mainConfig.outputs === 0
                                ? "Set hardware requirements to see recommendations"
                                : "No available systems match these requirements"}
                            </p>
                          </div>
                        );
                      }
                      const planA = recs[0];
                      const alternatives = recs.slice(1);
                      const renderSystemButton = (system: RecSystem, isPlanA?: boolean) => (
                        <button
                          key={system.id}
                          type="button"
                          onClick={() => {
                            const newGalleries = [...formData.galleries];
                            newGalleries[gIndex] = {
                              ...newGalleries[gIndex],
                              systemId: system.id,
                              name: system.name
                            };
                            setFormData({ ...formData, galleries: newGalleries });
                          }}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-xl border transition-all text-left max-w-sm",
                            gallery.systemId === system.id
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-600 ring-offset-2"
                              : isPlanA
                                ? "bg-gradient-to-br from-white to-blue-50/30 border-blue-200 shadow-sm hover:border-blue-400 hover:shadow-md hover:from-white hover:to-blue-50/80"
                                : system.conflictEventName 
                                  ? "bg-red-50/50 border-red-200 hover:border-red-400"
                                  : system.warnings?.length
                                    ? "bg-amber-50/50 border-amber-200 hover:border-amber-400"
                                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className={cn("w-3 h-3", gallery.systemId === system.id ? "text-white" : system.conflictEventName ? "text-red-500" : system.warnings?.length ? "text-amber-500" : isPlanA ? "text-blue-500" : "text-green-500")} />
                            <span className={cn("text-xs font-black uppercase tracking-tight", gallery.systemId !== system.id && system.conflictEventName ? "text-red-900" : gallery.systemId !== system.id && system.warnings?.length ? "text-amber-900" : isPlanA && gallery.systemId !== system.id ? "text-blue-900" : "")}>{system.name}</span>
                          </div>
                          <div className={cn(
                            "text-[8px] font-bold uppercase tracking-widest",
                            gallery.systemId === system.id ? "text-blue-100" : "text-slate-400"
                          )}>
                            {system.videoMatrix}
                          </div>
                          
                          {system.warnings && system.warnings.length > 0 && gallery.systemId === system.id && (
                            <div className="mt-2 flex flex-col gap-1 w-full">
                              {system.warnings.map((w: string, i: number) => {
                                const isConflict = w.includes("Sovrapposizione") || w.includes("Suggerimento");
                                return (
                                <span key={i} className={cn(
                                  "text-[9px] flex items-start gap-1 font-bold px-1.5 py-1 rounded border",
                                  gallery.systemId === system.id 
                                    ? (isConflict ? "bg-red-500/20 border-red-500/30 text-white" : "bg-blue-500/20 border-blue-500/30 text-white")
                                    : (isConflict ? "bg-red-100 border-red-200 text-red-700" : "bg-amber-100 border-amber-200 text-amber-700")
                                )}>
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                                  {w}
                                </span>
                              )})}
                            </div>
                          )}
                          {system.selectedMachines && system.selectedMachines.length > 0 && gallery.systemId === system.id && (
                            <div className={cn(
                              "mt-2 p-2 rounded-lg border w-full flex flex-col gap-1",
                              gallery.systemId === system.id 
                                ? "bg-blue-700/50 border-blue-500/50" 
                                : "bg-slate-50 border-slate-200"
                            )}>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest block mb-0.5",
                                gallery.systemId === system.id ? "text-blue-200" : "text-slate-500"
                              )}>
                                Hardware Selezionato:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {[...system.selectedMachines]
                                  .sort((a,b) => {
                                    // Sort by Type: Tracer > Integrator > Renderer
                                    const typeOrder = { 'Tracer': 1, 'Integrator': 2, 'Renderer': 3 };
                                    const typeA = typeOrder[a.type as keyof typeof typeOrder] || 4;
                                    const typeB = typeOrder[b.type as keyof typeof typeOrder] || 4;
                                    if (typeA !== typeB) return typeA - typeB;
                                    // Inside same type, extract numbers to sort
                                    const numA = parseInt(a.name.replace(/[^0-9]/g, ''), 10) || 0;
                                    const numB = parseInt(b.name.replace(/[^0-9]/g, ''), 10) || 0;
                                    return numA - numB;
                                  })
                                  .map(m => (
                                  <span key={m.id} className={cn(
                                    "text-[8px] font-bold px-1.5 py-0.5 rounded",
                                    gallery.systemId === system.id 
                                      ? "bg-blue-800 text-blue-100" 
                                      : "bg-white border border-slate-200 text-slate-600 shadow-sm"
                                  )}>
                                    {m.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                      return (
                        <div className="flex flex-col gap-6 w-full mb-4">
                          {/* PLAN A */}
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-600">
                                <Star className="w-3 h-3 fill-current" />
                              </span>
                              <label className="text-[11px] font-black tracking-widest text-slate-700 uppercase">
                                Plan A: Miglior Match
                              </label>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {renderSystemButton(planA, true)}
                            </div>
                          </div>
                          {/* ALTERNATIVES */}
                          {alternatives.length > 0 && (
                            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                              <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                                Alternative (Plan B+)
                              </label>
                              <div className="flex flex-wrap gap-3 opacity-90 hover:opacity-100 transition-opacity">
                                {alternatives.map(sys => renderSystemButton(sys, false))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Hardware Summary */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg mt-8 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <LayoutGrid className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-sm font-bold uppercase tracking-widest block">Total Hardware Units</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Across all galleries</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Main</p>
                  <p className="text-xl font-black text-white">
                    {formData.galleries.reduce((acc, g) => acc + g.mainConfig.cameras + g.mainConfig.pgms + g.mainConfig.outputs, 0)}
                  </p>
                </div>
                {formData.galleries.some(g => g.hasBackup) && (
                  <div className="text-center border-l border-white/10 pl-6">
                    <p className="text-[10px] text-blue-400 uppercase font-bold">Backup</p>
                    <p className="text-xl font-black text-blue-400">
                      {formData.galleries.reduce((acc, g) => acc + (g.hasBackup && g.backupConfig ? g.backupConfig.cameras + g.backupConfig.pgms + g.backupConfig.outputs : 0), 0)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECOND MAP: Virtual Assets and Layout Preview */}
            <div className="space-y-12">
              {formData.galleries.map((gallery, gIndex) => (
                <div key={`${gallery.id}-assets`} className="space-y-6">
                  {formData.galleries.length > 1 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-slate-100"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                        {gallery.name} - Assets
                      </span>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                  )}

                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-blue-500" />
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Virtual Assets</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'LED', 
                        'LED-Domination', 
                        'LED-Jumbo', 
                        'Carpets', 
                        'Carpets on Carpets', 
                        'Center Circle',
                        'Additional',
                        'Static Board'
                      ].map((asset) => {
                        const isActive = gallery.virtualAssets?.includes(asset);
                        return (
                          <button
                            key={asset}
                            type="button"
                            onClick={() => {
                              const newGalleries = [...formData.galleries];
                              const currentAssets = newGalleries[gIndex].virtualAssets || [];
                              if (isActive) {
                                newGalleries[gIndex] = {
                                  ...newGalleries[gIndex],
                                  virtualAssets: currentAssets.filter(a => a !== asset)
                                };
                              } else {
                                newGalleries[gIndex] = {
                                  ...newGalleries[gIndex],
                                  virtualAssets: [...currentAssets, asset]
                                };
                              }
                              setFormData({ ...formData, galleries: newGalleries });
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                              isActive 
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                                : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                            )}
                          >
                            {asset}
                          </button>
                        );
                      })}

                      {/* Custom Assets */}
                      {gallery.virtualAssets?.filter(a => ![
                        'LED', 'LED-Domination', 'LED-Jumbo', 'Carpets', 'Carpets on Carpets', 'Center Circle', 'Additional', 'Static Board'
                      ].includes(a)).map((asset) => (
                        <button
                          key={asset}
                          type="button"
                          onClick={() => {
                            const newGalleries = [...formData.galleries];
                            const currentAssets = newGalleries[gIndex].virtualAssets || [];
                            newGalleries[gIndex] = {
                              ...newGalleries[gIndex],
                              virtualAssets: currentAssets.filter(a => a !== asset)
                            };
                            setFormData({ ...formData, galleries: newGalleries });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-blue-600 border-blue-600 text-white shadow-sm flex items-center gap-2"
                        >
                          {asset}
                          <Minus className="w-3 h-3" />
                        </button>
                      ))}

                      {/* Add Button */}
                      {addingAssetToGallery === gallery.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={newAssetValue}
                            onChange={(e) => setNewAssetValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newAssetValue.trim()) {
                                  const newGalleries = [...formData.galleries];
                                  const currentAssets = newGalleries[gIndex].virtualAssets || [];
                                  if (!currentAssets.includes(newAssetValue.trim())) {
                                    newGalleries[gIndex] = {
                                      ...newGalleries[gIndex],
                                      virtualAssets: [...currentAssets, newAssetValue.trim()]
                                    };
                                    setFormData({ ...formData, galleries: newGalleries });
                                  }
                                  setNewAssetValue('');
                                  setAddingAssetToGallery(null);
                                }
                              } else if (e.key === 'Escape') {
                                setAddingAssetToGallery(null);
                                setNewAssetValue('');
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-300 outline-none focus:ring-2 focus:ring-blue-500 w-32"
                            placeholder="Asset name..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newAssetValue.trim()) {
                                const newGalleries = [...formData.galleries];
                                const currentAssets = newGalleries[gIndex].virtualAssets || [];
                                if (!currentAssets.includes(newAssetValue.trim())) {
                                  newGalleries[gIndex] = {
                                    ...newGalleries[gIndex],
                                    virtualAssets: [...currentAssets, newAssetValue.trim()]
                                  };
                                  setFormData({ ...formData, galleries: newGalleries });
                                }
                                setNewAssetValue('');
                                setAddingAssetToGallery(null);
                              }
                            }}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddingAssetToGallery(gallery.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          ADD
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Layout Preview Section */}
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-blue-500" />
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Layout Preview / Disposition</label>
                      </div>
                      {gallery.layoutPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            const newGalleries = [...formData.galleries];
                            newGalleries[gIndex] = { ...newGalleries[gIndex], layoutPreview: '' };
                            setFormData({ ...formData, galleries: newGalleries });
                          }}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Remove
                        </button>
                      )}
                    </div>

                    {gallery.layoutPreview ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video">
                        <img 
                          src={gallery.layoutPreview} 
                          alt="Layout Preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer bg-white px-4 py-2 rounded-lg text-xs font-bold text-slate-900 shadow-lg flex items-center gap-2 hover:bg-slate-50 transition-colors">
                            <Upload className="w-4 h-4" />
                            Change Image
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 1024 * 1024) {
                                    alert("Image too large. Please upload an image smaller than 1MB.");
                                    return;
                                  }
                                  const base64 = await fileToBase64(file);
                                  const newGalleries = [...formData.galleries];
                                  newGalleries[gIndex] = { ...newGalleries[gIndex], layoutPreview: base64 };
                                  setFormData({ ...formData, galleries: newGalleries });
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-slate-300 group-hover:text-blue-400 mb-2 transition-colors" />
                          <p className="text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors uppercase tracking-widest">Upload Layout Preview</p>
                          <p className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 1MB</p>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1024 * 1024) {
                                alert("Image too large. Please upload an image smaller than 1MB.");
                                return;
                              }
                              const base64 = await fileToBase64(file);
                              const newGalleries = [...formData.galleries];
                              newGalleries[gIndex] = { ...newGalleries[gIndex], layoutPreview: base64 };
                              setFormData({ ...formData, galleries: newGalleries });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
              {/* External Links Section */}
              <div className="pt-8 border-t border-slate-200 mt-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">External Links</h3>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-4 items-start">
                  <div className="p-2 bg-blue-100/50 rounded-lg shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Project Hub URL</label>
                    <input 
                      type="url"
                      className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm placeholder:text-slate-400"
                      value={formData.projectHubUrl}
                      onChange={e => setFormData({ ...formData, projectHubUrl: e.target.value })}
                      placeholder="https://hub.example.com/project/..."
                    />
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Add the direct link to the project on the builder platform. It will be clickable in the dashboard.</p>
                  </div>
                </div>
              </div>
              {/* Signals & Transport Section */}
              <div id="signals" className="pt-8 border-t border-slate-200 mt-8 mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
                  Signals & Transport
                </h3>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-8">
                  
                  {/* Inputs Section */}
                  <div>
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Input Signals</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Number of Inputs</label>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, inputsCount: Math.max(1, prev.signalsTransport.inputsCount - 1)}}))}
                              className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <div className="w-16 h-10 bg-white border border-slate-200 rounded-lg font-bold flex items-center justify-center shadow-inner">
                              {formData.signalsTransport.inputsCount}
                            </div>
                            <button 
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, inputsCount: prev.signalsTransport.inputsCount + 1}}))}
                              className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Signal Type</label>
                          <div className="flex bg-slate-200/50 p-1 rounded-lg">
                            {['Clean', 'GFX'].map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, signalType: type}}))}
                                className={cn(
                                  "flex-1 py-2 text-xs font-bold rounded-md transition-all uppercase tracking-widest",
                                  formData.signalsTransport.signalType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Color Profile</label>
                          <div className="flex bg-slate-200/50 p-1 rounded-lg">
                            {['SDR', 'HDR'].map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, colorProfile: type}}))}
                                className={cn(
                                  "flex-1 py-2 text-xs font-bold rounded-md transition-all uppercase tracking-widest",
                                  formData.signalsTransport.colorProfile === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                     </div>
                  </div>
                  {/* Transport Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Main Transport</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Fiber', 'SRT', 'Satellite'].map(type => {
                          const isSelected = (formData.signalsTransport.transportTypesMain || []).includes(type);
                          return (
                            <button
                              key={`main-${type}`}
                              type="button"
                              onClick={() => {
                                setFormData(prev => {
                                  const list = new Set(prev.signalsTransport.transportTypesMain || []);
                                  if (list.has(type)) list.delete(type);
                                  else list.add(type);
                                  return {...prev, signalsTransport: {...prev.signalsTransport, transportTypesMain: Array.from(list)}};
                                })
                              }}
                              className={cn(
                                "px-4 py-2 rounded border text-xs font-bold uppercase tracking-widest transition-all shadow-sm",
                                isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                              )}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Backup Transport</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Fiber', 'SRT', 'Satellite'].map(type => {
                          const isSelected = (formData.signalsTransport.transportTypesBck || []).includes(type);
                          return (
                            <button
                              key={`bck-${type}`}
                              type="button"
                              onClick={() => {
                                setFormData(prev => {
                                  const list = new Set(prev.signalsTransport.transportTypesBck || []);
                                  if (list.has(type)) list.delete(type);
                                  else list.add(type);
                                  return {...prev, signalsTransport: {...prev.signalsTransport, transportTypesBck: Array.from(list)}};
                                })
                              }}
                              className={cn(
                                "px-4 py-2 rounded border text-xs font-bold uppercase tracking-widest transition-all shadow-sm",
                                isSelected ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
                              )}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Standard & Config */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Video Standard</label>
                      <input 
                        type="text"
                         className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium shadow-sm"
                         value={formData.signalsTransport.videoStandard}
                         onChange={e => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, videoStandard: e.target.value}}))}
                         placeholder="es. 1080p50, 2160p50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Audio Config</label>
                      <input 
                        type="text"
                         className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium shadow-sm"
                         value={formData.signalsTransport.audioConfig}
                         onChange={e => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, audioConfig: e.target.value}}))}
                         placeholder="es. 4 Pairs (8 Channels)"
                      />
                    </div>
                  </div>
                  {/* Transport Details */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Network / Transport Details (SRT, Satellite, Fiber)</h4>
                      <button 
                        type="button" 
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev, 
                            signalsTransport: {
                              ...prev.signalsTransport, 
                              transportDetails: [...(prev.signalsTransport.transportDetails || []), { id: crypto.randomUUID(), type: 'SRT', primaryInfo: '', secondaryInfo: '', notes: '' }]
                            }
                          }))
                        }}
                        className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded uppercase tracking-widest flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Aggiungi
                      </button>
                    </div>
                    
                    {(formData.signalsTransport.transportDetails && formData.signalsTransport.transportDetails.length > 0) ? (
                      <div className="space-y-2">
                        {formData.signalsTransport.transportDetails.map((dec: any, index: number) => (
                           <div key={dec.id} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                             <div className="w-full md:w-32 shrink-0">
                               <select 
                                 className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                 value={dec.type || 'SRT'}
                                 onChange={e => {
                                    const newDetails = [...formData.signalsTransport.transportDetails];
                                    newDetails[index].type = e.target.value;
                                    setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, transportDetails: newDetails}}));
                                 }}
                               >
                                 <option value="SRT">SRT</option>
                                 <option value="Satellite">Satellite</option>
                                 <option value="Fiber">Fibra</option>
                                 <option value="Other">Altro</option>
                               </select>
                             </div>
                             <div className="w-full md:w-1/4 shrink-0">
                               <input 
                                  placeholder={dec.type === 'SRT' ? "IP Address..." : dec.type === 'Satellite' ? "Nome Satellite..." : dec.type === 'Fiber' ? "Provider (es. Synopsi)..." : "Dettaglio..."}
                                  className="w-full text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                  value={dec.primaryInfo || ''}
                                  onChange={e => {
                                    const newDetails = [...formData.signalsTransport.transportDetails];
                                    newDetails[index].primaryInfo = e.target.value;
                                    setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, transportDetails: newDetails}}));
                                  }}
                               />
                             </div>
                             <div className="w-full md:w-32 shrink-0">
                               <input 
                                  placeholder={dec.type === 'SRT' ? "Port (Opz)..." : dec.type === 'Satellite' ? "Freq/Pol..." : "Rif. RX..."}
                                  className="w-full text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                  value={dec.secondaryInfo || ''}
                                  onChange={e => {
                                    const newDetails = [...formData.signalsTransport.transportDetails];
                                    newDetails[index].secondaryInfo = e.target.value;
                                    setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, transportDetails: newDetails}}));
                                  }}
                               />
                             </div>
                             <div className="w-full md:flex-1 flex gap-2">
                               <input 
                                  placeholder="Note routing..."
                                  className="w-full text-xs font-medium bg-slate-50 border border-slate-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                  value={dec.notes || ''}
                                  onChange={e => {
                                    const newDetails = [...formData.signalsTransport.transportDetails];
                                    newDetails[index].notes = e.target.value;
                                    setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, transportDetails: newDetails}}));
                                  }}
                               />
                               <button
                                 type="button"
                                 onClick={() => {
                                   const newDetails = formData.signalsTransport.transportDetails.filter((_: any, i: number) => i !== index);
                                   setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, transportDetails: newDetails}}));
                                 }}
                                 className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                               >
                                 <X className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 bg-white p-3 rounded border border-slate-100 uppercase tracking-widest text-center">
                        Nessun dettaglio aggiunto
                      </div>
                    )}
                  </div>
                  {/* Outputs Section */}
                  <div className="pt-6 border-t border-slate-200">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Output Signals</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Number of Outputs</label>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, outputsCount: Math.max(1, prev.signalsTransport.outputsCount - 1)}}))}
                              className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <div className="w-16 h-10 bg-white border border-slate-200 rounded-lg font-bold flex items-center justify-center shadow-inner">
                              {formData.signalsTransport.outputsCount}
                            </div>
                            <button 
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, outputsCount: prev.signalsTransport.outputsCount + 1}}))}
                              className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Delivery Mode</label>
                          <div className="flex bg-slate-200/50 p-1 rounded-lg">
                            {['Main Only', 'Main + Backup'].map(type => (
                              <button
                                key={`del-${type}`}
                                type="button"
                                onClick={() => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, outputDelivery: type}}))}
                                className={cn(
                                  "flex-1 py-2 text-xs font-bold rounded-md transition-all uppercase tracking-widest",
                                  formData.signalsTransport.outputDelivery === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Output Transport</h4>
                          <div className="flex flex-wrap gap-2">
                            {['Fiber', 'SRT', 'Satellite'].map(type => {
                              const isSelected = (formData.signalsTransport.outputTransportTypes || []).includes(type);
                              return (
                                <button
                                  key={`out-${type}`}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => {
                                      const list = new Set(prev.signalsTransport.outputTransportTypes || []);
                                      if (list.has(type)) list.delete(type);
                                      else list.add(type);
                                      return {...prev, signalsTransport: {...prev.signalsTransport, outputTransportTypes: Array.from(list)}};
                                    })
                                  }}
                                  className={cn(
                                    "px-4 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm flex-1",
                                    isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300"
                                  )}
                                >
                                  {type}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* Output Transport Details */}
                        <div className="w-full col-span-full">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Network / Transport Details (SRT, Satellite, Fiber)</h4>
                            <button 
                              type="button" 
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev, 
                                  signalsTransport: {
                                    ...prev.signalsTransport, 
                                    outputTransportDetails: [...(prev.signalsTransport.outputTransportDetails || []), { id: crypto.randomUUID(), type: 'SRT', primaryInfo: '', secondaryInfo: '', notes: '' }]
                                  }
                                }))
                              }}
                              className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded uppercase tracking-widest flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Aggiungi
                            </button>
                          </div>
                          
                          {(formData.signalsTransport.outputTransportDetails && formData.signalsTransport.outputTransportDetails.length > 0) ? (
                            <div className="space-y-2">
                              {formData.signalsTransport.outputTransportDetails.map((dec: any, index: number) => (
                                <div key={dec.id} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                  <div className="w-full md:w-32 shrink-0">
                                    <select 
                                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                      value={dec.type || 'SRT'}
                                      onChange={e => {
                                          const newDetails = [...formData.signalsTransport.outputTransportDetails];
                                          newDetails[index].type = e.target.value;
                                          setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, outputTransportDetails: newDetails}}));
                                      }}
                                    >
                                      <option value="SRT">SRT</option>
                                      <option value="Satellite">Satellite</option>
                                      <option value="Fiber">Fibra</option>
                                      <option value="Other">Altro</option>
                                    </select>
                                  </div>
                                  <div className="w-full md:w-1/4 shrink-0">
                                    <input 
                                        placeholder={dec.type === 'SRT' ? "IP Address..." : dec.type === 'Satellite' ? "Nome Satellite..." : dec.type === 'Fiber' ? "Provider (es. Synopsi)..." : "Dettaglio..."}
                                        className="w-full text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={dec.primaryInfo || ''}
                                        onChange={e => {
                                          const newDetails = [...formData.signalsTransport.outputTransportDetails];
                                          newDetails[index].primaryInfo = e.target.value;
                                          setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, outputTransportDetails: newDetails}}));
                                        }}
                                    />
                                  </div>
                                  <div className="w-full md:w-32 shrink-0">
                                    <input 
                                        placeholder={dec.type === 'SRT' ? "Port (Opz)..." : dec.type === 'Satellite' ? "Freq/Pol..." : "Rif. RX..."}
                                        className="w-full text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={dec.secondaryInfo || ''}
                                        onChange={e => {
                                          const newDetails = [...formData.signalsTransport.outputTransportDetails];
                                          newDetails[index].secondaryInfo = e.target.value;
                                          setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, outputTransportDetails: newDetails}}));
                                        }}
                                    />
                                  </div>
                                  <div className="w-full md:flex-1 flex gap-2">
                                    <input 
                                        placeholder="Note routing..."
                                        className="w-full text-xs font-medium bg-slate-50 border border-slate-100 px-3 py-2 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                        value={dec.notes || ''}
                                        onChange={e => {
                                          const newDetails = [...formData.signalsTransport.outputTransportDetails];
                                          newDetails[index].notes = e.target.value;
                                          setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, outputTransportDetails: newDetails}}));
                                        }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newDetails = formData.signalsTransport.outputTransportDetails.filter((_: any, i: number) => i !== index);
                                        setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, outputTransportDetails: newDetails}}));
                                      }}
                                      className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">Nessun dettaglio di output aggiunto</div>
                          )}
                        </div>
                     </div>
                  </div>
                  {/* General Notes */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Transport & Routing Notes</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium shadow-sm resize-y"
                      rows={3}
                      value={formData.signalsTransport.notes || ''}
                      onChange={e => setFormData(prev => ({...prev, signalsTransport: {...prev.signalsTransport, notes: e.target.value}}))}
                      placeholder="Note aggiuntive su fibra, satelliti o passaggi intermedi Nimbra..."
                    ></textarea>
                  </div>
                </div>
              </div>
              {/* Schedule Section */}
              <div id="schedule" className="pt-8 border-t border-slate-200 mt-8 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                    Running Order / Schedule
                  </h3>
                  <button 
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev, 
                        schedule: [...(prev.schedule || []), { id: crypto.randomUUID(), date: '', time: '', activity: '', notes: '' }]
                      }))
                    }}
                    className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded uppercase tracking-widest flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Aggiungi Riga
                  </button>
                </div>
                
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {(!formData.schedule || formData.schedule.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 text-sm font-medium italic">
                      Nessun orario definito. Aggiungi attività per creare il running order.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest font-black">
                          <th className="p-3 w-32 border-r border-slate-200">Date</th>
                          <th className="p-3 w-32 border-r border-slate-200">Time</th>
                          <th className="p-3 w-1/3 border-r border-slate-200">Activity</th>
                          <th className="p-3">Notes</th>
                          <th className="p-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.schedule.map((item, index) => (
                          <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="p-2 border-r border-slate-200">
                              <input 
                                type="date"
                                className="w-full text-xs font-mono bg-transparent border-0 focus:ring-0 px-2 outline-none"
                                value={item.date || ''}
                                onChange={e => {
                                  const newSchedule = [...(formData.schedule || [])];
                                  newSchedule[index].date = e.target.value;
                                  setFormData(prev => ({...prev, schedule: newSchedule}));
                                }}
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <input 
                                type="time"
                                className="w-full text-xs font-mono bg-transparent border-0 focus:ring-0 px-2 outline-none"
                                value={item.time}
                                onChange={e => {
                                  const newSchedule = [...formData.schedule];
                                  newSchedule[index].time = e.target.value;
                                  setFormData(prev => ({...prev, schedule: newSchedule}));
                                }}
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <input 
                                type="text"
                                placeholder="Descrizione attività..."
                                className="w-full text-xs font-medium bg-transparent border-0 focus:ring-0 px-2 outline-none"
                                value={item.activity}
                                onChange={e => {
                                  const newSchedule = [...formData.schedule];
                                  newSchedule[index].activity = e.target.value;
                                  setFormData(prev => ({...prev, schedule: newSchedule}));
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text"
                                placeholder="Note aggiuntive..."
                                className="w-full text-xs text-slate-500 bg-transparent border-0 focus:ring-0 px-2 outline-none"
                                value={item.notes}
                                onChange={e => {
                                  const newSchedule = [...formData.schedule];
                                  newSchedule[index].notes = e.target.value;
                                  setFormData(prev => ({...prev, schedule: newSchedule}));
                                }}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev, 
                                    schedule: prev.schedule.filter((_: any, i: number) => i !== index)
                                  }));
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              {/* Costs Section */}
             {profile?.role === 'admin' && (
              <div id="costs" className="pt-8 border-t border-slate-200 mt-8 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Production Costs
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Voci di costo sostenute per l'evento</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev, 
                        costs: [...(prev.costs || []), { id: crypto.randomUUID(), description: '', amount: 0, type: 'Flat' }]
                      }))
                    }}
                    className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded uppercase tracking-widest flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Aggiungi Costo
                  </button>
                </div>
                
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                  {(!formData.costs || formData.costs.length === 0) ? (
                    <div className="text-center text-slate-400 text-sm font-medium italic">
                      Nessun costo registrato.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.costs.map((cost, index) => (
                         <div key={cost.id} className="flex gap-3 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                           <div className="flex-1">
                             <input 
                               placeholder="Descrizione (es. Affitto fibra, Personale extra...)"
                               className="w-full text-sm font-medium bg-transparent border-0 focus:ring-0 px-2 outline-none"
                               value={cost.description}
                               onChange={e => {
                                 const newCosts = [...formData.costs];
                                 newCosts[index].description = e.target.value;
                                 setFormData(prev => ({...prev, costs: newCosts}));
                               }}
                             />
                           </div>
                           <select
                            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-md py-2 px-2 outline-none"
                            value={cost.type || 'Flat'}
                            onChange={e => {
                              const newCosts = [...formData.costs];
                              newCosts[index].type = e.target.value;
                              setFormData(prev => ({...prev, costs: newCosts}));
                            }}
                           >
                            <option value="Flat">Flat</option>
                            <option value="Hourly">Hourly</option>
                           </select>
                           <div className="w-40 relative flex items-center">
                             <span className="absolute left-3 text-slate-400 font-bold">€</span>
                             <input 
                               type="number"
                               min="0"
                               step="0.01"
                               className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-md py-2 pl-8 pr-3 focus:ring-2 focus:ring-emerald-500 outline-none text-right"
                               value={cost.amount || ''}
                               onChange={e => {
                                 const newCosts = [...formData.costs];
                                 newCosts[index].amount = parseFloat(e.target.value) || 0;
                                 setFormData(prev => ({...prev, costs: newCosts}));
                               }}
                             />
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               setFormData(prev => ({
                                 ...prev, 
                                 costs: prev.costs.filter((_: any, i: number) => i !== index)
                               }));
                             }}
                             className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                           >
                             <X className="w-5 h-5" />
                           </button>
                         </div>
                      ))}
                      {/* Total Bar */}
                      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end items-center gap-4">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Totale Stimato:</span>
                        <div className="bg-emerald-100 text-emerald-800 font-black text-lg px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                          € {formData.costs.reduce((acc, curr) => {
                              const baseAmount = curr.amount || 0;
                              if (curr.type === 'Hourly' && formData.startDate && formData.endDate) {
                                  const start = new Date(formData.startDate).getTime();
                                  const end = new Date(formData.endDate).getTime();
                                  const durationHours = Math.max(0, (end - start) / (1000 * 60 * 60));
                                  return acc + (baseAmount * durationHours);
                              }
                              return acc + baseAmount;
                          }, 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
             )}
          </section>
          </div>
          <div className="shrink-0 border-t border-slate-200 flex justify-between items-center bg-white px-8 py-6 rounded-b-2xl">
            {event && (
              showConfirmDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-red-600 font-medium">Are you sure?</span>
                  <button 
                    type="button" 
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Yes, delete
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmDelete(false)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-red-600 hover:text-red-700 font-bold text-sm flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  Delete
                </button>
              )
            )}
            <div className="flex gap-3 ml-auto">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              {/* PDF Export Dropdown/Buttons */}
              {profile?.role === 'admin' ? (
                <div className="relative group/export">
                  <button type="button" className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export PDF
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-full mb-2 right-0 hidden group-hover/export:block w-48 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden shadow-black/10 z-50">
                    <div className="py-1 flex flex-col">
                    {['Full', 'No Costs', 'Costs Only'].map((opt) => {
                      return (
                        <button
                            key={opt}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                import('../lib/pdf-export').then(lib => {
                                    const params = {
                                        includeCosts: opt !== 'No Costs',
                                        onlyCosts: opt === 'Costs Only'
                                    };
                                    lib.exportPDF(event || formData, params.includeCosts, params.onlyCosts, profile?.role || 'operator', coverWorkorder);
                                });
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 border-b border-slate-100 last:border-b-0 transition-colors"
                        >
                            Export {opt === 'Full' ? 'completo' : opt === 'No Costs' ? 'produzione' : 'solo costi'}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        import('../lib/pdf-export').then(lib => {
                            lib.exportPDF(event || formData, false, false, profile?.role || 'operator', coverWorkorder);
                        });
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Export Produzione
                </button>
              )}
              {profile?.role !== 'operator' && (
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {event ? 'Save Changes' : 'Create Event'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  </div>
);
};