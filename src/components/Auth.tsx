import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { LogIn, LogOut, User as UserIcon, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import logo from '../logo.png';
import tgiLogo from '../TGISport_Black.png';
import loginBg from '../Sfondo_Login.png';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Create default profile if not exists
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'supponor.isg@gmail.com' ? 'admin' : 'user'
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <AuthContext.Provider value={{ user, profile, signOut: () => signOut(auth) }}>
      {children}
    </AuthContext.Provider>
  );
};

interface AuthContextType {
  user: User;
  profile: UserProfile | null;
  signOut: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const LoginView = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isPasswordReset) {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
        setSuccess('Link per recupero password inviato! Controlla la tua email.');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      
      <div className="absolute top-8 left-8 z-10">
        <img 
          src={tgiLogo} 
          alt="TGI Sport" 
          className="h-16 w-auto object-contain brightness-0 invert"
        />
      </div>
      <div className="max-w-md w-full space-y-8 bg-white/95 p-8 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm relative z-10">
        <div className="text-center">
          <div className="mx-auto h-32 w-auto flex items-center justify-center mb-4">
            <img 
              src={logo} 
              alt="OmniLive Logo" 
              className="h-full w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-500 uppercase tracking-widest">
            Production & Workorder Management
          </p>
        </div>

        {isPasswordReset ? (
          <div className="mt-8 space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Recupera Password</h3>
              <p className="text-xs text-slate-500 mt-1">
                Inserisci la tua email per ricevere il link di reimpostazione della password.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  placeholder="La tua email..."
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100 font-medium">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || resetSent}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Invia link di recupero'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setIsPasswordReset(false);
                  setResetSent(false);
                  setError('');
                  setSuccess('');
                }}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Torna al Login
              </button>
            </div>
          </div>
        ) : (
          <>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log in'}
                </button>
              </div>
            </form>
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setIsPasswordReset(true);
                  setError('');
                }}
                className="text-sm text-slate-500 hover:text-slate-700 font-semibold hover:underline"
              >
                Password dimenticata?
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
