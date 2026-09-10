'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';

interface Atendimento {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  canal: string;
  assunto?: string;
  mensagemOriginal: string;
  areaDetectada?: string;
  urgencia: number;
  complexidade?: string;
  viabilidade?: number;
  valorEstimado?: string | number | null;
  motivoPerda?: string;
  slaFirstResponseAt?: string | null;
  status: string;
  clienteId?: string;
  responsavelId?: string;
  processoId?: string;
  responsavel?: { id: string; name: string };
  cliente?: { user: { id: string; name: string; email: string } };
  _count?: { mensagens: number };
  etapaBot?: string;
  dadosBot?: any;
  createdAt: string;
  updatedAt: string;
  mensagens?: Mensagem[];
}

interface Mensagem {
  id: string;
  remetente: string;
  conteudo: string;
  enviadaVia?: string;
  createdAt: string;
}

interface AtendimentoListResponse {
  data: Atendimento[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface User {
  id: string;
  name: string;
  role: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NOVO: { label: 'Novo', color: 'bg-blue-100 text-blue-800' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', color: 'bg-yellow-100 text-yellow-800' },
  RESPONDIDO: { label: 'Respondido', color: 'bg-green-100 text-green-800' },
  EM_ANALISE: { label: 'Em Análise', color: 'bg-indigo-100 text-indigo-800' },
  CONVERTIDO: { label: 'Convertido', color: 'bg-emerald-100 text-emerald-800' },
  PERDIDO: { label: 'Perdido', color: 'bg-rose-100 text-rose-800' },
  ENCERRADO: { label: 'Encerrado', color: 'bg-gray-100 text-gray-600' },
  ARQUIVADO: { label: 'Arquivado', color: 'bg-gray-100 text-gray-400' },
};

const CANAL_ICON: Record<string, string> = {
  WHATSAPP: '📱',
  FORMULARIO: '📝',
  EMAIL: '📧',
  TELEFONE: '📞',
};

const AREA_OPTIONS = [
  'TRABALHISTA',
  'CIVIL',
  'PENAL',
  'FAMILIA',
  'TRIBUTARIO',
  'PREVIDENCIARIO',
  'ADMINISTRATIVO',
  'EMPRESARIAL',
  'CONSUMIDOR',
  'AMBIENTAL',
  'OUTRO',
];

const AREA_LABEL_TO_ENUM: Record<string, string> = {
  trabalhista: 'TRABALHISTA',
  civil: 'CIVIL',
  penal: 'PENAL',
  familia: 'FAMILIA',
  família: 'FAMILIA',
  tributario: 'TRIBUTARIO',
  tributário: 'TRIBUTARIO',
  previdenciario: 'PREVIDENCIARIO',
  previdenciário: 'PREVIDENCIARIO',
  administrativo: 'ADMINISTRATIVO',
  empresarial: 'EMPRESARIAL',
  consumidor: 'CONSUMIDOR',
  ambiental: 'AMBIENTAL',
  outro: 'OUTRO',
};

function areaToEnum(area?: string | null): string | null {
  if (!area) return null;
  const norm = area.toString().toLowerCase().trim();
  return AREA_LABEL_TO_ENUM[norm] || null;
}

interface ClienteOption {
  id: string;
  cpfCnpj?: string;
  user?: { name: string; email?: string };
}

function AtendimentosPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'inbox' | 'pecas'>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setFilterStatus(status);
  }, [searchParams]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atendimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inbox de atendimentos de clientes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('inbox')}
            className={cn('px-4 py-2 text-sm font-medium rounded-lg transition',
              tab === 'inbox' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-gray-200')}
          >
            Inbox
          </button>
          <button
            onClick={() => setTab('pecas')}
            className={cn('px-4 py-2 text-sm font-medium rounded-lg transition',
              tab === 'pecas' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-gray-200')}
          >
            Gerar Peças (IA)
          </button>
        </div>
      </div>

      {tab === 'inbox' ? (
        <InboxView
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          page={page}
          setPage={setPage}
        />
      ) : (
        <PecasView />
      )}
    </div>
  );
}

export default function AtendimentosPage() {
  return (
    <Suspense>
      <AtendimentosPageInner />
    </Suspense>
  );
}

function InboxView({
  selectedId, setSelectedId, filterStatus, setFilterStatus, page, setPage,
}: {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  page: number;
  setPage: (p: number) => void;
}) {
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['atendimentos', filterStatus, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      params.set('page', String(page));
      params.set('limit', '30');
      return api.get<AtendimentoListResponse>(`/atendimentos?${params}`);
    },
    refetchInterval: 15000,
  });

  const statsQuery = useQuery({
    queryKey: ['atendimentos-stats'],
    queryFn: () =>
      api.get<{
        novos: number;
        emAtendimento: number;
        respondidos: number;
        emAnalise: number;
        convertidos: number;
        perdidos: number;
        total: number;
      }>('/atendimentos/stats'),
    refetchInterval: 15000,
  });

  const atendimentos = listQuery.data?.data || [];
  const meta = listQuery.data?.meta;
  const stats = statsQuery.data;

  return (
    <div className="flex flex-1 gap-4 overflow-hidden">
      {/* Left panel - list */}
      <div className="w-[380px] flex flex-col rounded-xl border border-border bg-card overflow-hidden shrink-0">
        {/* Stats */}
        {stats && (
          <div className="flex flex-wrap gap-1.5 p-3 border-b border-border text-xs">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{stats.novos} Novos</span>
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">{stats.emAtendimento} Em atend.</span>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">{stats.emAnalise} Análise</span>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">{stats.convertidos} Convertidos</span>
            <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-medium">{stats.perdidos} Perdidos</span>
          </div>
        )}

        {/* Filter */}
        <div className="p-3 border-b border-border">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
          >
            <option value="">Todos os status</option>
            <option value="NOVO">Novos</option>
            <option value="EM_ATENDIMENTO">Em Atendimento</option>
            <option value="RESPONDIDO">Respondidos</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="CONVERTIDO">Convertidos</option>
            <option value="PERDIDO">Perdidos</option>
            <option value="ENCERRADO">Encerrados</option>
            <option value="ARQUIVADO">Arquivados</option>
          </select>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {atendimentos.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum atendimento encontrado
            </div>
          ) : (
            atendimentos.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={cn(
                  'w-full text-left p-3 border-b border-border hover:bg-muted/50 transition',
                  selectedId === a.id && 'bg-primary/5 border-l-4 border-l-primary',
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{CANAL_ICON[a.canal] || '💬'}</span>
                  <span className="font-medium text-sm truncate flex-1">{a.nome}</span>
                  {a.urgencia >= 8 && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">URGENTE</span>
                  )}
                  {!a.clienteId && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">novo</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mb-1">
                  {a.assunto || a.mensagemOriginal.slice(0, 80)}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn('px-1.5 py-0.5 rounded font-medium', STATUS_MAP[a.status]?.color)}>
                    {STATUS_MAP[a.status]?.label || a.status}
                  </span>
                  {a.areaDetectada && (
                    <span className="text-muted-foreground">{a.areaDetectada}</span>
                  )}
                  <span className="ml-auto text-muted-foreground">{timeAgo(a.createdAt)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border text-xs">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded bg-muted disabled:opacity-50"
            >Ant.</button>
            <span>{page} / {meta.totalPages}</span>
            <button
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={page >= meta.totalPages}
              className="px-2 py-1 rounded bg-muted disabled:opacity-50"
            >Prox.</button>
          </div>
        )}
      </div>

      {/* Right panel - detail */}
      <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        {selectedId ? (
          <AtendimentoDetail id={selectedId} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>Selecione um atendimento para ver os detalhes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AtendimentoDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [resposta, setResposta] = useState('');
  const [sugestaoLoading, setSugestaoLoading] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [showPromoverLead, setShowPromoverLead] = useState(false);
  const [showVincularCliente, setShowVincularCliente] = useState(false);
  const [showMarcarPerdido, setShowMarcarPerdido] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const detailQuery = useQuery({
    queryKey: ['atendimento', id],
    queryFn: () => api.get<Atendimento>(`/atendimentos/${id}`),
    refetchInterval: 10000,
  });

  const usersQuery = useQuery({
    queryKey: ['users-advogados'],
    queryFn: () => api.get<{ data: User[] }>('/users?limit=100'),
  });

  const atendimento = detailQuery.data;
  const advogados = (usersQuery.data?.data || []).filter((u) => u.role === 'ADMIN' || u.role === 'ADVOGADO');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [atendimento?.mensagens]);

  const responderMut = useMutation({
    mutationFn: (conteudo: string) =>
      api.post(`/atendimentos/${id}/responder`, { conteudo }),
    onSuccess: () => {
      setResposta('');
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      qc.invalidateQueries({ queryKey: ['atendimentos-stats'] });
    },
  });

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/atendimentos/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      qc.invalidateQueries({ queryKey: ['atendimentos-stats'] });
    },
  });

  const atribuirMut = useMutation({
    mutationFn: (responsavelId: string) =>
      api.patch(`/atendimentos/${id}/atribuir`, { responsavelId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
    },
  });

  const aprovarCadastroMut = useMutation({
    mutationFn: () => api.post(`/atendimentos/${id}/aprovar-cadastro`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      qc.invalidateQueries({ queryKey: ['atendimentos-stats'] });
    },
  });

  const vincularClienteMut = useMutation({
    mutationFn: (clienteId: string) =>
      api.patch(`/atendimentos/${id}/vincular-cliente`, { clienteId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      setShowVincularCliente(false);
    },
  });

  const promoverLeadMut = useMutation({
    mutationFn: (data: { nome: string; email: string; cpf?: string; telefone?: string }) =>
      api.post(`/atendimentos/${id}/promover-lead`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      setShowPromoverLead(false);
    },
  });

  const marcarPerdidoMut = useMutation({
    mutationFn: (motivo: string) =>
      api.patch(`/atendimentos/${id}/marcar-perdido`, { motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      qc.invalidateQueries({ queryKey: ['atendimentos-stats'] });
      setShowMarcarPerdido(false);
    },
  });

  const converterMut = useMutation({
    mutationFn: (data: {
      numero: string;
      tribunal: string;
      vara?: string;
      comarca?: string;
      area?: string;
      valorCausa?: number;
      advogadoId?: string;
      descricao?: string;
    }) => api.post<{ processo: { id: string; numero: string } }>(`/atendimentos/${id}/converter-em-processo`, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      qc.invalidateQueries({ queryKey: ['atendimentos-stats'] });
      setShowConverter(false);
      if (res?.processo?.id) {
        router.push(`/dashboard/processos/${res.processo.id}`);
      }
    },
  });

  async function handleSugerir() {
    setSugestaoLoading(true);
    try {
      const res = await api.post<{ sugestao: string }>(`/atendimentos/${id}/sugerir-resposta`);
      setResposta(res.sugestao);
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
    } catch {}
    setSugestaoLoading(false);
  }

  if (!atendimento) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{CANAL_ICON[atendimento.canal] || '💬'}</span>
            <h2 className="text-lg font-bold">{atendimento.nome}</h2>
            <span className={cn('text-xs px-2 py-0.5 rounded font-medium', STATUS_MAP[atendimento.status]?.color)}>
              {STATUS_MAP[atendimento.status]?.label}
            </span>
            {atendimento.urgencia >= 8 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium animate-pulse">
                URGENTE
              </span>
            )}
            {!atendimento.clienteId && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                Cliente novo
              </span>
            )}
            {atendimento.processoId && (
              <button
                onClick={() => router.push(`/dashboard/processos/${atendimento.processoId}`)}
                className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium hover:bg-emerald-200"
              >
                Ver processo
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {atendimento.telefone && (
            <div><span className="text-muted-foreground">Tel:</span> {atendimento.telefone}</div>
          )}
          {atendimento.email && (
            <div><span className="text-muted-foreground">Email:</span> {atendimento.email}</div>
          )}
          {atendimento.areaDetectada && (
            <div><span className="text-muted-foreground">Área:</span> <span className="font-medium">{atendimento.areaDetectada}</span></div>
          )}
          <div><span className="text-muted-foreground">Urgência:</span> <UrgenciaBar value={atendimento.urgencia} /></div>
          {atendimento.complexidade && (
            <div><span className="text-muted-foreground">Complexidade:</span> {atendimento.complexidade}</div>
          )}
          <div><span className="text-muted-foreground">Data:</span> {formatDateTime(atendimento.createdAt)}</div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          <select
            value={atendimento.responsavelId || ''}
            onChange={(e) => e.target.value && atribuirMut.mutate(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1 bg-background"
          >
            <option value="">Atribuir a...</option>
            {advogados.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {atendimento.status !== 'ENCERRADO' && atendimento.status !== 'CONVERTIDO' && atendimento.status !== 'PERDIDO' && (
            <button
              onClick={() => statusMut.mutate('ENCERRADO')}
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
            >Encerrar</button>
          )}
          {atendimento.status === 'ENCERRADO' && (
            <button
              onClick={() => statusMut.mutate('ARQUIVADO')}
              className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded hover:bg-gray-200"
            >Arquivar</button>
          )}

          {atendimento.status !== 'PERDIDO' && atendimento.status !== 'CONVERTIDO' && atendimento.status !== 'ARQUIVADO' && (
            <button
              onClick={() => setShowMarcarPerdido(true)}
              className="text-xs bg-rose-50 text-rose-700 px-3 py-1 rounded hover:bg-rose-100"
            >Marcar como perdido</button>
          )}

          {!atendimento.clienteId && (
            <>
              <button
                onClick={() => setShowVincularCliente(true)}
                className="text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded hover:bg-amber-100 font-medium"
              >Vincular cliente</button>
              <button
                onClick={() => setShowPromoverLead(true)}
                className="text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded hover:bg-amber-100 font-medium"
              >Cadastrar novo cliente</button>
            </>
          )}

          {atendimento.clienteId && atendimento.status !== 'CONVERTIDO' && (
            <button
              onClick={() => setShowConverter(true)}
              className="text-xs bg-primary/10 text-primary px-3 py-1 rounded hover:bg-primary/20 font-medium"
            >Converter em Processo</button>
          )}
        </div>

        {/* Pre-cadastro pendente */}
        {atendimento.etapaBot === 'CADASTRO_PENDENTE' && atendimento.dadosBot && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-bold text-amber-800 mb-2">Pré-cadastro aguardando aprovação</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-amber-900 mb-2">
              <div><span className="text-amber-600">Nome:</span> {atendimento.dadosBot.nome}</div>
              <div><span className="text-amber-600">CPF:</span> {atendimento.dadosBot.cpf || '-'}</div>
              <div><span className="text-amber-600">Email:</span> {atendimento.dadosBot.email}</div>
            </div>
            <button
              onClick={() => aprovarCadastroMut.mutate()}
              disabled={aprovarCadastroMut.isPending}
              className="text-xs bg-green-600 text-white px-4 py-1.5 rounded font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {aprovarCadastroMut.isPending ? 'Aprovando...' : 'Aprovar Cadastro'}
            </button>
            {aprovarCadastroMut.isError && (
              <p className="text-xs text-red-600 mt-1">{(aprovarCadastroMut.error as any)?.message || 'Erro ao aprovar'}</p>
            )}
            {aprovarCadastroMut.isSuccess && (
              <p className="text-xs text-green-700 mt-1">Cliente cadastrado com sucesso!</p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(atendimento.mensagens || []).map((msg) => (
          <div key={msg.id} className={cn('flex', msg.remetente === 'ADVOGADO' && 'justify-end')}>
            <div className={cn(
              'max-w-[80%] rounded-xl px-4 py-3',
              msg.remetente === 'CLIENTE' && 'bg-muted text-foreground',
              msg.remetente === 'ADVOGADO' && 'bg-primary text-primary-foreground',
              msg.remetente === 'IA_SUGESTAO' && 'bg-purple-50 text-purple-900 border border-purple-200',
            )}>
              <div className="flex items-center gap-2 mb-1 text-xs opacity-70">
                <span className="font-medium">
                  {msg.remetente === 'CLIENTE' ? '👤 Cliente' :
                   msg.remetente === 'ADVOGADO' ? '⚖️ Advogado' : '🤖 Sugestão IA'}
                </span>
                {msg.enviadaVia && <span>via {msg.enviadaVia}</span>}
                <span className="ml-auto">{formatDateTime(msg.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{msg.conteudo}</p>
              {msg.remetente === 'IA_SUGESTAO' && (
                <button
                  onClick={() => setResposta(msg.conteudo)}
                  className="mt-2 text-xs text-purple-700 underline hover:text-purple-900"
                >
                  Usar como resposta
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Response area */}
      {atendimento.status !== 'ENCERRADO' && atendimento.status !== 'ARQUIVADO' && atendimento.status !== 'CONVERTIDO' && atendimento.status !== 'PERDIDO' && (
        <div className="p-4 border-t border-border">
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleSugerir}
              disabled={sugestaoLoading}
              className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 disabled:opacity-50 font-medium"
            >
              {sugestaoLoading ? 'Gerando sugestão...' : '🤖 Sugerir Resposta (IA)'}
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Escreva sua resposta ao cliente..."
              rows={3}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm resize-none bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <button
              onClick={() => resposta.trim() && responderMut.mutate(resposta.trim())}
              disabled={!resposta.trim() || responderMut.isPending}
              className="self-end px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {showConverter && (
        <ConverterModal
          atendimento={atendimento}
          advogados={advogados}
          onClose={() => setShowConverter(false)}
          onSubmit={(data) => converterMut.mutate(data)}
          loading={converterMut.isPending}
          error={(converterMut.error as any)?.message}
        />
      )}
      {showVincularCliente && (
        <VincularClienteModal
          onClose={() => setShowVincularCliente(false)}
          onSelect={(clienteId) => vincularClienteMut.mutate(clienteId)}
          loading={vincularClienteMut.isPending}
          error={(vincularClienteMut.error as any)?.message}
        />
      )}
      {showPromoverLead && (
        <PromoverLeadModal
          telefone={atendimento.telefone}
          email={atendimento.email}
          nomeSugerido={atendimento.nome}
          onClose={() => setShowPromoverLead(false)}
          onSubmit={(data) => promoverLeadMut.mutate(data)}
          loading={promoverLeadMut.isPending}
          error={(promoverLeadMut.error as any)?.message}
        />
      )}
      {showMarcarPerdido && (
        <MarcarPerdidoModal
          onClose={() => setShowMarcarPerdido(false)}
          onSubmit={(motivo) => marcarPerdidoMut.mutate(motivo)}
          loading={marcarPerdidoMut.isPending}
          error={(marcarPerdidoMut.error as any)?.message}
        />
      )}
    </div>
  );
}

function ConverterModal({
  atendimento,
  advogados,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  atendimento: Atendimento;
  advogados: User[];
  onClose: () => void;
  onSubmit: (data: {
    numero: string;
    tribunal: string;
    vara?: string;
    comarca?: string;
    area?: string;
    valorCausa?: number;
    advogadoId?: string;
    descricao?: string;
  }) => void;
  loading: boolean;
  error?: string;
}) {
  const areaPre = areaToEnum(atendimento.areaDetectada) || '';
  const valorPre =
    atendimento.valorEstimado != null ? String(atendimento.valorEstimado) : '';
  const descricaoPre = atendimento.mensagemOriginal?.slice(0, 500) || '';

  const [numero, setNumero] = useState('');
  const [tribunal, setTribunal] = useState('');
  const [vara, setVara] = useState('');
  const [comarca, setComarca] = useState('');
  const [area, setArea] = useState(areaPre || 'OUTRO');
  const [valorCausa, setValorCausa] = useState(valorPre);
  const [advogadoId, setAdvogadoId] = useState(atendimento.responsavelId || '');
  const [descricao, setDescricao] = useState(descricaoPre);

  function submit() {
    if (!numero.trim() || !tribunal.trim()) return;
    onSubmit({
      numero: numero.trim(),
      tribunal: tribunal.trim(),
      vara: vara.trim() || undefined,
      comarca: comarca.trim() || undefined,
      area: area || undefined,
      valorCausa: valorCausa ? Number(valorCausa) : undefined,
      advogadoId: advogadoId || undefined,
      descricao: descricao.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-bold">Converter atendimento em processo</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 overflow-y-auto">
          <div className="md:col-span-2 p-4 bg-muted/30 border-r border-border space-y-2 text-sm">
            <h4 className="font-semibold mb-2">Resumo do atendimento</h4>
            <div><span className="text-muted-foreground">Nome:</span> {atendimento.nome}</div>
            {atendimento.telefone && <div><span className="text-muted-foreground">Telefone:</span> {atendimento.telefone}</div>}
            {atendimento.email && <div><span className="text-muted-foreground">Email:</span> {atendimento.email}</div>}
            <div><span className="text-muted-foreground">Canal:</span> {atendimento.canal}</div>
            {atendimento.areaDetectada && (
              <div><span className="text-muted-foreground">Área detectada:</span> <span className="font-medium">{atendimento.areaDetectada}</span></div>
            )}
            {typeof atendimento.urgencia === 'number' && (
              <div><span className="text-muted-foreground">Urgência:</span> {atendimento.urgencia}/10</div>
            )}
            {atendimento.complexidade && (
              <div><span className="text-muted-foreground">Complexidade:</span> {atendimento.complexidade}</div>
            )}
            <div className="pt-2 border-t border-border mt-2">
              <p className="text-muted-foreground text-xs mb-1">Mensagem original:</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{atendimento.mensagemOriginal}</p>
            </div>
          </div>

          <div className="md:col-span-3 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Número CNJ *</label>
                <input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="0000000-00.0000.0.00.0000"
                  className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tribunal *</label>
                <input
                  value={tribunal}
                  onChange={(e) => setTribunal(e.target.value)}
                  placeholder="TJSP, TRT1..."
                  className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Vara</label>
                <input
                  value={vara}
                  onChange={(e) => setVara(e.target.value)}
                  className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Comarca</label>
                <input
                  value={comarca}
                  onChange={(e) => setComarca(e.target.value)}
                  className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Área</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
                >
                  {AREA_OPTIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Valor da causa (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorCausa}
                  onChange={(e) => setValorCausa(e.target.value)}
                  className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Advogado responsável</label>
                <select
                  value={advogadoId}
                  onChange={(e) => setAdvogadoId(e.target.value)}
                  className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
                >
                  <option value="">Selecione...</option>
                  {advogados.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Descrição inicial</label>
                <textarea
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background resize-none"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-border hover:bg-muted"
          >Cancelar</button>
          <button
            onClick={submit}
            disabled={loading || !numero.trim() || !tribunal.trim()}
            className="px-4 py-2 text-sm rounded bg-primary text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Convertendo...' : 'Converter em Processo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VincularClienteModal({
  onClose,
  onSelect,
  loading,
  error,
}: {
  onClose: () => void;
  onSelect: (clienteId: string) => void;
  loading: boolean;
  error?: string;
}) {
  const [search, setSearch] = useState('');

  const clientesQuery = useQuery({
    queryKey: ['clientes-search', search],
    queryFn: () =>
      api.get<{ data: ClienteOption[] } | ClienteOption[]>(
        `/clients?limit=20&search=${encodeURIComponent(search)}`,
      ),
  });

  const lista: ClienteOption[] = Array.isArray(clientesQuery.data)
    ? clientesQuery.data
    : clientesQuery.data?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-bold">Vincular cliente existente</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, CPF..."
            className="w-full text-sm border border-border rounded px-3 py-2 bg-background"
          />
          <div className="max-h-72 overflow-y-auto border border-border rounded">
            {lista.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground text-center">Nenhum cliente encontrado.</p>
            ) : (
              lista.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  disabled={loading}
                  className="w-full text-left p-3 border-b last:border-0 border-border hover:bg-muted/50 disabled:opacity-50"
                >
                  <div className="text-sm font-medium">{c.user?.name || '(sem nome)'}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.user?.email}{c.cpfCnpj ? ` · ${c.cpfCnpj}` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function PromoverLeadModal({
  telefone,
  email,
  nomeSugerido,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  telefone?: string;
  email?: string;
  nomeSugerido?: string;
  onClose: () => void;
  onSubmit: (data: { nome: string; email: string; cpf?: string; telefone?: string }) => void;
  loading: boolean;
  error?: string;
}) {
  const [nome, setNome] = useState(nomeSugerido || '');
  const [emailValue, setEmailValue] = useState(email || '');
  const [cpf, setCpf] = useState('');
  const [tel, setTel] = useState(telefone || '');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-bold">Cadastrar novo cliente</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Nome completo *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Email *</label>
            <input
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">CPF</label>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Telefone</label>
            <input
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-border hover:bg-muted">Cancelar</button>
          <button
            onClick={() => onSubmit({
              nome: nome.trim(),
              email: emailValue.trim(),
              cpf: cpf.trim() || undefined,
              telefone: tel.trim() || undefined,
            })}
            disabled={loading || !nome.trim() || !emailValue.trim()}
            className="px-4 py-2 text-sm rounded bg-primary text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >{loading ? 'Cadastrando...' : 'Cadastrar e vincular'}</button>
        </div>
      </div>
    </div>
  );
}

function MarcarPerdidoModal({
  onClose,
  onSubmit,
  loading,
  error,
}: {
  onClose: () => void;
  onSubmit: (motivo: string) => void;
  loading: boolean;
  error?: string;
}) {
  const [motivo, setMotivo] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-bold">Marcar atendimento como perdido</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Informe o motivo da perda. Esse dado será usado em métricas de funil.
          </p>
          <textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: cliente não retornou contato; preferiu outro escritório; honorários acima do desejado..."
            className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background resize-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-border hover:bg-muted">Cancelar</button>
          <button
            onClick={() => motivo.trim() && onSubmit(motivo.trim())}
            disabled={loading || !motivo.trim()}
            className="px-4 py-2 text-sm rounded bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50"
          >{loading ? 'Salvando...' : 'Marcar como perdido'}</button>
        </div>
      </div>
    </div>
  );
}

function UrgenciaBar({ value }: { value: number }) {
  const color = value >= 7 ? 'bg-red-500' : value >= 4 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-medium">{value}/10</span>
      <span className="inline-block w-12 h-2 rounded-full bg-gray-200 overflow-hidden">
        <span className={cn('block h-full rounded-full', color)} style={{ width: `${value * 10}%` }} />
      </span>
    </span>
  );
}

function PecasView() {
  const [tipo, setTipo] = useState('PETICAO_INICIAL');
  const [parteAutora, setParteAutora] = useState('');
  const [parteRe, setParteRe] = useState('');
  const [fatos, setFatos] = useState('');
  const [pedidos, setPedidos] = useState('');
  const [resultado, setResultado] = useState('');
  const [loading, setLoading] = useState(false);

  async function gerar() {
    if (!parteAutora || !parteRe || !fatos || !pedidos) return;
    setLoading(true);
    try {
      const res = await api.post<{ peca: string }>('/chatbot/gerar-peca', {
        tipo, parteAutora, parteRe, fatos, pedidos,
      });
      setResultado(res.peca);
    } catch (err: any) {
      setResultado(`Erro: ${err.message}`);
    }
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold mb-4">Gerar Peça Jurídica com IA</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Peça</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="PETICAO_INICIAL">Petição Inicial</option>
            <option value="CONTESTACAO">Contestação</option>
            <option value="RECURSO">Recurso de Apelação</option>
            <option value="MEMORIAIS">Memoriais</option>
            <option value="HABEAS_CORPUS">Habeas Corpus</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Parte Autora</label>
          <input value={parteAutora} onChange={(e) => setParteAutora(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="Nome completo" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Parte Ré</label>
          <input value={parteRe} onChange={(e) => setParteRe(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="Nome completo" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fatos</label>
          <textarea rows={5} value={fatos} onChange={(e) => setFatos(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"
            placeholder="Descreva os fatos do caso..." />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pedidos</label>
          <textarea rows={5} value={pedidos} onChange={(e) => setPedidos(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"
            placeholder="Liste os pedidos..." />
        </div>
      </div>
      <button onClick={gerar} disabled={loading || !parteAutora || !parteRe || !fatos || !pedidos}
        className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4">
        {loading ? 'Gerando...' : 'Gerar Peça'}
      </button>
      {resultado && (
        <div className="mt-4 border border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">Resultado</h3>
            <button onClick={() => navigator.clipboard.writeText(resultado)}
              className="text-xs text-primary hover:underline">Copiar</button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{resultado}</pre>
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
