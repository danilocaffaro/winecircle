import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Member } from '../types';
import { getClub, createClub, updateClub, getUsers, userToMember } from '../services/pocketbase';

export const ClubForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clubType, setClubType] = useState('open');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const club = await getClub(id);
          setName(club.name);
          setDescription(club.description || '');
          setClubType(club.type || 'open');
          // Resolve member users
          const memberIds: string[] = club.members || [];
          if (memberIds.length > 0) {
            const users = await getUsers(memberIds);
            setMembers(users.map(userToMember));
          }
        } catch (e) {
          toast.error('Club not found');
          navigate('/clubs');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Club name is required'); return; }
    setSaving(true);

    try {
      if (isEditing && id) {
        await updateClub(id, {
          name: name.trim(),
          description: description.trim(),
          type: clubType,
        });
        toast.success('Club updated!');
        navigate(`/clubs/${id}`);
      } else {
        const club = await createClub({
          name: name.trim(),
          description: description.trim(),
          type: clubType,
        });
        toast.success('Club created!');
        navigate(`/clubs/${club.id}`);
      }
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to save club');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin" style={{ color: 'var(--dp-gold)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" style={{ paddingBottom: 40 }}>
      <h1 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700,
        color: 'var(--md3-on-surface)', marginBottom: 24,
      }}>
        {isEditing ? 'Edit Club' : 'New Club'}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label className="type-label-medium" style={{
            display: 'block', fontWeight: 600, color: 'var(--md3-on-surface)', marginBottom: 6,
          }}>Club Name *</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g., Confraria do Vinho"
            className="input-outlined"
            style={{ minHeight: 48, borderRadius: 16 }}
          />
        </div>

        <div>
          <label className="type-label-medium" style={{
            display: 'block', fontWeight: 600, color: 'var(--md3-on-surface)', marginBottom: 6,
          }}>Description</label>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What's your club about?" rows={3}
            className="input-outlined"
            style={{ minHeight: 80, borderRadius: 16, resize: 'none' }}
          />
        </div>

        <div>
          <label className="type-label-medium" style={{
            display: 'block', fontWeight: 600, color: 'var(--md3-on-surface)', marginBottom: 8,
          }}>Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['open', 'blind'] as const).map(t => (
              <button key={t} type="button" onClick={() => setClubType(t)}
                style={{
                  flex: 1, minHeight: 48, borderRadius: 16, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: clubType === t ? 'var(--md-primary)' : 'var(--md3-surface-container)',
                  color: clubType === t ? 'var(--md-on-primary)' : 'var(--md3-on-surface-variant)',
                  fontWeight: 600, fontFamily: 'inherit', fontSize: 14,
                }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  {t === 'blind' ? 'visibility_off' : 'visibility'}
                </span>
                {t === 'blind' ? 'Blind' : 'Open'}
              </button>
            ))}
          </div>
        </div>

        {isEditing && members.length > 0 && (
          <div>
            <label className="type-label-medium" style={{
              display: 'block', fontWeight: 600, color: 'var(--md3-on-surface)', marginBottom: 8,
            }}>Members ({members.length})</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {members.map(member => (
                <span key={member.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'var(--md3-surface-container)', borderRadius: 14,
                  padding: '8px 14px',
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--md3-primary-container)',
                    color: 'var(--md3-on-primary-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>{member.name.charAt(0).toUpperCase()}</span>
                  <span className="type-body-medium" style={{ fontWeight: 500, color: 'var(--md3-on-surface)' }}>{member.name}</span>
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--md3-on-surface-variant)', marginTop: 8 }}>
              Members join via invite link. Share your club link to add people.
            </p>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary" style={{
          width: '100%', height: 48, borderRadius: 16, fontSize: 15, fontWeight: 600,
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Club'}
        </button>
      </form>
    </div>
  );
};
