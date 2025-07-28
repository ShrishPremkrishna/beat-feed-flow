import { useState } from 'react';
import { Eye, EyeOff, Music, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validatePassword, rateLimiter, sanitizeText } from '@/lib/security';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (user: any) => void;
}

export const AuthModal = ({ isOpen, onClose, onAuth }: AuthModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  const { toast } = useToast();

  // Handle password validation in real-time
  const handlePasswordChange = (password: string) => {
    setSignupForm(prev => ({ ...prev, password }));
    setPasswordValidation(validatePassword(password));
  };

  const handleLogin = async () => {
    // Rate limiting for login attempts
    if (!rateLimiter.canAttempt('login', 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime('login', 15 * 60 * 1000) / 1000 / 60);
      toast({
        title: "Too many login attempts",
        description: `Please wait ${remainingTime} minutes before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        console.log('Login successful:', data.user.id);
        onAuth(data.user);
        onClose();
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        
        // Force a page reload to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    // Validate password strength
    if (!passwordValidation.isValid) {
      toast({
        title: "Password requirements not met",
        description: "Please ensure your password meets all security requirements.",
        variant: "destructive",
      });
      return;
    }

    // Validate password confirmation
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    // Rate limiting for signup attempts
    if (!rateLimiter.canAttempt('signup', 3, 60 * 60 * 1000)) { // 3 attempts per hour
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime('signup', 60 * 60 * 1000) / 1000 / 60);
      toast({
        title: "Too many signup attempts",
        description: `Please wait ${remainingTime} minutes before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const sanitizedName = sanitizeText(signupForm.name);
      const { data, error } = await supabase.auth.signUp({
        email: signupForm.email.trim(),
        password: signupForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: sanitizedName,
            username: sanitizedName.toLowerCase().replace(/\s+/g, '_'),
          }
        }
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        console.log('Signup successful:', data.user.id);
        onAuth(data.user);
        onClose();
        toast({
          title: "Account Created!",
          description: "Welcome to Beatify! You can now start sharing your beats.",
        });
        
        // Force a page reload to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-primary/20 fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-[9999]">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Welcome to Beatify
          </DialogTitle>
          <DialogDescription>
            Join the community of music creators, share beats, and discover new collaborations
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleLogin} 
                className="w-full btn-gradient"
                disabled={isLoading || !loginForm.email || !loginForm.password}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>

            <div className="text-center">
              <Button variant="link" className="text-sm text-primary">
                Forgot your password?
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-4">
                <div>
                <Label htmlFor="signup-name">Artist/Producer Name</Label>
                <Input
                  id="signup-name"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, name: sanitizeText(e.target.value) }))}
                  placeholder="Your stage name"
                  maxLength={50}
                />
              </div>

              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={signupForm.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Create a strong password"
                    className={`pr-10 ${
                      signupForm.password && !passwordValidation.isValid 
                        ? 'border-destructive' 
                        : signupForm.password && passwordValidation.isValid 
                        ? 'border-green-500' 
                        : ''
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Password Strength Indicator */}
                {signupForm.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 flex-1 rounded-full ${
                        passwordValidation.strength === 'weak' ? 'bg-red-200' :
                        passwordValidation.strength === 'medium' ? 'bg-yellow-200' : 'bg-green-200'
                      }`}>
                        <div className={`h-full rounded-full transition-all ${
                          passwordValidation.strength === 'weak' ? 'w-1/3 bg-red-500' :
                          passwordValidation.strength === 'medium' ? 'w-2/3 bg-yellow-500' : 'w-full bg-green-500'
                        }`} />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordValidation.strength === 'weak' ? 'text-red-600' :
                        passwordValidation.strength === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {passwordValidation.strength}
                      </span>
                    </div>
                    
                    {/* Password Requirements Checklist */}
                    <div className="space-y-1">
                      {passwordValidation.errors.map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span className="text-red-600">{error}</span>
                        </div>
                      ))}
                      {passwordValidation.isValid && (
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-green-600">Password meets all requirements</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm your password"
                />
              </div>

              <Button 
                onClick={handleSignup} 
                className="w-full btn-gradient"
                disabled={
                  isLoading || 
                  !signupForm.name || 
                  !signupForm.email || 
                  !signupForm.password || 
                  !passwordValidation.isValid || 
                  signupForm.password !== signupForm.confirmPassword
                }
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <Button variant="outline" className="w-full max-w-sm">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          By signing up, you agree to our{' '}
          <Button variant="link" className="p-0 h-auto text-sm text-primary">
            Terms of Service
          </Button>{' '}
          and{' '}
          <Button variant="link" className="p-0 h-auto text-sm text-primary">
            Privacy Policy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};