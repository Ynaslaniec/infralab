import React, { useState } from 'react';
import { ArrowLeft, Upload, X, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const CATEGORIES = ['Hardware', 'Software', 'Rede/Internet', 'Projetor/Áudio', 'Ar Condicionado', 'Mobiliário', 'Outro'];
const PRIORITIES = [
  { value: 'low', label: 'Baixa', color: '#0284C7' },
  { value: 'medium', label: 'Média', color: '#EAB308' },
  { value: 'high', label: 'Alta', color: '#DC2626' },
];

function validate(category: string, title: string, description: string, location: string): string | null {
  if (!category) return 'Selecione a categoria do problema';
  if (!title.trim()) return 'Informe o título do problema';
  if (title.trim().length < 5) return 'O título deve ter pelo menos 5 caracteres';
  if (!location.trim()) return 'Informe o local do problema';
  if (!description.trim()) return 'Descreva o problema';
  if (description.trim().length < 20) return 'A descrição deve ter pelo menos 20 caracteres';
  return null;
}

export default function Report() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 3 - images.length);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...newFiles].slice(0, 3));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 3));
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    const validationError = validate(category, title, description, location);
    if (validationError) { setError(validationError); return; }
    if (!user) return;

    setSubmitting(true);
    setError('');

    // Upload images if any
    const imageUrls: string[] = [];
    for (const file of images) {
      const ext = file.name.split('.').pop() ?? 'jpg';
      // Path must start with user.id to satisfy storage RLS policy:
      // (auth.uid())::text = storage.foldername(name)[1]
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage
        .from('ticket-images')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) {
        console.error('[Report] upload error:', uploadErr);
        toast.error(`Falha ao anexar imagem "${file.name}": ${uploadErr.message}`);
        setSubmitting(false);
        return;
      }
      if (data) {
        const { data: urlData } = supabase.storage.from('ticket-images').getPublicUrl(data.path);
        imageUrls.push(urlData.publicUrl);
      }
    }

    const { error: insertErr } = await supabase.from('tickets').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'pending',
      location: location.trim(),
      image_urls: imageUrls,
    });

    if (insertErr) {
      toast.error('Erro ao enviar chamado');
      setError('Não foi possível enviar o chamado. Tente novamente.');
    } else {
      toast.success('Chamado enviado com sucesso!');
      navigate('/tickets');
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-[20px] font-semibold text-foreground">Relatar Problema</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
            <p className="text-[14px] text-[#DC2626]">{error}</p>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-[14px] font-medium text-foreground mb-3">
            Categoria do Problema <span className="text-[#DC2626]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setError(''); }}
                className={`p-3 rounded-xl text-[14px] font-medium transition-all ${
                  category === cat ? 'bg-[#DC2626] text-white shadow-lg' : 'bg-card border border-border text-foreground hover:bg-accent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[14px] font-medium text-foreground mb-3">Prioridade</label>
          <div className="grid grid-cols-3 gap-3">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`p-3 rounded-xl text-[14px] font-medium transition-all ${
                  priority === p.value ? 'text-white shadow-lg' : 'bg-card border border-border text-foreground hover:bg-accent'
                }`}
                style={priority === p.value ? { backgroundColor: p.color } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-[14px] font-medium text-foreground mb-2">
            Título do Problema <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            placeholder="Ex: Projetor sem imagem"
            maxLength={100}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-[14px] font-medium text-foreground mb-2">
            Local <span className="text-[#DC2626]">*</span>
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => { setLocation(e.target.value); setError(''); }}
            placeholder="Ex: Sala 205 - Bloco A"
            className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-[14px] font-medium text-foreground mb-2">
            Descrição Detalhada <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setError(''); }}
            placeholder="Descreva o problema com o máximo de detalhes possível..."
            rows={5}
            maxLength={1000}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-transparent transition-all resize-none"
          />
          <p className="text-[12px] text-muted-foreground mt-1">{description.length}/1000 caracteres</p>
        </div>

        {/* Images */}
        <div>
          <label className="block text-[14px] font-medium text-foreground mb-2">Fotos (opcional)</label>
          <p className="text-[12px] text-muted-foreground mb-3">Adicione até 3 fotos do problema</p>
          <div className="space-y-3">
            {images.length < 3 && (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-accent transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-[14px] text-muted-foreground">Clique para adicionar foto</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>
            )}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 bg-[#DC2626] text-white rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#0284C7]/5 border border-[#0284C7]/20 rounded-xl">
          <p className="text-[14px] text-muted-foreground">
            <strong className="text-foreground">Importante:</strong> Nossa equipe receberá sua solicitação e entrará em contato em breve. Acompanhe o status na aba "Chamados".
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626]/60 text-white rounded-xl font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Check className="w-5 h-5" /> Enviar Solicitação</>}
          </button>
        </div>
      </div>
    </div>
  );
}
