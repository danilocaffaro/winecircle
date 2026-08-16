import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Member } from '../types';
import {
  getClub, createClub, updateClub, getMembers, describeError,
} from '../services/pocketbase';

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 600, marginBottom: 6,
  color: 'var(--md-on-surface)',
};

export const ClubForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const club = await getClub(id);
        if (cancelled) return;
        setName(club.name);
        setDescription(club.description || '');
        const memberIds: string[] = club.members || [];
        if (memberIds.length > 0) setMembers(await getMembers(memberIds));
      } catch (err) {
        if (cancelled) return;
        toast.error(describeError(err));
        navigate('/clubs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Dê um nome ao clube'); return; }
    setSaving(true);
    try {
      if (isEditing && id) {
        await updateClub(id, {
          name: name.trim(), description: description.trim(),
        });
        toast.success('Clube atualizado!');
        navigate(`/clubs/${id}`);
      } else {
        const club = await createClub({
          name: name.trim(), description: description.trim(),
        });
        toast.success('Clube criado!');
        navigate(`/clubs/${club.id}`);
      }
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin"
          style={{ color: 'var(--md-primary)' }} role="status" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" style={{ paddingBottom: 40 }}>
      <h1 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700,
        color: 'var(--md-on-surface)', marginBottom: 24,
      }}>
        {isEditing ? 'Editar clube' : 'Novo clube'}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label htmlFor="club-name" className="type-label-medium" style={labelStyle}>
            Nome do clube *
          </label>
          <input id="club-name" data-testid="club-name" type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Confraria da Quinta" required
            className="input-outlined" style={{ minHeight: 48, borderRadius: 16 }} />
        </div>

        <div>
          <label htmlFor="club-description" className="type-label-medium" style={labelStyle}>
            Descrição
          </label>
          <textarea id="club-description" data-testid="club-description" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Sobre o que é o clube?" rows={3}
            className="input-outlined"
            style={{ minHeight: 80, borderRadius: 16, resize: 'none' }} />
        </div>

        {isEditing && members.length > 0 && (
          <div>
            <p className="type-label-medium" style={labelStyle}>
              Membros ({members.length})
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {members.map((m) => (
                <span key={m.id} className="chip" style={{
                  background: 'var(--md-surface-container-high)', borderColor: 'transparent',
                }}>{m.name}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} data-testid="save-club"
            className="btn-primary" style={{
              flex: 1, height: 48, borderRadius: 'var(--shape-large)',
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar clube'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-outlined"
            style={{ height: 48, borderRadius: 'var(--shape-large)', padding: '0 20px' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
