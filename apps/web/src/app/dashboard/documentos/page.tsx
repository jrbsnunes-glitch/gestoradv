'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function DocumentosPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [showGerador, setShowGerador] = useState(false);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadData, setUploadData] = useState({ titulo: '', tipo: '', processoId: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['documentos'],
    queryFn: () => api.get<any>('/documents'),
  });

  const { data: processosData } = useQuery({
    queryKey: ['processos-list'],
    queryFn: () => api.get<any>('/processos?limit=100'),
    enabled: showUpload || showGerador,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error('Selecione um arquivo');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('titulo', uploadData.titulo || file.name);
      if (uploadData.tipo) formData.append('tipo', uploadData.tipo);
      if (uploadData.processoId) formData.append('processoId', uploadData.processoId);

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Erro no upload');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      setShowUpload(false);
    },
  });

  const [pecaForm, setPecaForm] = useState({ tipo: 'PETICAO_INICIAL', parteAutora: '', parteRe: '', fatos: '', pedidos: '' });
  const [generatedPeca, setGeneratedPeca] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePeca = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post<{ markdown: string }>('/chatbot/gerar-peca', pecaForm);
      setGeneratedPeca(res.markdown);
    } catch {
      setGeneratedPeca('Erro ao gerar peça. Verifique se a chave da API de IA está configurada.');
    } finally {
      setIsGenerating(false);
    }
  };

  const TIPOS = ['PETICAO_INICIAL', 'CONTESTACAO', 'RECURSO', 'MEMORIAIS', 'HABEAS_CORPUS', 'CONTRATO', 'PROCURACAO', 'OUTRO'];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload e geração de documentos jurídicos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGerador(true)} className="rounded-lg border border-primary bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20">
            Gerar com IA
          </button>
          <button onClick={() => { setUploadData({ titulo: '', tipo: '', processoId: '' }); setShowUpload(true); }} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90">
            Upload
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Título</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Processo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Autor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</td></tr>
            ) : !data?.data?.length ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum documento cadastrado</td></tr>
            ) : (
              data.data.map((doc: any) => (
                <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{doc.titulo}</td>
                  <td className="px-4 py-3"><span className="rounded bg-muted px-2 py-0.5 text-xs">{doc.tipo}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{doc.processo?.numero || '-'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{doc.autor?.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(doc.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload de Documento">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Arquivo *</label>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.xlsx,.csv" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Título</label>
            <input value={uploadData.titulo} onChange={(e) => setUploadData({ ...uploadData, titulo: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Título do documento" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tipo</label>
              <select value={uploadData.tipo} onChange={(e) => setUploadData({ ...uploadData, tipo: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="">Selecione...</option>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Processo</label>
              <select value={uploadData.processoId} onChange={(e) => setUploadData({ ...uploadData, processoId: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="">Nenhum</option>
                {processosData?.data?.map((p: any) => <option key={p.id} value={p.id}>{p.numero}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button onClick={() => setShowUpload(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
            <button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
              {uploadMutation.isPending ? 'Enviando...' : 'Fazer Upload'}
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Generator Modal */}
      <Modal open={showGerador} onClose={() => { setShowGerador(false); setGeneratedPeca(''); }} title="Gerar Peça Jurídica com IA" className="max-w-3xl">
        {!generatedPeca ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Tipo de Peça *</label>
                <select value={pecaForm.tipo} onChange={(e) => setPecaForm({ ...pecaForm, tipo: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="PETICAO_INICIAL">Petição Inicial</option>
                  <option value="CONTESTACAO">Contestação</option>
                  <option value="RECURSO">Recurso de Apelação</option>
                  <option value="MEMORIAIS">Memoriais</option>
                  <option value="HABEAS_CORPUS">Habeas Corpus</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Parte Autora *</label>
                <input value={pecaForm.parteAutora} onChange={(e) => setPecaForm({ ...pecaForm, parteAutora: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Parte Ré *</label>
              <input value={pecaForm.parteRe} onChange={(e) => setPecaForm({ ...pecaForm, parteRe: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Fatos do caso *</label>
              <textarea value={pecaForm.fatos} onChange={(e) => setPecaForm({ ...pecaForm, fatos: e.target.value })} rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Descreva os fatos relevantes do caso..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Pedidos (um por linha)</label>
              <textarea value={pecaForm.pedidos} onChange={(e) => setPecaForm({ ...pecaForm, pedidos: e.target.value })} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Ex: Indenização por danos morais&#10;Devolução dos valores pagos" />
            </div>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button onClick={() => setShowGerador(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Cancelar</button>
              <button onClick={generatePeca} disabled={isGenerating || !pecaForm.fatos} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50">
                {isGenerating ? 'Gerando...' : 'Gerar Peça'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background p-4">
              <pre className="whitespace-pre-wrap text-sm text-foreground">{generatedPeca}</pre>
            </div>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button onClick={() => setGeneratedPeca('')} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">Nova Peça</button>
              <button onClick={() => navigator.clipboard.writeText(generatedPeca)} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">Copiar Texto</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
