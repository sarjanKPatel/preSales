'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Proposal } from '@/types';
import Layout from '@/components/layout/Layout';
import ProposalList from '@/components/proposals/ProposalList';
import CreateProposalModal from '@/components/proposals/CreateProposalModal';

export default function ProposalsPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateProposal = () => {
    setShowCreateModal(true);
  };

  const handleChatAssist = () => {
    router.push('/chat?type=proposal');
  };

  const handleProposalCreated = (proposalId: string) => {
    setShowCreateModal(false);
    router.push(`/proposals/${proposalId}`);
  };

  const handleOpenProposal = (proposal: Proposal) => {
    router.push(`/proposals/${proposal.id}`);
  };

  return (
    <Layout maxWidth="full">
      <ProposalList
        onCreateProposal={handleCreateProposal}
        onChatAssist={handleChatAssist}
        onOpenProposal={handleOpenProposal}
      />

      <CreateProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleProposalCreated}
      />
    </Layout>
  );
}