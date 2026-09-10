'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20";

export default function EscritorioPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: escritorio, isLoading } = useQuery({
    queryKey: ['escritorio'],
    queryFn: () => api.get<any>('/escritorio'),
  });

  const { data: licenseData } = useQuery({
    queryKey: ['escritorio-license'],
    queryFn: () => api.get<any>('/escritorio/license'),
  });

  const [form, setForm] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'dados' | 'endereco' | 'profissional' | 'bancario' | 'licenca' | 'alertas' | 'integracoes' | 'conhecimento'>('dados');

  useEffect(() => {
    if (escritorio) setForm(escritorio);
  }, [escritorio]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put('/escritorio', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escritorio'] });
      queryClient.invalidateQueries({ queryKey: ['escritorio-license'] });
    },
  });

  const [licenseKey, setLicenseKey] = useState('');
  const licenseMutation = useMutation({
    mutationFn: () => api.post('/escritorio/license/activate', { cnpj: form.cnpj, chave: licenseKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escritorio-license'] });
    },
  });

  const update = (field: string, value: string) => setForm((prev: any) => ({ ...prev, [field]: value }));

  const save = () => {
    const { id, createdAt, updatedAt, licencaChave, licencaValidade, licencaPlano, licencaAtiva, ...data } = form;
    saveMutation.mutate(data);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const tabs = [
    { key: 'dados', label: 'Dados Gerais' },
    { key: 'endereco', label: 'Endereço' },
    { key: 'profissional', label: 'Dados Profissionais' },
    { key: 'bancario', label: 'Dados Bancários' },
    { key: 'licenca', label: 'Licença' },
    { key: 'integracoes', label: 'Integrações' },
    { key: 'conhecimento', label: 'Base de Conhecimento' },
    { key: 'alertas', label: 'Alertas' },
  ] as const;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Escritório</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados do escritório de advocacia — usados na geração de documentos e controle de licença</p>
      </div>

      {/* Status da licença */}
      {licenseData && (
        <div className={`mb-6 flex items-center justify-between rounded-xl border p-4 ${licenseData.active ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${licenseData.active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {licenseData.active ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Licença {licenseData.active ? 'Ativa' : licenseData.expired ? 'Expirada' : licenseData.needsRevalidation ? 'Revalidação Pendente' : 'Inativa'}
              </p>
              <p className="text-xs text-muted-foreground">
                {licenseData.plano ? `Plano: ${licenseData.plano.toUpperCase()}` : 'Sem plano'}
                {licenseData.daysRemaining > 0 && ` | ${licenseData.daysRemaining} dia(s) restante(s)`}
                {licenseData.needsRevalidation && ' | Nova chave necessária'}
              </p>
            </div>
          </div>
          {licenseData.cnpj && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              CNPJ: {licenseData.cnpj}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {saveMutation.isSuccess && (
          <div className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">Dados salvos com sucesso!</div>
        )}
        {saveMutation.error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{(saveMutation.error as Error).message}</div>
        )}

        {activeTab === 'dados' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Dados Gerais</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">CNPJ *</label>
                <input value={form.cnpj || ''} onChange={(e) => update('cnpj', e.target.value)} className={inputClass} placeholder="00.000.000/0001-00" disabled={!isAdmin} />
                <p className="mt-1 text-xs text-muted-foreground">Usado como chave de licença do sistema</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Razão Social *</label>
                <input value={form.razaoSocial || ''} onChange={(e) => update('razaoSocial', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nome Fantasia</label>
                <input value={form.nomeFantasia || ''} onChange={(e) => update('nomeFantasia', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Inscrição Estadual</label>
                <input value={form.inscricaoEstadual || ''} onChange={(e) => update('inscricaoEstadual', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Telefone</label>
                <input value={form.telefone || ''} onChange={(e) => update('telefone', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Celular</label>
                <input value={form.celular || ''} onChange={(e) => update('celular', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <input value={form.email || ''} onChange={(e) => update('email', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Website</label>
              <input value={form.website || ''} onChange={(e) => update('website', e.target.value)} className={inputClass} disabled={!isAdmin} placeholder="https://" />
            </div>
          </div>
        )}

        {activeTab === 'endereco' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Endereço</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Endereço</label>
                <input value={form.endereco || ''} onChange={(e) => update('endereco', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Número</label>
                <input value={form.numero || ''} onChange={(e) => update('numero', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Complemento</label>
                <input value={form.complemento || ''} onChange={(e) => update('complemento', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Bairro</label>
                <input value={form.bairro || ''} onChange={(e) => update('bairro', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Cidade</label>
                <input value={form.cidade || ''} onChange={(e) => update('cidade', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">UF</label>
                <input value={form.estado || ''} onChange={(e) => update('estado', e.target.value)} maxLength={2} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">CEP</label>
                <input value={form.cep || ''} onChange={(e) => update('cep', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profissional' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Dados Profissionais</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">OAB Societária</label>
                <input value={form.oabSocietaria || ''} onChange={(e) => update('oabSocietaria', e.target.value)} className={inputClass} disabled={!isAdmin} placeholder="12345" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">OAB Estado</label>
                <input value={form.oabEstado || ''} onChange={(e) => update('oabEstado', e.target.value)} maxLength={2} className={inputClass} disabled={!isAdmin} placeholder="SP" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Áreas Principais de Atuação</label>
              <textarea value={form.areasPrincipais || ''} onChange={(e) => update('areasPrincipais', e.target.value)} rows={3} className={inputClass} disabled={!isAdmin} placeholder="Direito Civil, Trabalhista, Família..." />
              <p className="mt-1 text-xs text-muted-foreground">Essas informações são usadas na geração de peças jurídicas</p>
            </div>
          </div>
        )}

        {activeTab === 'bancario' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Dados Bancários</h2>
            <p className="text-sm text-muted-foreground">Utilizados em petições que envolvam valores e custas processuais</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Banco</label>
                <input value={form.banco || ''} onChange={(e) => update('banco', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Agência</label>
                <input value={form.agencia || ''} onChange={(e) => update('agencia', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Conta</label>
                <input value={form.conta || ''} onChange={(e) => update('conta', e.target.value)} className={inputClass} disabled={!isAdmin} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Chave PIX</label>
              <input value={form.pixChave || ''} onChange={(e) => update('pixChave', e.target.value)} className={inputClass} disabled={!isAdmin} placeholder="CNPJ, email, telefone ou chave aleatória" />
            </div>
          </div>
        )}

        {activeTab === 'licenca' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Licença do Sistema</h2>
            <p className="text-sm text-muted-foreground">
              A licença é vinculada ao CNPJ do escritório e deve ser <strong>revalidada a cada 30 dias</strong> com uma nova chave gerada pela ferramenta externa.
            </p>

            {licenseData && (
              <div className="space-y-4">
                {/* Painel de status */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                    <div>
                      <span className="text-muted-foreground">CNPJ:</span>
                      <p className="font-mono font-medium text-foreground">{licenseData.cnpj || 'Não configurado'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Plano:</span>
                      <p className="font-medium text-foreground">{(licenseData.plano || 'Nenhum').toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className={`font-medium ${licenseData.active ? 'text-success' : 'text-destructive'}`}>
                        {licenseData.active ? 'Ativa' : licenseData.expired ? 'Expirada' : 'Inativa'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Validade:</span>
                      <p className="font-medium text-foreground">
                        {licenseData.validade ? new Date(licenseData.validade).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dias restantes:</span>
                      <p className={`font-medium ${(licenseData.daysRemaining ?? 0) <= 5 ? 'text-destructive' : (licenseData.daysRemaining ?? 0) <= 10 ? 'text-warning' : 'text-foreground'}`}>
                        {licenseData.daysRemaining ?? '-'} dia(s)
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Última validação:</span>
                      <p className="font-medium text-foreground">
                        {licenseData.lastValidation ? new Date(licenseData.lastValidation).toLocaleDateString('pt-BR') : '-'}
                      </p>
                    </div>
                  </div>
                  {licenseData.chave && (
                    <div className="mt-4 border-t border-border pt-4">
                      <span className="text-sm text-muted-foreground">Chave atual:</span>
                      <p className="mt-1 font-mono text-sm font-medium text-foreground select-all">{licenseData.chave}</p>
                    </div>
                  )}
                </div>

                {/* Alerta de revalidação */}
                {licenseData.needsRevalidation && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-warning"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                      <p className="text-sm font-semibold text-warning">Revalidação necessária</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      A licença precisa ser revalidada. Solicite uma nova chave ao administrador do sistema
                      ou use a ferramenta <code className="rounded bg-muted px-1 py-0.5 text-xs">license-manager</code>.
                    </p>
                  </div>
                )}

                {/* Ativar/Renovar */}
                {isAdmin && (
                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-1 text-sm font-semibold text-foreground">Ativar / Renovar Licença</h3>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Insira a chave gerada pela ferramenta externa. A cada 30 dias uma nova chave é necessária.
                    </p>
                    <div className="flex gap-3">
                      <input
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        className={`flex-1 font-mono ${inputClass}`}
                        placeholder="GA-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                      />
                      <button
                        onClick={() => licenseMutation.mutate()}
                        disabled={licenseMutation.isPending || !licenseKey}
                        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                      >
                        {licenseMutation.isPending ? 'Ativando...' : 'Ativar'}
                      </button>
                    </div>
                    {licenseMutation.isSuccess && (
                      <p className="mt-2 text-sm text-success">Licença renovada com sucesso por mais 30 dias!</p>
                    )}
                    {licenseMutation.error && (
                      <p className="mt-2 text-sm text-destructive">{(licenseMutation.error as Error).message}</p>
                    )}
                  </div>
                )}

                {/* Como funciona */}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Como funciona</h3>
                  <ol className="space-y-1.5 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">1.</span> O administrador gera uma chave usando a ferramenta <code className="rounded bg-muted px-1 py-0.5 text-xs">license-manager</code></li>
                    <li><span className="font-medium text-foreground">2.</span> A chave é inserida nesta tela e ativa a licença por <strong>30 dias</strong></li>
                    <li><span className="font-medium text-foreground">3.</span> A cada 30 dias, uma <strong>nova chave</strong> deve ser gerada e inserida</li>
                    <li><span className="font-medium text-foreground">4.</span> Se não renovar, o sistema bloqueia o acesso (exceto login e tela de licença)</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'integracoes' && <IntegracoesSection isAdmin={isAdmin} />}

        {activeTab === 'conhecimento' && <KnowledgeBaseSection isAdmin={isAdmin} />}

        {activeTab === 'alertas' && <AlertPreferencesSection />}

        {activeTab !== 'licenca' && activeTab !== 'alertas' && activeTab !== 'integracoes' && activeTab !== 'conhecimento' && isAdmin && (
          <div className="mt-6 flex justify-end border-t border-border pt-4">
            <button
              onClick={save}
              disabled={saveMutation.isPending}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IntegracoesSection({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  const { data: integracoes, isLoading } = useQuery({
    queryKey: ['escritorio-integracoes'],
    queryFn: () => api.get<any>('/escritorio/integracoes'),
  });

  const [form, setForm] = useState({
    whatsappBusinessId: '',
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappVerifyToken: '',
    datajudApiKey: '',
    proxyUrl: '',
    twocaptchaApiKey: '',
    aiProvider: 'anthropic',
    aiModel: '',
    aiRagEnabled: true,
    aiToolsEnabled: true,
    aiSystemPrompt: '',
    ollamaBaseUrl: '',
  });

  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put('/escritorio/integracoes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escritorio-integracoes'] });
      setDirty(false);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.post<{ success: boolean; message: string }>('/escritorio/integracoes/testar-whatsapp'),
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const toggleVisibility = (field: string) => {
    setShowTokens((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (integracoes?.ai) {
      setForm((prev) => ({
        ...prev,
        aiProvider: integracoes.ai.provider || 'anthropic',
        aiModel: integracoes.ai.model || '',
        aiRagEnabled: integracoes.ai.ragEnabled ?? true,
        aiToolsEnabled: integracoes.ai.toolsEnabled ?? true,
        aiSystemPrompt: integracoes.ai.systemPrompt || '',
        ollamaBaseUrl: integracoes.ai.ollamaBaseUrl || '',
      }));
    }
  }, [integracoes]);

  const handleSave = () => {
    const payload: Record<string, string | boolean | null> = {};
    for (const [key, value] of Object.entries(form)) {
      if (value !== '' && value !== null && value !== undefined) payload[key] = value as string | boolean;
    }
    saveMutation.mutate(payload);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando integrações...</p>;

  const wa = integracoes?.whatsapp;
  const dj = integracoes?.datajud;
  const sc = integracoes?.scraping;

  const StatusBadge = ({ configured }: { configured: boolean }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${configured ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-green-500' : 'bg-gray-400'}`} />
      {configured ? 'Configurado' : 'Não configurado'}
    </span>
  );

  const SecretInput = ({ field, label, placeholder, value }: { field: string; label: string; placeholder?: string; value?: string | null }) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showTokens[field] ? 'text' : 'password'}
            value={form[field as keyof typeof form] || ''}
            onChange={(e) => updateField(field, e.target.value)}
            className={`w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 pr-10 font-mono`}
            placeholder={placeholder || (value ? `Atual: ${value}` : 'Não configurado')}
            disabled={!isAdmin}
          />
          <button
            type="button"
            onClick={() => toggleVisibility(field)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showTokens[field] ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>
      </div>
      {value && <p className="mt-1 text-xs text-muted-foreground">Valor atual: {value}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integrações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as credenciais das integrações externas do escritório. Estas credenciais são de responsabilidade do cliente.
        </p>
      </div>

      {saveMutation.isSuccess && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Integrações salvas com sucesso!
        </div>
      )}
      {saveMutation.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {(saveMutation.error as Error).message}
        </div>
      )}

      {/* WhatsApp Business API */}
      <div className="rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">WhatsApp Business API</h3>
              <p className="text-xs text-muted-foreground">Configurações do Meta Business / WhatsApp Cloud API</p>
            </div>
          </div>
          <StatusBadge configured={wa?.configurado || false} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SecretInput field="whatsappBusinessId" label="Business ID" value={wa?.businessId} />
          <SecretInput field="whatsappAccessToken" label="Access Token *" value={wa?.accessToken} />
          <SecretInput field="whatsappPhoneNumberId" label="Phone Number ID *" value={wa?.phoneNumberId} />
          <SecretInput field="whatsappVerifyToken" label="Verify Token (Webhook)" value={wa?.verifyToken} />
        </div>
        {isAdmin && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="rounded-lg border border-green-300 dark:border-green-700 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition"
            >
              {testMutation.isPending ? 'Testando...' : 'Testar Conexão'}
            </button>
            {testMutation.data && (
              <span className={`text-sm ${testMutation.data.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {testMutation.data.message}
              </span>
            )}
          </div>
        )}
        <div className="mt-4 rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Obtenha as credenciais em <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta for Developers</a> → Seu App → WhatsApp → API Setup.
            O Verify Token é definido por você ao configurar o Webhook no painel da Meta.
          </p>
        </div>
      </div>

      {/* DATAJUD / Tribunais */}
      <div className="rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">DATAJUD / Tribunais</h3>
              <p className="text-xs text-muted-foreground">API pública do CNJ para consulta de processos</p>
            </div>
          </div>
          <StatusBadge configured={dj?.configurado || false} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <SecretInput field="datajudApiKey" label="Chave de API DATAJUD" value={dj?.apiKey} placeholder="Chave obtida no portal do CNJ" />
        </div>
        <div className="mt-4 rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Solicite sua chave de API no <a href="https://datajud-wiki.cnj.jus.br/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Portal DATAJUD do CNJ</a>.
            A chave permite consultar processos, movimentações e prazos de tribunais integrados.
          </p>
        </div>
      </div>

      {/* Scraping / Avançado */}
      <div className="rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Scraping (Avançado)</h3>
              <p className="text-xs text-muted-foreground">Configurações para consulta automatizada de sistemas judiciais</p>
            </div>
          </div>
          <StatusBadge configured={sc?.configurado || false} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Proxy URL</label>
            <input
              value={form.proxyUrl}
              onChange={(e) => updateField('proxyUrl', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 font-mono"
              placeholder={sc?.proxyUrl || 'http://proxy:port'}
              disabled={!isAdmin}
            />
            {sc?.proxyUrl && <p className="mt-1 text-xs text-muted-foreground">Atual: {sc.proxyUrl}</p>}
          </div>
          <SecretInput field="twocaptchaApiKey" label="2Captcha API Key" value={sc?.twocaptchaApiKey} />
        </div>
        <div className="mt-4 rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            Estas configurações são opcionais e necessárias apenas para scraping de sistemas judiciais que não possuem API (PJe, e-SAJ, Projudi).
            O proxy evita bloqueios e o 2Captcha resolve captchas automaticamente.
          </p>
        </div>
      </div>

      {/* IA / LLM */}
      <div className="rounded-lg border border-border p-5">
        <h3 className="text-base font-semibold text-foreground mb-4">Inteligência Artificial</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Provider</label>
            <select
              value={form.aiProvider || integracoes?.ai?.provider || 'anthropic'}
              onChange={(e) => updateField('aiProvider', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              disabled={!isAdmin}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Modelo (opcional)</label>
            <input
              value={form.aiModel || ''}
              onChange={(e) => updateField('aiModel', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              placeholder="ex: claude-sonnet-4-20250514"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL Ollama</label>
            <input
              value={form.ollamaBaseUrl || ''}
              onChange={(e) => updateField('ollamaBaseUrl', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono"
              placeholder="http://localhost:11434"
              disabled={!isAdmin}
            />
          </div>
          <div className="flex flex-col gap-3 justify-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aiRagEnabled ?? integracoes?.ai?.ragEnabled ?? true}
                onChange={(e) => { setForm((p) => ({ ...p, aiRagEnabled: e.target.checked })); setDirty(true); }}
                disabled={!isAdmin}
              />
              RAG habilitado (FAQ + documentos)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.aiToolsEnabled ?? integracoes?.ai?.toolsEnabled ?? true}
                onChange={(e) => { setForm((p) => ({ ...p, aiToolsEnabled: e.target.checked })); setDirty(true); }}
                disabled={!isAdmin}
              />
              Agent com tools (WhatsApp)
            </label>
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium">Prompt do sistema (opcional)</label>
          <textarea
            value={form.aiSystemPrompt || ''}
            onChange={(e) => updateField('aiSystemPrompt', e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            placeholder="Instruções adicionais para o assistente virtual..."
            disabled={!isAdmin}
          />
        </div>
      </div>

      {/* Botão Salvar */}
      {isAdmin && dirty && (
        <div className="flex justify-end border-t border-border pt-4">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Integrações'}
          </button>
        </div>
      )}
    </div>
  );
}

function KnowledgeBaseSection({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: faqs, isLoading } = useQuery({
    queryKey: ['knowledge-faqs'],
    queryFn: () => api.get<any[]>('/knowledge/faqs'),
  });
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [categoria, setCategoria] = useState('geral');

  const createMutation = useMutation({
    mutationFn: () => api.post('/knowledge/faqs', { pergunta, resposta, categoria }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge-faqs'] });
      setPergunta('');
      setResposta('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/knowledge/faqs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-faqs'] }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando FAQs...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Base de Conhecimento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          FAQs usadas pelo bot WhatsApp, sugestão de resposta e RAG. Requer OPENAI_API_KEY para embeddings.
        </p>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold">Nova FAQ</h3>
          <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Categoria" className={inputClass} />
          <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Pergunta" className={inputClass} />
          <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Resposta" rows={3} className={inputClass} />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!pergunta || !resposta || createMutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Adicionar FAQ
          </button>
        </div>
      )}

      <div className="space-y-2">
        {(faqs || []).map((f: any) => (
          <div key={f.id} className="rounded-lg border border-border p-4">
            <div className="flex justify-between gap-2">
              <span className="text-xs text-muted-foreground">{f.categoria}</span>
              {isAdmin && (
                <button onClick={() => deleteMutation.mutate(f.id)} className="text-xs text-destructive hover:underline">
                  Remover
                </button>
              )}
            </div>
            <p className="font-medium text-sm mt-1">{f.pergunta}</p>
            <p className="text-sm text-muted-foreground mt-1">{f.resposta}</p>
          </div>
        ))}
        {!faqs?.length && <p className="text-sm text-muted-foreground">Nenhuma FAQ cadastrada. O seed padrão cria 4 FAQs na primeira inicialização.</p>}
      </div>
    </div>
  );
}

function AlertPreferencesSection() {
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['preferencias-alerta'],
    queryFn: () => api.get<{ inapp: boolean; email: boolean; whatsapp: boolean }>('/users/me/preferencias-alerta'),
  });

  const mutation = useMutation({
    mutationFn: (data: { inapp?: boolean; email?: boolean; whatsapp?: boolean }) =>
      api.patch('/users/me/preferencias-alerta', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preferencias-alerta'] }),
  });

  if (isLoading || !prefs) return <p className="text-sm text-muted-foreground">Carregando preferências...</p>;

  const toggle = (key: 'inapp' | 'email' | 'whatsapp') => {
    mutation.mutate({ [key]: !prefs[key] });
  };

  const channels = [
    { key: 'inapp' as const, label: 'Notificações no Sistema', desc: 'Alertas no sino dentro do painel' },
    { key: 'email' as const, label: 'Email', desc: 'Alertas enviados por email' },
    { key: 'whatsapp' as const, label: 'WhatsApp', desc: 'Alertas enviados via WhatsApp para seu telefone' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">Preferências de Alertas</h3>
        <p className="text-sm text-muted-foreground">Escolha como deseja receber alertas de prazos processuais e atualizações.</p>
      </div>
      <div className="space-y-3">
        {channels.map((ch) => (
          <div key={ch.key} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            <div>
              <p className="text-sm font-medium text-foreground">{ch.label}</p>
              <p className="text-xs text-muted-foreground">{ch.desc}</p>
            </div>
            <button
              onClick={() => toggle(ch.key)}
              disabled={mutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[ch.key] ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${prefs[ch.key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
      {mutation.isSuccess && <p className="text-xs text-green-600">Preferências atualizadas!</p>}
    </div>
  );
}
