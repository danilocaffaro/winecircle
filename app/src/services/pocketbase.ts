import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://winecircle.REDACTED_LEGACY_HOST.sslip.io/pb';

export const pb = new PocketBase(PB_URL);

// Persist auth in localStorage
pb.authStore.onChange(() => {
  // PocketBase SDK auto-persists to localStorage
});

// ── Auth helpers ──

export async function signUp(email: string, password: string, displayName: string) {
  const user = await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    display_name: displayName,
  });
  // Auto login after signup
  await pb.collection('users').authWithPassword(email, password);
  return user;
}

export async function signIn(email: string, password: string) {
  return pb.collection('users').authWithPassword(email, password);
}

export function signOut() {
  pb.authStore.clear();
}

export function getCurrentUser() {
  return pb.authStore.record;
}

export function isAuthenticated() {
  return pb.authStore.isValid;
}

// ── User profile ──

export async function updateProfile(data: { display_name?: string; pix_key?: string; avatar_url?: string }) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return pb.collection('users').update(user.id, data);
}

// ── Clubs ──

export async function getClubs() {
  return pb.collection('wc_clubs').getFullList({ sort: '-created', expand: 'owner,members' });
}

export async function getClub(id: string) {
  return pb.collection('wc_clubs').getOne(id, { expand: 'owner,members' });
}

export async function createClub(data: { name: string; description?: string; type?: string }) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return pb.collection('wc_clubs').create({
    ...data,
    owner: user.id,
    members: [user.id],
  });
}

export async function joinClub(clubId: string) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const club = await getClub(clubId);
  const members = club.members || [];
  if (!members.includes(user.id)) {
    return pb.collection('wc_clubs').update(clubId, { members: [...members, user.id] });
  }
  return club;
}

// ── Events ──

export async function getEvents(clubId: string) {
  return pb.collection('wc_events').getFullList({
    filter: `club = "${clubId}"`,
    sort: '-date',
    expand: 'created_by',
  });
}

export async function getEvent(id: string) {
  return pb.collection('wc_events').getOne(id, { expand: 'club,created_by' });
}

export async function createEvent(data: {
  title: string; club: string; date: string; type: string; wines: any[];
}) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return pb.collection('wc_events').create({
    ...data,
    status: 'upcoming',
    created_by: user.id,
  });
}

export async function updateEventStatus(eventId: string, status: string) {
  return pb.collection('wc_events').update(eventId, { status });
}

// ── Ratings ──

export async function submitRating(data: {
  event: string; wine_index: number;
  aroma: number; taste: number; finish: number; overall: number; notes?: string;
}) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  // Check if user already rated this wine in this event
  try {
    const existing = await pb.collection('wc_ratings').getFirstListItem(
      `event = "${data.event}" && user = "${user.id}" && wine_index = ${data.wine_index}`
    );
    // Update existing rating
    return pb.collection('wc_ratings').update(existing.id, data);
  } catch {
    // Create new rating
    return pb.collection('wc_ratings').create({ ...data, user: user.id });
  }
}

export async function getEventRatings(eventId: string) {
  return pb.collection('wc_ratings').getFullList({
    filter: `event = "${eventId}"`,
    expand: 'user',
    sort: 'wine_index',
  });
}

// ── Expenses ──

export async function createExpense(data: {
  event: string; total_amount: number; split_type: string; splits: any;
}) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return pb.collection('wc_expenses').create({
    ...data,
    paid_by: user.id,
  });
}

export async function getEventExpenses(eventId: string) {
  return pb.collection('wc_expenses').getFullList({
    filter: `event = "${eventId}"`,
    expand: 'paid_by',
  });
}

// ── Payments (the key feature!) ──

export async function createPayments(expenseId: string, splits: Array<{
  debtor: string; creditor: string; amount: number; pix_key?: string;
}>) {
  const promises = splits.map(split =>
    pb.collection('wc_payments').create({
      expense: expenseId,
      debtor: split.debtor,
      creditor: split.creditor,
      amount: split.amount,
      status: 'pending',
      pix_key: split.pix_key || '',
    })
  );
  return Promise.all(promises);
}

export async function getMyPayments(status?: string) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  let filter = `debtor = "${user.id}" || creditor = "${user.id}"`;
  if (status) filter = `(${filter}) && status = "${status}"`;
  
  return pb.collection('wc_payments').getFullList({
    filter,
    expand: 'debtor,creditor,expense',
    sort: '-created',
  });
}

export async function markAsPaid(paymentId: string) {
  return pb.collection('wc_payments').update(paymentId, {
    status: 'paid',
    paid_at: new Date().toISOString(),
  });
}

export async function confirmPayment(paymentId: string) {
  return pb.collection('wc_payments').update(paymentId, {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  });
}

export async function disputePayment(paymentId: string) {
  return pb.collection('wc_payments').update(paymentId, { status: 'disputed' });
}

// ── Realtime subscriptions ──

export function subscribeToPayments(callback: (data: any) => void) {
  return pb.collection('wc_payments').subscribe('*', callback);
}

export function subscribeToEvent(eventId: string, callback: (data: any) => void) {
  return pb.collection('wc_events').subscribe(eventId, callback);
}

export function unsubscribeAll() {
  pb.collection('wc_payments').unsubscribe();
  pb.collection('wc_events').unsubscribe();
}

// ── Push subscriptions ──

export async function savePushSubscription(subscription: PushSubscription) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  
  const sub = subscription.toJSON();
  
  try {
    const existing = await pb.collection('wc_push_subs').getFirstListItem(
      `user = "${user.id}" && endpoint = "${sub.endpoint}"`
    );
    return pb.collection('wc_push_subs').update(existing.id, {
      keys: sub.keys,
      user_agent: navigator.userAgent,
    });
  } catch {
    return pb.collection('wc_push_subs').create({
      user: user.id,
      endpoint: sub.endpoint,
      keys: sub.keys,
      user_agent: navigator.userAgent,
    });
  }
}
