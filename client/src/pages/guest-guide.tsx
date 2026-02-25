/**
 * Guest Guide Management Page
 * Main page for managing guest success page content
 * Integrates the GuestGuideEditor with full context support
 */

import React from 'react';
import { GuestGuideProvider } from '@/lib/contexts/guest-guide-context';
import GuestGuideEditor from '@/components/guest-guide/GuestGuideEditor';
import { ProtectedRoute } from '@/components/protected-route';

/**
 * Guest Guide Page Component
 * Wrapped with context provider and authentication protection
 */
export default function GuestGuidePage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <GuestGuideProvider>
        <GuestGuideEditor />
      </GuestGuideProvider>
    </ProtectedRoute>
  );
}
