import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, X, UserPlus } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface CreateUserModalProps {
  onClose: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    role: 'operator' as 'admin' | 'production' | 'operator'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // NOTE: Client-side user creation requires configuration or a backend function
      // as it's insecure to do in production directly from client.
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: `${formData.name} ${formData.surname}`,
        role: formData.role
      });
      onClose();
    } catch (err) {
      console.error("Failed to create user", err);
      alert('Failed to create user. Ensure Auth is configured to allow registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900">Create New User</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <input required placeholder="Name" className="px-3 py-2 border rounded-lg" onChange={e => setFormData({...formData, name: e.target.value})} />
             <input required placeholder="Surname" className="px-3 py-2 border rounded-lg" onChange={e => setFormData({...formData, surname: e.target.value})} />
          </div>
          <input required type="email" placeholder="Email" className="w-full px-3 py-2 border rounded-lg" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input required type="password" placeholder="Password" className="w-full px-3 py-2 border rounded-lg" onChange={e => setFormData({...formData, password: e.target.value})} />
          <select className="w-full px-3 py-2 border rounded-lg" onChange={e => setFormData({...formData, role: e.target.value as any})}>
              <option value="operator">Operator</option>
              <option value="production">Production</option>
              <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Create User
          </button>
        </form>
      </motion.div>
    </div>
  );
};
