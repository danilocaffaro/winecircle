// Tipos espelhando o schema real do PocketBase (A-24).
//
// A versão anterior descrevia o modelo antigo de localStorage — Club.members
// como objetos, TastingEvent.status 'planning', campos `clubId` e `name` que
// o backend nunca teve. A ponte entre os dois era `useState<any>` em quase
// toda página, e é exatamente por isso que gravar um campo inexistente
// (`participants`) ou um status inválido (`completed`) compilava sem reclamar.

/** Campos que todo registro do PocketBase carrega. */
export interface PBRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

// ── Usuários e perfis ──

/** Perfil público, vindo da view `wc_profiles`. Sem e-mail, sem chave Pix. */
export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
}

/** O próprio usuário autenticado — só você lê os seus dados sensíveis. */
export interface CurrentUser extends PBRecord {
  email: string;
  display_name: string;
  pix_key?: string;
  avatar_url?: string;
}

/** Como as telas exibem uma pessoa. `pixKey` só vem preenchida para você. */
export interface Member {
  id: string;
  name: string;
  pixKey?: string;
}

// ── Vinhos ──

export type WineType = 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'orange';

export interface TasteProfile {
  body: number;      // 0-100: leve → encorpado
  sweetness: number; // 0-100: seco → doce
  tannin: number;    // 0-100: macio → tânico
  acidity: number;   // 0-100: suave → ácido
}

/** Vinho embutido no JSON `wines` do evento. `id` é um uuid gerado no cliente. */
export interface Wine {
  id: string;
  name: string;
  producer?: string;
  region?: string;
  country?: string;
  grape?: string;
  year?: number;
  tastingNotes?: string;
  description?: string;
  imageUrl?: string;
  type?: WineType;
  price?: number;
  rating?: number;
  ratingCount?: number;
  tasteProfile?: TasteProfile;
}

// ── Clubes ──

/**
 * O clube não tem modo de degustação.
 *
 * Ele tinha um campo `type` (aberta/às cegas/mista) que competia com o do
 * evento e não significava nada: quem decide se a degustação é às cegas é cada
 * evento, não o clube. Dois lugares para a mesma escolha só geram contradição
 * — um clube "aberto" com um evento "às cegas" dentro.
 */
export interface Club extends PBRecord {
  name: string;
  description: string;
  owner: string;      // id de usuário
  members: string[];  // ids de usuário
  image_url?: string;
  /** Segredo do link de convite. Só chega a dono e membros: a regra de leitura
   *  de wc_clubs fecha em dono-ou-membro desde a migration 1786900000. */
  invite_token?: string;
}

// ── Eventos ──

export type EventType = 'open' | 'blind';

/** Espelha o enum do schema. 'completed' só existe depois da migration 1786794201. */
export type EventStatus = 'upcoming' | 'tasting' | 'completed';

export interface TastingEvent extends PBRecord {
  title: string;
  club: string;          // id do clube
  date: string;
  type: EventType;
  status: EventStatus;
  wines: Wine[];
  participants: string[]; // ids de usuário
  created_by: string;
}

// ── Degustação ──

/**
 * Uma linha de wc_ratings: o que UMA pessoa achou de UM vinho.
 *
 * `wine_index` é a posição do vinho no array `wines` do evento — estável,
 * independente de como a pessoa reordenou a lista. É dele que sai o rótulo
 * cego ("Vinho A"), que por isso não muda quando você arrasta (A-16).
 *
 * `rank` é a posição no ranking da pessoa: 1 = favorito.
 */
export interface Rating extends PBRecord {
  event: string;
  user: string;
  wine_index: number;
  rank: number;
  stars?: number;
  note_aroma?: string;
  note_palate?: string;
  note_finish?: string;
}

/** O que uma pessoa preenche por vinho antes de enviar. */
export interface WineNote {
  stars: number;
  aroma: string;
  palate: string;
  finish: string;
}

/** Resultado agregado por vinho, via contagem de Borda. */
export interface BordaResult {
  wineIndex: number;
  wine: Wine;
  totalPoints: number;
  rank: number;
  /** Quantas pessoas colocaram este vinho em 1º. */
  firstPlaces: number;
}

// ── Despesas ──

export type SplitType = 'equal' | 'custom';

export interface ExpenseSplit {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

/** Quanto cada pessoa desembolsou de fato. */
export interface Contribution {
  memberId: string;
  amount: number;
}

export interface Expense extends PBRecord {
  event: string;
  total_amount: number;
  paid_by: string;
  split_type: SplitType;
  /** Snapshot: as contribuições e as transferências calculadas. */
  splits: {
    contributions: Contribution[];
    transfers: ExpenseSplit[];
  };
}

export type PaymentStatus = 'pending' | 'paid' | 'confirmed' | 'disputed';

export interface Payment extends PBRecord {
  expense: string;
  debtor: string;
  creditor: string;
  amount: number;
  status: PaymentStatus;
  pix_key?: string;
  paid_at?: string;
  confirmed_at?: string;
  expand?: {
    debtor?: Profile;
    creditor?: Profile;
  };
}
