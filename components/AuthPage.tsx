import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';

// --- HELPER COMPONENTS (ICONS) ---
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);

// --- TYPE DEFINITIONS ---
export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

// --- SUB-COMPONENTS ---
const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 object-cover rounded-2xl" alt="avatar" />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

// --- MOCK DATA ---
const testimonials: Testimonial[] = [
    {
        avatarSrc: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        name: 'Alex Johnson',
        handle: '@alexj',
        text: 'FinPilot transformou meu caos financeiro em clareza total. Indispensável!',
    },
    {
        avatarSrc: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100',
        name: 'Maria Garcia',
        handle: '@mariag',
        text: 'A melhor ferramenta para orçamentos que já usei. Intuitiva e poderosa.',
    },
     {
        avatarSrc: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        name: 'Carlos Silva',
        handle: '@carlossilva',
        text: 'Finalmente atingi minhas metas de poupança graças à visão geral que o FinPilot oferece.',
    }
];


// --- MAIN COMPONENT ---
export const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [heroImageSrc, setHeroImageSrc] = useState<string | null>(null);
    const [isImageLoading, setIsImageLoading] = useState(true);

    useEffect(() => {
        const generateImage = async () => {
            try {
                setIsImageLoading(true);
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = "A dynamic and abstract 3D visualization representing financial growth and data streams, with a sleek, futuristic aesthetic. Use a palette of deep blues, purples, and vibrant teals, with glowing lines and particles to suggest movement and innovation.";

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: prompt }] },
                    config: {
                        responseModalities: [Modality.IMAGE],
                    },
                });

                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const base64ImageBytes: string = part.inlineData.data;
                        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
                        setHeroImageSrc(imageUrl);
                        break;
                    }
                }
            } catch (error) {
                console.error("Error generating image:", error);
                // Fallback to a default background color or image if generation fails
                setHeroImageSrc(''); // Set to empty to hide loader
            } finally {
                setIsImageLoading(false);
            }
        };

        generateImage();
    }, []);

    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error: authError } = isLogin
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });

            if (authError) throw authError;

            if (!isLogin) {
                setMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
            }
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const toggleAuthMode = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setIsLogin(!isLogin);
        setError('');
        setMessage('');
        setEmail('');
        setPassword('');
    };
    
    const handleGoogleSignIn = () => {
      alert("O login com o Google estará disponível em breve!");
    };

    const handleResetPassword = () => {
      alert("A funcionalidade de redefinição de senha estará disponível em breve!");
    };


  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw] bg-background text-foreground">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight tracking-tighter">
              {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">
              {isLogin ? 'Acesse sua conta para continuar sua jornada financeira.' : 'Comece a organizar suas finanças hoje mesmo.'}
            </p>

            <form className="space-y-5" onSubmit={handleAuth}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">Endereço de Email</label>
                <GlassInputWrapper>
                  <input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Digite seu e-mail" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">Senha</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Digite sua senha" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span className="text-foreground/90">Manter-me conectado</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); handleResetPassword(); }} className="hover:underline text-violet-400 transition-colors">Esqueceu a senha?</a>
              </div>
              
              {error && <p className="animate-element text-sm text-red-400 text-center">{error}</p>}
              {message && <p className="animate-element text-sm text-green-400 text-center">{message}</p>}

              <button type="submit" disabled={loading} className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
              </button>
            </form>

            <div className="animate-element animate-delay-700 relative flex items-center justify-center">
              <span className="w-full border-t border-border"></span>
              <span className="px-4 text-sm text-muted-foreground bg-background absolute">Ou continue com</span>
            </div>

            <button onClick={handleGoogleSignIn} className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors">
                <GoogleIcon />
                Continuar com Google
            </button>

            <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              {isLogin ? 'Novo na plataforma?' : 'Já possui uma conta?'}{' '}
              <a href="#" onClick={toggleAuthMode} className="text-violet-400 hover:underline transition-colors">
                 {isLogin ? 'Criar Conta' : 'Fazer Login'}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      <section className="hidden md:block flex-1 relative p-4">
        {isImageLoading ? (
            <div className="absolute inset-4 rounded-3xl bg-secondary animate-pulse"></div>
        ) : heroImageSrc ? (
          <>
            <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" style={{ backgroundImage: `url(${heroImageSrc})` }}></div>
            {testimonials.length > 0 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
                <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
                {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
                {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
};