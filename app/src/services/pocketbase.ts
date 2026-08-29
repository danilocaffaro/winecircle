import PocketBase, { ClientResponseError } from 'pocketbase';
import type {
  Club, TastingEvent, Rating, Expense, Payment, Profile, CurrentUser,
  Member, Wine, EventStatus, Contribution, ExpenseSplit, WineNote,
} from '../types';

// Sem VITE_POCKETBASE_URL definida, aponta para a instância local de teste
// (`npm run pb:test`). Produção usa app/.env.production.
const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8091';

export const pb = new PocketBase(PB_URL);

/**
 * O SDK cancela automaticamente requisições concorrentes para a mesma
 * collection, usando o caminho como chave. Várias telas disparam consultas
 * legítimas em paralelo — a degustação busca as notas do grupo e as suas ao
 * mesmo tempo, ambas em wc_ratings — e a primeira era abortada, chegando aqui
 * como status 0, indistinguível de queda de rede.
 */
pb.autoCancellation(false);

/**
 * Pede ao navegador para não descartar o armazenamento local.
 *
 * O Safari limpa os dados de um web app que fica ~7 dias sem ser aberto — e o
 * token de sessão do PocketBase mora no localStorage. Sem isto, quem degusta
 * uma vez por mês volta deslogado, sem entender por quê. O navegador pode
 * recusar; é um pedido, não uma garantia, e no iOS costuma ser concedido
 * quando o app está instalado na tela de início.
 */
export async function pedirArmazenamentoPersistente(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Traduz erro do PocketBase para algo que dá para mostrar a uma pessoa (A-04).
 *
 * Antes, todo erro de API virava `console.error` ou um toast genérico
 * ("Failed to save"). Foi assim que gravar um status inválido e um campo
 * inexistente passou meses sem ninguém notar: o backend recusava e a tela
 * dizia apenas que algo deu errado.
 */
export function describeError(err: unknown): string {
  if (err instanceof ClientResponseError) {
    const data = err.response?.data as Record<string, { message?: string }> | undefined;
    if (data) {
      const first = Object.entries(data)[0];
      if (first?.[1]?.message) return `${first[0]}: ${first[1].message}`;
    }
    if (err.isAbort) return 'A requisição foi cancelada. Tente de novo.';
    if (err.status === 0) return 'Sem conexão com o servidor.';
    if (err.status === 401) return 'Sua sessão expirou. Entre novamente.';
    if (err.status === 403) return 'Você não tem permissão para isso.';
    if (err.status === 404) return 'Não encontrado.';
    return err.response?.message || err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Algo deu errado.';
}

// ── Autenticação ──

export async function signUp(email: string, password: string, displayName: string) {
  await pb.collection('users').create({
    email, password, passwordConfirm: password, display_name: displayName,
  });
  return pb.collection('users').authWithPassword(email, password);
}

export const signIn = (email: string, password: string) =>
  pb.collection('users').authWithPassword(email, password);

export const signOut = () => pb.authStore.clear();

export const getCurrentUser = () => pb.authStore.record as CurrentUser | null;

export const isAuthenticated = () => pb.authStore.isValid;

export async function updateProfile(data: {
  display_name?: string; pix_key?: string; avatar_url?: string;
}) {
  const user = getCurrentUser();
  if (!user) throw new Error('Não autenticado');
  return pb.collection('users').update<CurrentUser>(user.id, data);
}

// ── Perfis públicos ──

/**
 * Resolve nomes a partir da view `wc_profiles` (A-13).
 *
 * A collection `users` só deixa você ler o seu próprio registro, então a
 * versão anterior — que buscava em `users` — devolvia uma pessoa só, e toda
 * lista de membros aparecia com "Members (1)".
 */
export async function getProfiles(ids: string[]): Promise<Profile[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const filter = unique.map((id) => `id = "${id}"`).join(' || ');
  return pb.collection('wc_profiles').getFullList<Profile>({ filter });
}

/** Converte perfis em Member, injetando a sua própria chave Pix quando for você. */
export function toMembers(profiles: Profile[]): Member[] {
  const me = getCurrentUser();
  return profiles.map((p) => ({
    id: p.id,
    name: p.display_name || 'Sem nome',
    pixKey: me && p.id === me.id ? me.pix_key : undefined,
  }));
}

export const getMembers = async (ids: string[]) => toMembers(await getProfiles(ids));

// ── Clubes ──

export const getMyClubs = () => {
  const user = getCurrentUser();
  if (!user) return Promise.resolve([] as Club[]);
  return pb.collection('wc_clubs').getFullList<Club>({
    filter: `members ~ "${user.id}"`, sort: '-created',
  });
};

export const getClub = (id: string) => pb.collection('wc_clubs').getOne<Club>(id);

export function createClub(data: { name: string; description?: string }) {
  const user = getCurrentUser();
  if (!user) throw new Error('Não autenticado');
  return pb.collection('wc_clubs').create<Club>({
    ...data, owner: user.id, members: [user.id],
  });
}

export const updateClub = (id: string, data: Partial<Club>) =>
  pb.collection('wc_clubs').update<Club>(id, data);

export const deleteClub = (id: string) => pb.collection('wc_clubs').delete(id);

/**
 * Entrar num clube passa por uma rota dedicada (A-14).
 *
 * Antes isto era um update direto no array `members`, o que obrigava a regra
 * de escrita do clube a aceitar qualquer usuário logado — e quem podia
 * escrever `members` podia também renomear ou excluir o clube. A rota
 * adiciona só quem chamou, e o clube fica travado no dono.
 */
export async function joinClub(clubId: string, token: string): Promise<Club> {
  await pb.send('/api/wc/join', { method: 'POST', body: { club: clubId, token } });
  return getClub(clubId);
}

/** O que a tela de convite mostra antes de a pessoa entrar. */
export interface InvitePreview {
  id: string;
  name: string;
  description: string;
  members: number;
}

/**
 * Lê o clube por trás de um convite sem ser membro dele.
 *
 * `getClub` não serve aqui: desde a migration 1786900000 a leitura de
 * `wc_clubs` fecha em dono-ou-membro, justamente para que os ids dos clubes
 * deixassem de ser listáveis por qualquer conta. Quem chega pelo link ainda
 * está de fora — quem autoriza é o token, não a sessão.
 */
export async function getInvite(clubId: string, token: string): Promise<InvitePreview> {
  const r = await pb.send<{ club: InvitePreview }>(
    `/api/wc/invite?club=${encodeURIComponent(clubId)}&t=${encodeURIComponent(token)}`,
    { method: 'GET' },
  );
  return r.club;
}

/** O link que se manda para alguém entrar. Sem o token, o id sozinho não vale. */
export const inviteLink = (club: Pick<Club, 'id' | 'invite_token'>) =>
  `${window.location.origin}/join/${club.id}?t=${club.invite_token ?? ''}`;

export async function leaveClub(clubId: string): Promise<void> {
  await pb.send('/api/wc/leave', { method: 'POST', body: { club: clubId } });
}

// ── Eventos ──

export const getEvents = (clubId: string) =>
  pb.collection('wc_events').getFullList<TastingEvent>({
    filter: `club = "${clubId}"`, sort: '-date',
  });

export const getEvent = (id: string) =>
  pb.collection('wc_events').getOne<TastingEvent>(id);

export function createEvent(data: {
  title: string; club: string; date: string; type: string;
  wines: Wine[]; participants: string[];
}) {
  const user = getCurrentUser();
  if (!user) throw new Error('Não autenticado');
  return pb.collection('wc_events').create<TastingEvent>({
    ...data, status: 'upcoming' satisfies EventStatus, created_by: user.id,
  });
}

export const updateEvent = (id: string, data: Partial<TastingEvent>) =>
  pb.collection('wc_events').update<TastingEvent>(id, data);

export const setEventStatus = (id: string, status: EventStatus) =>
  pb.collection('wc_events').update<TastingEvent>(id, { status });

// ── Degustação (wc_ratings) ──

export const getEventRatings = (eventId: string) =>
  pb.collection('wc_ratings').getFullList<Rating>({
    filter: `event = "${eventId}"`, sort: 'user,rank',
  });

/** Só as suas notas, para reidratar a tela se você voltar depois. */
export function getMyRatings(eventId: string) {
  const user = getCurrentUser();
  if (!user) return Promise.resolve([] as Rating[]);
  return pb.collection('wc_ratings').getFullList<Rating>({
    filter: `event = "${eventId}" && user = "${user.id}"`, sort: 'rank',
  });
}

/**
 * Grava o ranking completo de UMA pessoa: uma linha por vinho.
 *
 * `orderedWineIndexes` vem na ordem escolhida — posição 0 é o favorito.
 * O upsert é idempotente: reenviar sobrescreve em vez de duplicar, garantido
 * pelo índice único (event, user, wine_index) criado na migration.
 */
export async function submitMyRanking(
  eventId: string,
  orderedWineIndexes: number[],
  notes: Record<number, WineNote>,
): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error('Não autenticado');

  const existing = await getMyRatings(eventId);
  const byWine = new Map(existing.map((r) => [r.wine_index, r]));

  await Promise.all(orderedWineIndexes.map((wineIndex, position) => {
    const note = notes[wineIndex];
    const payload = {
      event: eventId,
      user: user.id,
      wine_index: wineIndex,
      rank: position + 1,
      stars: note?.stars ?? 0,
      note_aroma: note?.aroma ?? '',
      note_palate: note?.palate ?? '',
      note_finish: note?.finish ?? '',
    };
    const found = byWine.get(wineIndex);
    return found
      ? pb.collection('wc_ratings').update(found.id, payload)
      : pb.collection('wc_ratings').create(payload);
  }));
}

// ── Despesas ──

export const getEventExpense = async (eventId: string): Promise<Expense | null> => {
  try {
    return await pb.collection('wc_expenses').getFirstListItem<Expense>(
      `event = "${eventId}"`,
    );
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 404) return null;
    throw err;
  }
};

/**
 * Cria ou atualiza a despesa do evento — uma por evento (A-08).
 *
 * A versão anterior criava um registro novo a cada clique em "Calcular",
 * gerando pagamentos duplicados: marcar um como pago deixava o gêmeo
 * pendente para sempre.
 */
export async function saveExpense(
  eventId: string,
  totalAmount: number,
  contributions: Contribution[],
  transfers: ExpenseSplit[],
): Promise<Expense> {
  const user = getCurrentUser();
  if (!user) throw new Error('Não autenticado');

  const payload = {
    event: eventId,
    total_amount: totalAmount,
    paid_by: user.id,
    split_type: 'equal' as const,
    splits: { contributions, transfers },
  };

  const existing = await getEventExpense(eventId);
  const expense = existing
    ? await pb.collection('wc_expenses').update<Expense>(existing.id, payload)
    : await pb.collection('wc_expenses').create<Expense>(payload);

  // Os pagamentos são reconciliados pelo servidor
  // (pb_hooks/expense_settle.pb.js): a regra de leitura de wc_payments só
  // mostra os acertos em que você entra, então o cliente não tem visibilidade
  // suficiente para saber o que já existe.
  return expense;
}

export const getEventPayments = async (eventId: string): Promise<Payment[]> => {
  const expense = await getEventExpense(eventId);
  if (!expense) return [];
  return pb.collection('wc_payments').getFullList<Payment>({
    filter: `expense = "${expense.id}"`, sort: '-created',
  });
};

export function getMyPayments(status?: string) {
  const user = getCurrentUser();
  if (!user) return Promise.resolve([] as Payment[]);
  const base = `debtor = "${user.id}" || creditor = "${user.id}"`;
  return pb.collection('wc_payments').getFullList<Payment>({
    filter: status ? `(${base}) && status = "${status}"` : base,
    sort: '-created',
  });
}

export const markAsPaid = (id: string) =>
  pb.collection('wc_payments').update<Payment>(id, {
    status: 'paid', paid_at: new Date().toISOString(),
  });

export const confirmPayment = (id: string) =>
  pb.collection('wc_payments').update<Payment>(id, {
    status: 'confirmed', confirmed_at: new Date().toISOString(),
  });

export const disputePayment = (id: string) =>
  pb.collection('wc_payments').update<Payment>(id, { status: 'disputed' });

// ── Capacidades do servidor ──

/**
 * A busca por IA é opcional (depende de uma chave do Gemini no servidor).
 * Sem ela o app continua inteiro: o ciclo principal — clube, convite,
 * degustação, apuração, divisão da conta — não toca nisso. As telas consultam
 * isto para esconder o que não funciona em vez de oferecer um botão que falha.
 */
export interface Capabilities {
  /** Quantos vinhos há no catálogo local. Nunca exige chave. */
  catalog: number;
  /** Se há provedor de LLM para resolver o que o catálogo não tem. Opcional. */
  aiSearch: boolean;
}

let capabilitiesCache: Promise<Capabilities> | null = null;

export function getCapabilities(): Promise<Capabilities> {
  if (!capabilitiesCache) {
    capabilitiesCache = pb
      .send<Capabilities>('/api/wc/capabilities', { method: 'GET' })
      .catch(() => ({ catalog: 0, aiSearch: false }));
  }
  return capabilitiesCache;
}

// ── Busca de vinhos (proxy no servidor) ──

/** Uma sugestão do catálogo — já traz metadados, então escolher preenche tudo. */
export interface WineSuggestion {
  id: string;
  name: string;
  winery?: string;
  grape?: string;
  country?: string;
  region?: string;
  year?: number;
  type?: string;
}

/**
 * Autocomplete a partir do catálogo local (~245 mil vinhos).
 *
 * Não toca em serviço externo e não precisa de chave: a chave do Gemini que
 * ficava no bundle servia justamente para isto.
 */
export const suggestWines = (query: string) =>
  pb.send<{ suggestions: WineSuggestion[] }>(
    `/api/wc/wine-suggest?q=${encodeURIComponent(query)}`, { method: 'GET' },
  ).then((r) => r.suggestions || []);

/**
 * Resolve um vinho pelo nome: catálogo primeiro, LLM só no que faltar.
 *
 * Quando a resolução vem do LLM, o servidor grava o resultado no catálogo —
 * então a segunda pessoa a procurar o mesmo vinho já o encontra local.
 */
export async function searchWine(query: string): Promise<Wine> {
  const r = await pb.send<{ source: string; wine: Partial<Wine> }>(
    '/api/wc/wine-resolve', { method: 'POST', body: { query } },
  );
  // O id é do cliente: os vinhos vivem embutidos no JSON do evento.
  return { ...r.wine, id: crypto.randomUUID(), name: r.wine.name || query };
}

// ── Push ──

export async function savePushSubscription(subscription: PushSubscription) {
  const user = getCurrentUser();
  if (!user) throw new Error('Não autenticado');
  const sub = subscription.toJSON();
  const payload = {
    user: user.id, endpoint: sub.endpoint, keys: sub.keys,
    user_agent: navigator.userAgent,
  };
  try {
    const existing = await pb.collection('wc_push_subs').getFirstListItem(
      `user = "${user.id}" && endpoint = "${sub.endpoint}"`,
    );
    return pb.collection('wc_push_subs').update(existing.id, payload);
  } catch {
    return pb.collection('wc_push_subs').create(payload);
  }
}
