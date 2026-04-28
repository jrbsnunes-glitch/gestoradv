'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface CalendarEvent {
  id: string;
  type: 'prazo' | 'tarefa';
  title: string;
  date: string;
  status: string;
  urgencia?: string;
  prioridade?: string;
  processoNumero?: string;
  processoId?: string;
  responsavel?: string;
}

export default function AgendaPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);

  const rangeStart = new Date(currentYear, currentMonth, 1 - firstDay.getDay());
  const rangeEnd = new Date(lastDay);
  rangeEnd.setDate(rangeEnd.getDate() + (6 - lastDay.getDay()));

  const de = rangeStart.toISOString().slice(0, 10);
  const ate = rangeEnd.toISOString().slice(0, 10);

  const { data } = useQuery({
    queryKey: ['agenda', de, ate],
    queryFn: () => api.get<any>(`/relatorios/agenda?de=${de}&ate=${ate}`),
  });

  const events: CalendarEvent[] = data?.events || [];

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(evt => {
      const d = new Date(evt.date).toISOString().slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(evt);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const start = new Date(rangeStart);
    while (start <= rangeEnd) {
      days.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }
    return days;
  }, [currentMonth, currentYear]);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDate(null);
  };

  const goToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today.toISOString().slice(0, 10));
  };

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prazos e tarefas no calendário</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">
            Hoje
          </button>
          <div className="flex rounded-lg border border-border">
            <button onClick={() => setView('month')} className={cn('px-3 py-2 text-sm font-medium', view === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
              Mês
            </button>
            <button onClick={() => setView('week')} className={cn('px-3 py-2 text-sm font-medium', view === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}>
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Navegação do mês */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {MESES[currentMonth]} {currentYear}
        </h2>
        <button onClick={nextMonth} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Header dias da semana */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
            </div>
            {/* Grid dias */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dateStr = day.toISOString().slice(0, 10);
                const isCurrentMonth = day.getMonth() === currentMonth;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const dayEvents = eventsByDate[dateStr] || [];
                const hasPrazo = dayEvents.some(e => e.type === 'prazo');
                const hasTarefa = dayEvents.some(e => e.type === 'tarefa');
                const hasUrgent = dayEvents.some(e => e.urgencia === 'CRITICA' || e.urgencia === 'ALTA' || e.prioridade === 'URGENTE');

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      'relative flex min-h-[80px] flex-col border-b border-r border-border p-1.5 text-left transition hover:bg-muted/30',
                      !isCurrentMonth && 'bg-muted/10 opacity-50',
                      isSelected && 'bg-primary/5 ring-2 ring-primary/30',
                      isToday && 'bg-primary/5',
                    )}
                  >
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday && 'bg-primary text-primary-foreground',
                      !isToday && isCurrentMonth && 'text-foreground',
                    )}>
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map(evt => (
                          <div
                            key={evt.id}
                            className={cn(
                              'truncate rounded px-1 py-0.5 text-[10px] font-medium',
                              evt.type === 'prazo' && 'bg-warning/10 text-warning',
                              evt.type === 'tarefa' && 'bg-info/10 text-info',
                              (evt.urgencia === 'CRITICA' || evt.prioridade === 'URGENTE') && 'bg-destructive/10 text-destructive',
                            )}
                          >
                            {evt.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</p>
                        )}
                      </div>
                    )}
                    {/* Indicadores */}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 right-1 flex gap-0.5">
                        {hasPrazo && <div className="h-1.5 w-1.5 rounded-full bg-warning" />}
                        {hasTarefa && <div className="h-1.5 w-1.5 rounded-full bg-info" />}
                        {hasUrgent && <div className="h-1.5 w-1.5 rounded-full bg-destructive" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-warning" /> Prazo</div>
            <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-info" /> Tarefa</div>
            <div className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-destructive" /> Urgente</div>
          </div>
        </div>

        {/* Painel lateral - eventos do dia selecionado */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {selectedDate
              ? `Eventos de ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : 'Selecione um dia'}
          </h3>
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground">Clique em um dia do calendário para ver os eventos.</p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map(evt => (
                <div key={evt.id} className={cn(
                  'rounded-lg border p-3',
                  evt.type === 'prazo' ? 'border-warning/30 bg-warning/5' : 'border-info/30 bg-info/5',
                )}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      evt.type === 'prazo' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info',
                    )}>
                      {evt.type}
                    </span>
                    {(evt.urgencia || evt.prioridade) && (
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        (evt.urgencia === 'CRITICA' || evt.prioridade === 'URGENTE') && 'bg-destructive/10 text-destructive',
                        (evt.urgencia === 'ALTA' || evt.prioridade === 'ALTA') && 'bg-warning/10 text-warning',
                        (evt.urgencia === 'MEDIA' || evt.prioridade === 'MEDIA') && 'bg-muted text-muted-foreground',
                      )}>
                        {evt.urgencia || evt.prioridade}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{evt.title}</p>
                  {evt.processoNumero && (
                    <p className="text-xs text-muted-foreground">Processo: {evt.processoNumero}</p>
                  )}
                  {evt.responsavel && (
                    <p className="text-xs text-muted-foreground">Responsável: {evt.responsavel}</p>
                  )}
                  <div className="mt-1">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      evt.status === 'PENDENTE' && 'bg-warning/10 text-warning',
                      evt.status === 'EM_ANDAMENTO' && 'bg-info/10 text-info',
                      evt.status === 'CUMPRIDO' && 'bg-success/10 text-success',
                      evt.status === 'CONCLUIDA' && 'bg-success/10 text-success',
                    )}>
                      {evt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
