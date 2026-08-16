import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getClub, joinClub, getCurrentUser, describeError } from '../services/pocketbase';
import type { Club } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const JoinClubPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getClub(id)
      .then(c => setClub(c))
      .catch(() => setError('Clube não encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    try {
      await joinClub(id);
      toast.success('Bem-vindo ao clube! 🍷');
      navigate(`/clubs/${id}`);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin" style={{ color: 'var(--dp-gold)' }} />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: 64, color: 'var(--md-error)', display: 'block', marginBottom: 16 }}>link_off</span>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--md-on-surface)', marginBottom: 8 }}>
          Link inválido
        </h2>
        <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', marginBottom: 24 }}>
          Este convite não é mais válido ou o clube não existe.
        </p>
        <button onClick={() => navigate('/')} style={{
          background: 'var(--md-primary)', color: 'var(--md-on-primary)',
          border: 'none', borderRadius: 'var(--shape-full)', padding: '12px 24px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>Ir para início</button>
      </div>
    );
  }

  const currentUser = getCurrentUser();
  const isMember = currentUser && (club.members || []).includes(currentUser.id);
  const memberCount = (club.members || []).length;

  if (isMember) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <span className="material-symbols-rounded ms-filled" style={{ fontSize: 64, color: 'var(--md-primary)', display: 'block', marginBottom: 16 }}>check_circle</span>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--md-on-surface)', marginBottom: 8 }}>
          Você já é membro!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', marginBottom: 24 }}>
          Você já faz parte do <strong>{club.name}</strong>.
        </p>
        <button onClick={() => navigate(`/clubs/${club.id}`)} style={{
          background: 'var(--md-primary)', color: 'var(--md-on-primary)',
          border: 'none', borderRadius: 'var(--shape-full)', padding: '12px 24px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>Ver clube</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      {/* Wine glass icon */}
      <div style={{
        width: 96, height: 96, borderRadius: '50%', margin: '0 auto 24px',
        background: 'linear-gradient(135deg, var(--md-primary) 0%, var(--md-tertiary) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        <span className="material-symbols-rounded ms-filled" style={{ fontSize: 44, color: '#fff' }}>wine_bar</span>
      </div>

      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: 8 }}>
        Convite para clube
      </h1>

      <div style={{
        background: 'var(--md-surface-container)', borderRadius: 20,
        border: '1px solid var(--md-outline-variant)', padding: 24, marginBottom: 24,
      }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: 8 }}>
          {club.name}
        </h2>
        {club.description && (
          <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', marginBottom: 12 }}>{club.description}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13, color: 'var(--md-on-surface-variant)' }}>
          <span>👥 {memberCount} {memberCount === 1 ? 'membro' : 'membros'}</span>
        </div>
      </div>

      {!authenticated ? (
        <div>
          <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', marginBottom: 16 }}>
            Faça login ou crie uma conta para entrar no clube.
          </p>
          <button onClick={() => navigate('/entrar', { state: { from: `/join/${id}` } })} style={{
            width: '100%', padding: '14px 0', borderRadius: 'var(--shape-full)',
            background: 'var(--md-primary)', border: 'none',
            color: 'var(--md-on-primary)', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Entrar / Criar conta
          </button>
        </div>
      ) : (
        <button onClick={handleJoin} disabled={joining} style={{
          width: '100%', padding: '14px 0', borderRadius: 'var(--shape-full)',
          background: 'var(--md-primary)', border: 'none',
          color: 'var(--md-on-primary)', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          opacity: joining ? 0.7 : 1,
        }}>
          {joining ? 'Entrando...' : 'Entrar no clube 🍷'}
        </button>
      )}
    </div>
  );
};
