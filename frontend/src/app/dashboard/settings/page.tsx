import { Suspense } from 'react';
import SettingsClient from './_components/settings-client';

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsClient />
    </Suspense>
  );
}
