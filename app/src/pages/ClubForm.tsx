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
    if (!trimmed) {
      toast.error('Enter a member name');
      return;
    }
    if (members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Member already exists');
      return;
    }
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
    if (!name.trim()) {
      toast.error('Club name is required');
      return;
    }

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
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
        {isEditing ? 'Edit Club' : 'New Club'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1.5">Club Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Confraria do Vinho"
            className="w-full px-4 py-3 rounded-2xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow"
            style={{ fontSize: '16px', minHeight: '48px' }}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's your club about?"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow resize-none"
            style={{ fontSize: '16px', minHeight: '48px' }}
          />
        </div>

        {/* Members */}
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">
            Members ({members.length})
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addMember();
                }
              }}
              placeholder="Enter member name"
              className="flex-1 px-4 py-3 rounded-2xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow"
              style={{ fontSize: '16px', minHeight: '48px' }}
            />
            <button
              type="button"
              onClick={addMember}
              className="bg-burgundy text-cream px-5 py-3 rounded-2xl font-semibold hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-sm min-h-[48px]"
            >
              Add
            </button>
          </div>
          <input
            type="text"
            value={newMemberPix}
            onChange={e => setNewMemberPix(e.target.value)}
            placeholder="Chave Pix (opcional) — CPF, e-mail, telefone ou chave aleatória"
            className="w-full px-4 py-2.5 rounded-2xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow mb-3"
            style={{ fontSize: '14px', minHeight: '44px' }}
          />

          {members.length === 0 ? (
            <div className="text-center py-6 bg-cream/50 rounded-2xl border border-dashed border-cream-dark">
              <span className="text-2xl block mb-1">👤</span>
              <p className="text-xs text-charcoal-light">Add members to your club</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-cream-dark group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-burgundy/10 flex items-center justify-center text-sm font-semibold text-burgundy">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-charcoal">{member.name}</span>
                    {member.pixKey && (
                      <span className="bg-[#32BCAD] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PIX</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="text-red-400 hover:text-red-600 text-xs font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-burgundy text-cream py-3.5 rounded-2xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-md min-h-[48px]"
        >
          {isEditing ? 'Save Changes' : 'Create Club'}
        </button>
      </form>
    </div>
  );
};
