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
    username: '', 
    displayName: '', 
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
      const sanitizedUsername = sanitizeText(signupForm.username);
      const sanitizedDisplayName = sanitizeText(signupForm.displayName);
      const { data, error } = await supabase.auth.signUp({
        email: signupForm.email.trim(),
        password: signupForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: sanitizedDisplayName,
            username: sanitizedUsername,
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
        
        // Create profile record in the profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            username: sanitizedUsername,
            display_name: sanitizedDisplayName,
            email: signupForm.email.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          toast({
            title: "Profile Creation Failed",
            description: "Account created but profile setup failed. Please contact support.",
            variant: "destructive",
          });
        } else {
          console.log('Profile created successfully');
        }
        
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
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  value={signupForm.username}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, username: sanitizeText(e.target.value) }))}
                  placeholder="Username"
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground mt-1">This cannot be changed later</p>
              </div>

              <div>
                <Label htmlFor="signup-display-name">Display Name</Label>
                <Input
                  id="signup-display-name"
                  value={signupForm.displayName}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, displayName: sanitizeText(e.target.value) }))}
                  placeholder="Your display name"
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
                  !signupForm.username || 
                  !signupForm.displayName || 
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



      </DialogContent>
    </Dialog>
  );
};