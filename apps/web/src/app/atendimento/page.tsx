'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function FormularioAtendimentoPage() {
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', assunto: '', mensagem: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [protocolo, setProtocolo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.mensagem.trim()) return;

    setStatus('sending');
    try {
      const res = await fetch(`${API_URL}/atendimento/formulario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Falha ao enviar');
      const data = await res.json();
      setProtocolo(data.protocolo || '');
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Mensagem Enviada!</h2>
          <p className="text-gray-600 mb-4">
            Sua mensagem foi recebida com sucesso. Nossa equipe entrará em contato em breve.
          </p>
          {protocolo && (
            <p className="text-sm text-gray-500">
              Protocolo: <span className="font-mono font-semibold text-primary">{protocolo}</span>
            </p>
          )}
          <button
            onClick={() => { setStatus('idle'); setForm({ nome: '', telefone: '', email: '', assunto: '', mensagem: '' }); }}
            className="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
          >
            Enviar nova mensagem
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Fale Conosco</h1>
          <p className="text-gray-600 mt-2">
            Envie sua dúvida ou consulta jurídica. Nossa equipe retornará o contato o mais breve possível.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              placeholder="Seu nome"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
            <input
              type="text"
              value={form.assunto}
              onChange={(e) => setForm({ ...form, assunto: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              placeholder="Ex: Consulta trabalhista, dúvida sobre contrato..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
            <textarea
              required
              rows={5}
              value={form.mensagem}
              onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-none"
              placeholder="Descreva sua dúvida ou situação jurídica..."
            />
          </div>

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full bg-primary text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {status === 'sending' ? 'Enviando...' : 'Enviar Mensagem'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Ao enviar, você concorda com o tratamento dos seus dados conforme a LGPD.
          </p>
        </form>
      </div>
    </div>
  );
}
