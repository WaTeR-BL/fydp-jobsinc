'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BackButtonProps = {
  href?: string;
  label?: string;
  iconOnly?: boolean;
};

const BackButton = ({ href, label = 'Back', iconOnly = true }: BackButtonProps) => {
  const router = useRouter();

  const handleBack = () => {
    if (href) {
      router.push(href);
      return;
    }
    router.back();
  };

  return (
    <Button
      variant="ghost"
      size={iconOnly ? 'icon' : 'sm'}
      onClick={handleBack}
      className="group transition-all duration-200 hover:bg-accent/50"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
      {!iconOnly && <span className="ml-2">{label}</span>}
    </Button>
  );
};

export default BackButton;
