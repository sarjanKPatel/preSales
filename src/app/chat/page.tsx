'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { VisionChatLayout } from '@/components/chat';
import { DraftVision } from '@/components/chat';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Remove mock sessions - ChatLayout now fetches its own data from the database

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [chatType, setChatType] = useState<'vision' | 'lead' | 'proposal'>('vision');
  // TODO: Replace with new database integration
  const createProfile = async () => { return null; };
  const savingVision = false;
  const saveError = null;

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
      // TODO: Replace with new database integration
      const profile = await createProfile();

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
    <div className="h-[calc(100vh-4rem)] w-full">
      <VisionChatLayout
        onSaveVision={handleSaveVision}
        className="h-full"
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}