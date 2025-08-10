# Google Authentication Setup for Beatify

## 1. Configure Google OAuth in Supabase Dashboard

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)

### Step 2: Create OAuth Credentials
1. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
2. Choose "Web application" as application type
3. Add these Authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `https://your-domain.com` (for production)
4. Add these Authorized redirect URIs:
   - `https://hkdsiivrjquuiekygfcu.supabase.co/auth/v1/callback` (your Supabase project)
   - `http://localhost:5173` (for development)
5. Save and copy the **Client ID** and **Client Secret**

### Step 3: Configure Supabase
1. Go to your Supabase Dashboard
2. Navigate to Authentication → Providers
3. Enable Google provider
4. Paste your Google **Client ID** and **Client Secret**
5. Save the configuration

## 2. Test the Integration

### Development Testing
1. Run your app with `npm run dev`
2. Click "Sign in" → "Continue with Google"
3. You should be redirected to Google's consent screen
4. After approval, you'll be redirected back to your app

### What Happens Behind the Scenes
1. User clicks "Continue with Google"
2. Redirected to Google OAuth consent screen
3. After approval, Google redirects to Supabase callback URL
4. Supabase creates/authenticates the user
5. App automatically creates a profile for Google users
6. User is signed in to Beatify

## 3. Features Included

### Google Sign-In Button
- ✅ Clean UI with Google logo
- ✅ Rate limiting protection
- ✅ Error handling and user feedback
- ✅ Loading states

### Automatic Profile Creation
- ✅ Extracts name, email, and avatar from Google
- ✅ Generates unique username automatically
- ✅ Creates profile in your profiles table
- ✅ Handles duplicate usernames

### Security Features
- ✅ Rate limiting on authentication attempts
- ✅ Proper error handling
- ✅ Secure OAuth flow through Supabase

## 4. Troubleshooting

### Common Issues

**"OAuth client not found" error:**
- Double-check your Google Client ID in Supabase
- Ensure your redirect URIs match exactly

**"Unauthorized domain" error:**
- Add your domain to Google Console's authorized origins
- For localhost, use `http://localhost:5173` (not 127.0.0.1)

**Profile not created:**
- Check browser console for errors
- Verify profiles table permissions in Supabase

**Redirect not working:**
- Ensure callback URL in Google Console matches Supabase project URL
- Check that the provider is enabled in Supabase

### Testing Checklist
- [ ] Google OAuth configured in Supabase
- [ ] Google Cloud Console credentials set up
- [ ] Redirect URLs match exactly
- [ ] Can click "Continue with Google"
- [ ] Redirected to Google consent screen
- [ ] Successfully redirected back to app
- [ ] User profile created automatically
- [ ] User signed in successfully

## 5. Production Deployment

When deploying to production:
1. Update Google Console with your production domain
2. Update authorized redirect URIs with your production Supabase URL
3. Test the complete flow on your live site

Your Google authentication is now ready! Users can sign in with their Google accounts and start using Beatify immediately.