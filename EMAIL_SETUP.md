# Email Setup Guide

This guide walks you through setting up email delivery for workspace invitations using Resend + Supabase Edge Functions.

## 🔧 Setup Steps

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email address
3. Go to **API Keys** section
4. Create a new API key and copy it

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Resend API Key (from step 1)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Your site URL (for email links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_SITE_URL=https://yourapp.com  # Production
```

### 3. Deploy Supabase Edge Function

1. Install Supabase CLI if you haven't:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Deploy the Edge Function:
   ```bash
   supabase functions deploy send-invite-email
   ```

5. Set environment variables in Supabase:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   supabase secrets set SITE_URL=https://yourapp.com
   ```

### 4. Configure Email Domain (Production)

For production, you'll need to:

1. **Add your domain to Resend:**
   - Go to Resend dashboard → Domains
   - Add your domain (e.g., `yourapp.com`)
   - Add the DNS records Resend provides

2. **Update the "from" address** in the Edge Function:
   ```typescript
   // In supabase/functions/send-invite-email/index.ts
   from: 'PropelIQ <invites@yourapp.com>',  // Change this
   ```

### 5. Test Email Delivery

1. **Development Testing:**
   ```bash
   # Start your dev server
   npm run dev
   
   # Send a test invite from the app
   # Check console logs for email sending status
   ```

2. **Edge Function Testing:**
   ```bash
   # Test the function directly
   supabase functions serve send-invite-email
   
   # In another terminal, test with curl:
   curl -X POST 'http://localhost:54321/functions/v1/send-invite-email' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"invite_id": "test-id", "workspace_name": "Test Workspace", "invited_by_name": "John Doe", "invite_email": "test@example.com", "invite_role": "member"}'
   ```

## 📧 Email Flow

### When Invites Are Sent

1. **Create Invite**: User sends invite through the app
2. **Database Record**: Invite record created in `workspace_invites`
3. **Edge Function**: Automatically called to send email
4. **Email Delivery**: Resend sends the email
5. **User Receives**: Email with accept/decline links

### Email Content

The email includes:
- ✅ Workspace name and inviter info
- ✅ Role-specific permissions list
- ✅ Accept/Decline buttons with direct links
- ✅ Professional HTML design
- ✅ 14-day expiration notice

### Accept/Decline Flow

- **Accept Link**: `/invite/accept?id=INVITE_ID`
- **Decline Link**: `/invite/decline?id=INVITE_ID`
- **Smart Routing**: Handles sign-in requirements
- **Status Validation**: Prevents expired/revoked invite acceptance

## 🚨 Troubleshooting

### Common Issues

1. **Email Not Sending**:
   - Check RESEND_API_KEY in Supabase secrets
   - Verify Edge Function deployment
   - Check function logs in Supabase dashboard

2. **Links Not Working**:
   - Verify SITE_URL environment variable
   - Check accept/decline page routing

3. **Domain Issues (Production)**:
   - Ensure DNS records are properly configured
   - Wait for DNS propagation (up to 24 hours)
   - Check domain verification in Resend dashboard

### Debug Commands

```bash
# View function logs
supabase functions logs send-invite-email

# Check secrets
supabase secrets list

# Test function locally
supabase functions serve --env-file .env.local
```

## 📊 Monitoring

### Email Metrics (Resend Dashboard)

- **Delivery Rate**: Should be >95%
- **Open Rate**: Typical 20-40%
- **Click Rate**: Typical 2-10%
- **Bounce Rate**: Should be <5%

### Application Metrics

- Monitor console logs for email send failures
- Track invite acceptance rates
- Monitor user feedback about email delivery

## 💰 Cost Estimates

### Resend Pricing (2025)

- **Free**: 100 emails/day, 3,000/month
- **Pro**: $20/month for 50,000 emails
- **Enterprise**: Custom pricing

### Typical Usage

- **Small Team** (10 users): ~20 invites/month = Free tier
- **Growing Company** (100 users): ~200 invites/month = Free tier
- **Enterprise** (1000+ users): Pro tier recommended

## 🔐 Security Notes

- ✅ API keys stored securely in Supabase secrets
- ✅ Email links include unique invite IDs
- ✅ Invite expiration prevents stale link usage
- ✅ Status validation prevents replay attacks
- ✅ User email verification required for acceptance

## 🎯 Next Steps

After setup, you can:
1. Customize email templates in the Edge Function
2. Add email analytics tracking
3. Implement email preferences
4. Add welcome emails after acceptance
5. Set up email notifications for admins