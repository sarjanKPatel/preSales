'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { VisionChatLayout } from '@/components/chat';
import { DraftVision } from '@/components/chat';
import { useCreateCompanyProfile } from '@/database/vision/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Remove mock sessions - ChatLayout now fetches its own data from the database

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [chatType, setChatType] = useState<'vision' | 'lead' | 'proposal'>('vision');
  const { createProfile, loading: savingVision, error: saveError } = useCreateCompanyProfile();

  useEffect(() => {
    const type = searchParams.get('type') as 'vision' | 'lead' | 'proposal';
    if (type && ['vision', 'lead', 'proposal'].includes(type)) {
      setChatType(type);
    }
  }, [searchParams]);

  const handleSaveVision = async (vision: DraftVision) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    if (!vision.companyName) {
      console.error('Company name is required');
      return;
    }

    try {
      const profile = await createProfile({
        name: vision.companyName,
        user_id: user.id,
        company_vision: {
          mission: vision.mission,
          values: vision.values,
          goals: vision.goals,
          uniqueValue: vision.uniqueValue,
          companyName: vision.companyName
        },
        metadata: {
          status: 'draft',
          created_from: 'chat'
        }
      });

      if (profile) {
        console.log('Vision saved successfully:', profile);
        // Show success message
        alert('Vision saved successfully!');
        // Redirect to vision page
        router.push('/vision');
      } else if (saveError) {
        console.error('Failed to save vision:', saveError);
        alert('Failed to save vision: ' + saveError);
      }
    } catch (error) {
      console.error('Error saving vision:', error);
      alert('An error occurred while saving the vision');
    }
  };

  return (
    <Layout maxWidth="full" padding={false}>
      <div className="h-[calc(100vh-4rem)]">
        <VisionChatLayout
          onSaveVision={handleSaveVision}
        />
      </div>
    </Layout>
  );
}