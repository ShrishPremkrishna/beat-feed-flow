import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { InitialsAvatar } from '@/components/ui/initials-avatar';
import { Camera, Instagram, Twitter, Music, Globe, Volume2, Youtube, Apple, Video } from 'lucide-react';
import { SpotifyIcon, AppleMusicIcon, TikTokIcon, BeatStarsIcon, SoundCloudIcon } from '@/components/ui/brand-icons';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateURL, validateSocialHandle, sanitizeText, validateImageFile, rateLimiter } from '@/lib/security';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any;
  onProfileUpdate: (profile: any) => void;
}

export const ProfileEditModal = ({ isOpen, onClose, currentProfile, onProfileUpdate }: ProfileEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    instagram: '',
    twitter: '',
    beatstars: '',
    soundcloud: '',
    spotify: '',
    apple_music: '',
    youtube: '',
    tiktok: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        display_name: currentProfile.display_name || '',
        username: currentProfile.username || '',
        bio: currentProfile.bio || '',
        instagram: currentProfile.instagram || '',
        twitter: currentProfile.twitter || '',
        beatstars: currentProfile.beatstars || '',
        soundcloud: currentProfile.soundcloud || '',
        spotify: currentProfile.spotify || '',
        apple_music: currentProfile.apple_music || '',
        youtube: currentProfile.youtube || '',
        tiktok: currentProfile.tiktok || '',
        avatar_url: currentProfile.avatar_url || ''
      });
    }
  }, [currentProfile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      // Rate limiting for file uploads
      if (!rateLimiter.canAttempt('avatar_upload', 5, 60 * 60 * 1000)) { // 5 uploads per hour
        const remainingTime = Math.ceil(rateLimiter.getRemainingTime('avatar_upload', 60 * 60 * 1000) / 1000 / 60);
        toast({
          title: "Upload limit reached",
          description: `Please wait ${remainingTime} minutes before uploading another avatar.`,
          variant: "destructive",
        });
        return;
      }

      setUploading(true);
      console.log('Starting avatar upload...');
      
      const file = event.target.files?.[0];
      if (!file) {
        console.log('No file selected');
        return;
      }

      console.log('File selected:', file.name, file.type, file.size);

      // Enhanced file validation using security utilities
      const validation = await validateImageFile(file, 5);
      if (!validation.isValid) {
        console.log('File validation failed:', validation.errors);
        toast({
          title: "Invalid file",
          description: validation.errors.join(' '),
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        throw new Error('No authenticated user found');
      }

      console.log('User authenticated:', user.id);

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      console.log('Generated filename with user folder:', fileName);

      // First, try to delete any existing avatar in the user's folder
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `${user.id}/${file.name}`);
        console.log('Removing old avatars:', filesToDelete);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      console.log('Uploading to storage...');
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      console.log('Generated public URL:', urlData.publicUrl);
      
      // Update form data immediately
      setFormData(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
      
      // Also update the database immediately
      console.log('Updating database...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      console.log('Database updated successfully');
      
      toast({
        title: "Avatar uploaded successfully",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: `Failed to upload avatar: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};



    // Validate social handles
    if (formData.instagram && !validateSocialHandle(formData.instagram, 'instagram')) {
      errors.instagram = 'Invalid Instagram handle (1-30 characters, letters, numbers, underscores, periods only)';
    }

    if (formData.twitter && !validateSocialHandle(formData.twitter, 'twitter')) {
      errors.twitter = 'Invalid Twitter handle (1-30 characters, letters, numbers, underscores, periods only)';
    }

    if (formData.beatstars && !validateSocialHandle(formData.beatstars, 'beatstars')) {
      errors.beatstars = 'Invalid BeatStars profile name';
    }

    if (formData.soundcloud && !validateSocialHandle(formData.soundcloud, 'beatstars')) {
      errors.soundcloud = 'Invalid SoundCloud profile name';
    }

    if (formData.spotify && !validateSocialHandle(formData.spotify, 'beatstars')) {
      errors.spotify = 'Invalid Spotify profile name';
    }

    if (formData.youtube && !validateSocialHandle(formData.youtube, 'beatstars')) {
      errors.youtube = 'Invalid YouTube channel name';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted errors before saving.",
        variant: "destructive",
      });
      return;
    }

    // Rate limiting for profile updates
    if (!rateLimiter.canAttempt('profile_update', 10, 60 * 60 * 1000)) { // 10 updates per hour
      const remainingTime = Math.ceil(rateLimiter.getRemainingTime('profile_update', 60 * 60 * 1000) / 1000 / 60);
      toast({
        title: "Update limit reached",
        description: `Please wait ${remainingTime} minutes before updating your profile again.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      console.log('Updating profile with data:', formData);

      // Sanitize text inputs
      const sanitizedData = {
        display_name: sanitizeText(formData.display_name),
        username: sanitizeText(formData.username).toLowerCase().replace(/\s+/g, '_'),
        bio: sanitizeText(formData.bio),
        instagram: formData.instagram.replace(/^@/, '').trim(),
        twitter: formData.twitter.replace(/^@/, '').trim(),
        beatstars: formData.beatstars.trim(),
        soundcloud: formData.soundcloud.trim(),
        spotify: formData.spotify.trim(),
        apple_music: formData.apple_music.trim(),
        youtube: formData.youtube.replace(/^@/, '').trim(),
        tiktok: formData.tiktok.replace(/^@/, '').trim(),
        avatar_url: formData.avatar_url,
      };

      const { error, data } = await supabase
        .from('profiles')
        .update({
          ...sanitizedData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile updated successfully:', data);

      // Update the profile in parent component with the fresh database data
      onProfileUpdate(data[0]); // data[0] contains the updated record from the database

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <InitialsAvatar
                name={formData.display_name}
                avatarUrl={formData.avatar_url}
                size="xl"
              />
              <label 
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: sanitizeText(e.target.value) }))}
                  onFocus={(e) => {
                    // Move cursor to end instead of selecting all text
                    const target = e.target as HTMLInputElement;
                    setTimeout(() => {
                      target.setSelectionRange(target.value.length, target.value.length);
                    }, 0);
                  }}
                  placeholder="Your display name"
                  maxLength={50}
                  required
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: sanitizeText(e.target.value) }))}
                  placeholder="@username"
                  maxLength={30}
                  required
                />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: sanitizeText(e.target.value) }))}
              placeholder="Tell us about yourself..."
              maxLength={500}
              className="min-h-[100px]"
            />
          </div>



          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Social Links</h3>
            
            <div className="space-y-3">
              {/* 1. BeatStars */}
              <div className="flex items-center space-x-3">
                <BeatStarsIcon className="w-5 h-5 text-orange-500" />
                <Input
                  value={formData.beatstars}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, beatstars: value }));
                    // Clear validation error on change
                    if (validationErrors.beatstars) {
                      setValidationErrors(prev => ({ ...prev, beatstars: '' }));
                    }
                  }}
                  placeholder="BeatStars profile"
                  className={validationErrors.beatstars ? 'border-destructive' : ''}
                />
                {validationErrors.beatstars && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.beatstars}</p>
                )}
              </div>

              {/* 2. Instagram */}
              <div className="flex items-center space-x-3">
                <Instagram className="w-5 h-5 text-pink-500" />
                <Input
                  value={formData.instagram}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, instagram: value }));
                    // Clear validation error on change
                    if (validationErrors.instagram) {
                      setValidationErrors(prev => ({ ...prev, instagram: '' }));
                    }
                  }}
                  placeholder="Instagram profile"
                  className={validationErrors.instagram ? 'border-destructive' : ''}
                />
                {validationErrors.instagram && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.instagram}</p>
                )}
              </div>

              {/* 3. YouTube */}
              <div className="flex items-center space-x-3">
                <Youtube className="w-5 h-5 text-red-500" />
                <Input
                  value={formData.youtube}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, youtube: value }));
                    // Clear validation error on change
                    if (validationErrors.youtube) {
                      setValidationErrors(prev => ({ ...prev, youtube: '' }));
                    }
                  }}
                  placeholder="YouTube channel"
                  className={validationErrors.youtube ? 'border-destructive' : ''}
                />
                {validationErrors.youtube && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.youtube}</p>
                )}
              </div>

              {/* 4. TikTok */}
              <div className="flex items-center space-x-3">
                <TikTokIcon className="w-5 h-5 text-red-600" />
                <Input
                  value={formData.tiktok}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, tiktok: value }));
                    // Clear validation error on change
                    if (validationErrors.tiktok) {
                      setValidationErrors(prev => ({ ...prev, tiktok: '' }));
                    }
                  }}
                  placeholder="TikTok profile"
                  className={validationErrors.tiktok ? 'border-destructive' : ''}
                />
                {validationErrors.tiktok && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.tiktok}</p>
                )}
              </div>

              {/* 5. SoundCloud */}
              <div className="flex items-center space-x-3">
                <SoundCloudIcon className="w-5 h-5 text-orange-500" />
                <Input
                  value={formData.soundcloud}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, soundcloud: value }));
                    // Clear validation error on change
                    if (validationErrors.soundcloud) {
                      setValidationErrors(prev => ({ ...prev, soundcloud: '' }));
                    }
                  }}
                  placeholder="SoundCloud profile"
                  className={validationErrors.soundcloud ? 'border-destructive' : ''}
                />
                {validationErrors.soundcloud && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.soundcloud}</p>
                )}
              </div>

              {/* 6. Spotify */}
              <div className="flex items-center space-x-3">
                <SpotifyIcon className="w-5 h-5 text-green-500" />
                <Input
                  value={formData.spotify}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, spotify: value }));
                    // Clear validation error on change
                    if (validationErrors.spotify) {
                      setValidationErrors(prev => ({ ...prev, spotify: '' }));
                    }
                  }}
                  placeholder="Spotify artist profile"
                  className={validationErrors.spotify ? 'border-destructive' : ''}
                />
                {validationErrors.spotify && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.spotify}</p>
                )}
              </div>

              {/* 7. Apple Music */}
              <div className="flex items-center space-x-3">
                <AppleMusicIcon className="w-5 h-5 text-slate-800" />
                <Input
                  value={formData.apple_music}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, apple_music: value }));
                    // Clear validation error on change
                    if (validationErrors.apple_music) {
                      setValidationErrors(prev => ({ ...prev, apple_music: '' }));
                    }
                  }}
                  placeholder="Apple Music artist profile"
                  className={validationErrors.apple_music ? 'border-destructive' : ''}
                />
                {validationErrors.apple_music && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.apple_music}</p>
                )}
              </div>

              {/* 8. Twitter */}
              <div className="flex items-center space-x-3">
                <Twitter className="w-5 h-5 text-blue-400" />
                <Input
                  value={formData.twitter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, twitter: value }));
                    // Clear validation error on change
                    if (validationErrors.twitter) {
                      setValidationErrors(prev => ({ ...prev, twitter: '' }));
                    }
                  }}
                  placeholder="Twitter profile"
                  className={validationErrors.twitter ? 'border-destructive' : ''}
                />
                                 {validationErrors.twitter && (
                   <p className="text-xs text-destructive mt-1">{validationErrors.twitter}</p>
                 )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-gradient">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};