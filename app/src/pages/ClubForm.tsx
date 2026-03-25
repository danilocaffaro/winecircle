import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import type { Club, Member } from '../types';
import { getClub, saveClub } from '../services/storage';

export const ClubForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPix, setNewMemberPix] = useState('');

  useEffect(() => {
    if (id) {
      const club = getClub(id);
      if (club) {
        setName(club.name);
        setDescription(club.description);
        setMembers(club.members);
      }
    }
  }, [id]);

  const addMember = () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) { toast.error('Enter a member name'); return; }
    if (members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) { toast.error('Member already exists'); return; }
    setMembers(prev => [...prev, { id: uuidv4(), name: trimmed, pixKey: newMemberPix.trim() || undefined }]);
    setNewMemberName('');
    setNewMemberPix('');
    toast.success(`${trimmed} added`);
  };

  const removeMember = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Club name is required'); return; }

    const club: Club = {
      id: id || uuidv4(),
      name: name.trim(),
      description: description.trim(),
      members,
      createdAt: id ? getClub(id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
    };

    saveClub(club);
    toast.success(isEditing ? 'Club updated!' : 'Club created!');
    navigate(`/clubs/${club.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto" style={{ paddingBottom: 40 }}>
      <h1 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700,
        color: 'var(--md3-on-surface)', marginBottom: 24,
      }}>
        {isEditing ? 'Edit Club' : 'New Club'}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Club Name */}
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

        {/* Description */}
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

        {/* Members */}
        <div>
          <label className="type-label-medium" style={{
            display: 'block', fontWeight: 600, color: 'var(--md3-on-surface)', marginBottom: 8,
          }}>Members ({members.length})</label>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember(); }}}
              placeholder="Enter member name"
              className="input-outlined"
              style={{ flex: 1, minHeight: 48, borderRadius: 16 }}
            />
            <button type="button" onClick={addMember} className="btn-primary" style={{ height: 48, borderRadius: 16, padding: '0 20px' }}>
              Add
            </button>
          </div>
          <input
            type="text" value={newMemberPix} onChange={e => setNewMemberPix(e.target.value)}
            placeholder="Chave Pix (opcional) — CPF, e-mail, telefone ou chave aleatória"
            className="input-outlined"
            style={{ minHeight: 44, borderRadius: 16, fontSize: 14, marginBottom: 12 }}
          />

          {members.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '24px 16px',
              background: 'var(--md3-surface-container-low)',
              borderRadius: 16, border: '1px dashed var(--md3-outline-variant)',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: 28, color: 'var(--md3-on-surface-variant)', display: 'block', marginBottom: 4 }}>person_add</span>
              <p className="type-body-small" style={{ color: 'var(--md3-on-surface-variant)' }}>Add members to your club</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map(member => (
                <div key={member.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--md3-surface-container)', borderRadius: 14,
                  padding: '10px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--md3-primary-container)',
                      color: 'var(--md3-on-primary-container)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                    }}>{member.name.charAt(0).toUpperCase()}</div>
                    <span className="type-body-medium" style={{ fontWeight: 500, color: 'var(--md3-on-surface)' }}>{member.name}</span>
                    {member.pixKey && (
                      <span style={{
                        background: '#32BCAD', color: '#fff', fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 10,
                      }}>PIX</span>
                    )}
                  </div>
                  <button type="button" onClick={() => removeMember(member.id)} style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--md3-error)' }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary" style={{
          width: '100%', height: 48, borderRadius: 16, fontSize: 15, fontWeight: 600,
        }}>
          {isEditing ? 'Save Changes' : 'Create Club'}
        </button>
      </form>
    </div>
  );
};
