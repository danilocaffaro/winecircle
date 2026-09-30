import { useState, useEffect, useRef } from 'react';
import { ClientResponseError } from 'pocketbase';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getInvite, joinClub, describeError, type InvitePreview } from '../services/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import { AuthSheet } from '../components/AuthSheet';
import { rememberDestination } from '../utils/authDestination';

export function JoinClubPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const autoJoin = params.get('a') === '1';
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const [club, setClub] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [retry, setRetry] = useState(0);
  const [modo, setModo] = useState<'login' | 'register' | null>(null);
  const attempted = useRef('');
  const destination = `/join/${id}?t=${encodeURIComponent(token)}&a=1`;

  useEffect(() => {
    let active = true;
    setClub(null);
    setLoading(true);
    setInvalid(false);
    setError('');
    attempted.current = '';
    if (!id || !token) return;
    getInvite(id, token).then((value) => { if (active) setClub(value); })
      .catch((err) => {
        if (!active) return;
        setInvalid(err instanceof ClientResponseError && [400, 404].includes(err.status));
        setError(describeError(err));
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, token, retry]);

  useEffect(() => {
    if (!authenticated || !autoJoin || !club || !id || attempted.current === destination) return;
    attempted.current = destination;
    joinClub(id, token).then(({ already }) => {
      toast.success(already ? 'Você já faz parte deste clube' : `Você entrou em ${club.name}`);
      navigate(`/clubs/${id}`, { replace: true });
    }).catch((err) => { setError(describeError(err)); });
  }, [authenticated, autoJoin, club, id, token, destination, navigate]);

  async function handleJoin() {
    if (!id || joining) return;
    setJoining(true);
    setError('');
    try {
      const { already } = await joinClub(id, token);
      toast.success(already ? 'Você já faz parte deste clube' : 'Bem-vindo ao clube!');
      navigate(`/clubs/${id}`, { replace: true });
    } catch (err) { setError(describeError(err)); }
    finally { setJoining(false); }
  }

  const missing = !id || !token;
  if (!missing && loading) return <p role="status" className="p-8 text-center">Carregando convite...</p>;
  if (missing || invalid || !club) return <main className="max-w-md mx-auto p-6 text-center space-y-4">
    <h1 className="type-headline-small">{missing || invalid ? 'Link inválido' : 'Não deu para abrir o convite'}</h1>
    <p>{missing || invalid ? 'Convite incompleto ou trocado. Peça um link novo a quem organiza.' : error}</p>
    {!missing && !invalid && <button className="btn-primary" onClick={() => { setError(''); setLoading(true); setRetry(retry + 1); }}>Tentar de novo</button>}
    <button className="btn-text" onClick={() => navigate('/')}>Ir para início</button>
  </main>;

  return <main className="max-w-md mx-auto p-6 space-y-5" style={{ minHeight: '100dvh' }}>
    <p className="section-label">Você recebeu um convite</p>
    <h1 className="type-headline-medium" style={{ fontFamily: 'Playfair Display, serif' }}>{club.name}</h1>
    {club.description && <p>{club.description}</p>}
    <p>{club.members} {club.members === 1 ? 'membro' : 'membros'} · Quem tem o link pode entrar neste clube.</p>
    {error && <p role="alert" style={{ color: 'var(--md-error)' }}>{error}</p>}
    {authenticated ? <button className="btn-primary w-full" disabled={joining} onClick={handleJoin}>
      {joining ? 'Entrando...' : 'Entrar no clube'}
    </button> : <>
      <button className="btn-primary w-full" onClick={() => { rememberDestination(destination); setModo('register'); }}>Criar conta e entrar</button>
      <button className="btn-outlined w-full" onClick={() => { rememberDestination(destination); setModo('login'); }}>Já tenho conta</button>
    </>}
    {!authenticated && <AuthSheet modo={modo} onTrocarModo={setModo} onFechar={() => setModo(null)} destino={destination} />}
  </main>;
}
