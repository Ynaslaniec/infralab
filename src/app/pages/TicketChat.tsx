import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, Paperclip, FileText, Download, Lock, Info, ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { supabase, Ticket, TicketMessage } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../hooks/useRole';
import { toast } from 'sonner';

function isImage(type?: string | null) {
  return !!type && type.startsWith('image/');
}

const STATUS_OPTIONS: { value: Ticket['status']; label: string; color: string; bg: string }[] = [
  { value: 'pending',     label: 'Pendente',       color: '#92400E', bg: '#EAB308' },
  { value: 'in_progress', label: 'Em atendimento', color: '#1D4ED8', bg: '#2563EB' },
  { value: 'resolved',    label: 'Solucionado',    color: '#166534', bg: '#16A34A' },
];

export default function TicketChat() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { isTecnico, isCoordenador } = useRole();

  const [ticket,         setTicket]         = useState<Ticket | null>(null);
  const [messages,       setMessages]       = useState<TicketMessage[]>([]);
  const [content,        setContent]        = useState('');
  const [file,           setFile]           = useState<File | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [sending,        setSending]        = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);

  const canChangeStatus = isTecnico || isCoordenador;

  const allowed = !!ticket && (ticket.user_id === user?.id || isTecnico || isCoordenador);

  useEffect(() => {
    if (!id || !user) return;

    async function init() {
      const { data: ticketData, error: ticketErr } = await supabase
        .from('tickets').select('*').eq('id', id!).maybeSingle();

      if (ticketErr || !ticketData) {
        toast.error('Chamado não encontrado');
        navigate('/tickets');
        return;
      }
      setTicket(ticketData);

      const { data: msgData, error: msgErr } = await (supabase as any)
        .from('ticket_messages')
        .select('*, sender:profiles!ticket_messages_sender_id_fkey(full_name, role)')
        .eq('ticket_id', id!)
        .order('created_at', { ascending: true });

      if (msgErr) {
        toast.error('Erro ao carregar mensagens');
      } else {
        setMessages((msgData ?? []).map((m: any) => ({
          ...m,
          sender_name: m.sender?.full_name,
          sender_role: m.sender?.role,
        })));
      }
      setLoading(false);
    }
    init();
  }, [id, user]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`ticket_messages_${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${id}`,
      }, (payload) => {
        const m = payload.new as TicketMessage;
        setMessages((prev) => prev.some(p => p.id === m.id) ? prev : [...prev, m]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleSend() {
    if (!user || !id || (!content.trim() && !file)) return;
    setSending(true);

    let attachment_url: string | null = null;
    let attachment_name: string | null = null;
    let attachment_type: string | null = null;

    if (file) {
      const ext = file.name.split('.').pop();
      const path = `${id}/${user.id}/${Date.now()}.${ext}`;
      const { data, error: upErr } = await supabase.storage.from('ticket-chat-attachments').upload(path, file);
      if (upErr || !data) {
        toast.error('Erro ao enviar anexo');
        setSending(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('ticket-chat-attachments').getPublicUrl(data.path);
      attachment_url = urlData.publicUrl;
      attachment_name = file.name;
      attachment_type = file.type;
    }

    const { data: inserted, error } = await (supabase as any).from('ticket_messages').insert({
      ticket_id: id,
      sender_id: user.id,
      content: content.trim() || null,
      attachment_url,
      attachment_name,
      attachment_type,
    }).select().single();

    if (error) {
      toast.error('Erro ao enviar mensagem');
    } else {
      setMessages((prev) => prev.some(p => p.id === inserted.id) ? prev : [...prev, {
        ...inserted,
        sender_name: profile?.full_name,
        sender_role: profile?.role,
      }]);
      setContent('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setSending(false);
  }

  async function handleStatusChange(newStatus: Ticket['status']) {
    if (!ticket || newStatus === ticket.status) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', ticket.id);
    if (error) {
      toast.error('Erro ao atualizar status');
      console.error(error);
    } else {
      setTicket((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast.success(`Status atualizado: ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`);
    }
    setUpdatingStatus(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <Lock className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-[16px] font-medium text-foreground">Acesso restrito</p>
        <p className="text-[14px] text-muted-foreground mt-1">Você não tem permissão para acessar este chat.</p>
        <button onClick={() => navigate('/tickets')} className="mt-4 px-4 py-2 bg-accent text-foreground rounded-xl text-[14px] font-medium">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/tickets')} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[16px] font-semibold text-foreground truncate">{ticket?.title}</h1>
              <p className="text-[12px] text-muted-foreground">#{ticket?.id.slice(0, 8).toUpperCase()}</p>
            </div>

            {/* Status — seletor (técnico/coord) ou badge somente-leitura (professor) */}
            {canChangeStatus ? (
              <div className="relative flex-shrink-0">
                <select
                  value={ticket?.status ?? 'pending'}
                  onChange={(e) => handleStatusChange(e.target.value as Ticket['status'])}
                  disabled={updatingStatus}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-[12px] font-medium border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                {updatingStatus && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/70 rounded-lg">
                    <div className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              (() => {
                const s = STATUS_OPTIONS.find(o => o.value === ticket?.status);
                return s ? (
                  <span
                    className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ backgroundColor: `${s.bg}20`, color: s.color }}
                  >
                    {s.label}
                  </span>
                ) : null;
              })()
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-md w-full mx-auto px-6 py-4 space-y-3 overflow-y-auto">
        {/* Contexto original do chamado */}
        {ticket && (ticket.description || (ticket.image_urls?.length ?? 0) > 0) && (
          <div className="p-3 bg-accent/60 border border-border rounded-xl mb-1 space-y-2">
            <div className="flex gap-2.5">
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descrição do chamado</p>
                {ticket.description && (
                  <p className="text-[13px] text-foreground whitespace-pre-wrap break-words">{ticket.description}</p>
                )}
              </div>
            </div>
            {ticket.image_urls && ticket.image_urls.length > 0 && (
              <div className={`grid gap-2 ${ticket.image_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {ticket.image_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden bg-muted">
                    <img
                      src={url}
                      alt={`Anexo ${i + 1}`}
                      className="w-full object-cover max-h-52"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.length === 0 ? (
          <p className="text-[13px] text-muted-foreground text-center mt-8">Nenhuma mensagem ainda. Inicie a conversa!</p>
        ) : (
          messages.map((m) => {
            const own = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                  own ? 'bg-[#2563EB] text-white rounded-br-sm' : 'bg-card border border-border text-foreground rounded-bl-sm'
                }`}>
                  {!own && isCoordenador && (
                    <p className="text-[11px] font-medium mb-1 text-muted-foreground">
                      {m.sender_name ?? 'Usuário'}{m.sender_role && ` • ${m.sender_role}`}
                    </p>
                  )}
                  {m.content && <p className="text-[14px] whitespace-pre-wrap break-words">{m.content}</p>}
                  {m.attachment_url && (
                    isImage(m.attachment_type) ? (
                      <a href={m.attachment_url} target="_blank" rel="noreferrer" className="block mt-2">
                        <img src={m.attachment_url} alt={m.attachment_name ?? 'anexo'} className="rounded-lg max-h-52 object-cover" />
                      </a>
                    ) : (
                      <a
                        href={m.attachment_url} target="_blank" rel="noreferrer" download={m.attachment_name ?? true}
                        className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${own ? 'bg-white/15' : 'bg-accent'}`}
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="text-[13px] truncate flex-1">{m.attachment_name ?? 'Arquivo'}</span>
                        <Download className="w-4 h-4 flex-shrink-0" />
                      </a>
                    )
                  )}
                  <p className={`text-[10px] mt-1 ${own ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-40">
        <div className="max-w-md mx-auto">
          {file && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-accent rounded-lg">
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[12px] text-foreground truncate flex-1">{file.name}</span>
              <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-[12px] text-muted-foreground">✕</button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-accent hover:bg-accent/80 transition-colors flex-shrink-0"
            >
              <Paperclip className="w-5 h-5 text-foreground" />
            </button>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 bg-background border border-border rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all max-h-28"
            />
            <button
              onClick={handleSend}
              disabled={sending || (!content.trim() && !file)}
              className="p-2.5 bg-[#2563EB] hover:bg-[#3B82F6] text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sending
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
