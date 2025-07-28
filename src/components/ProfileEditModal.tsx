import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Instagram, Twitter, Music, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any;
  onProfileUpdate: (profile: any) => void;
}

export const ProfileEditModal = ({ isOpen, onClose, currentProfile, onProfileUpdate }: ProfileEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    instagram: '',
    twitter: '',
    beatstars: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        display_name: currentProfile.display_name || '',
        username: currentProfile.username || '',
        bio: currentProfile.bio || '',
        location: currentProfile.location || '',
        website: currentProfile.website || '',
        instagram: currentProfile.instagram || '',
        twitter: currentProfile.twitter || '',
        beatstars: currentProfile.beatstars || '',
        avatar_url: currentProfile.avatar_url || ''
      });
    }
  }, [currentProfile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
      
      toast({
        title: "Avatar uploaded successfully",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
          website: formData.website,
          avatar_url: formData.avatar_url,
          // Store social links as JSON or separate columns based on your schema
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update the profile in parent component
      onProfileUpdate({
        ...currentProfile,
        ...formData
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
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
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="text-xl">
                  {formData.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
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
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Your display name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="@username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="yoursite.com"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Social Links</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Instagram className="w-5 h-5 text-pink-500" />
                <Input
                  value={formData.instagram}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="Instagram handle"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <Twitter className="w-5 h-5 text-blue-400" />
                <Input
                  value={formData.twitter}
                  onChange={(e) => setFormData(prev => ({ ...prev, twitter: e.target.value }))}
                  placeholder="Twitter handle"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <Music className="w-5 h-5 text-orange-500" />
                <Input
                  value={formData.beatstars}
                  onChange={(e) => setFormData(prev => ({ ...prev, beatstars: e.target.value }))}
                  placeholder="BeatStars profile"
                />
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