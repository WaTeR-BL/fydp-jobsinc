'use client';

import { forwardRef } from 'react';
import PhoneInput, { type Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Thin adapter so react-phone-number-input uses shadcn's Input internally
const ShadcnInput = forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} className={cn('rounded-l-none border-l-0', className)} {...props} />
  )
);
ShadcnInput.displayName = 'ShadcnInput';

interface WhatsAppPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: Country;
  placeholder?: string;
  className?: string;
}

export function WhatsAppPhoneInput({
  value,
  onChange,
  defaultCountry = 'PK',
  placeholder = 'Enter phone number',
  className,
}: WhatsAppPhoneInputProps) {
  return (
    <div className={cn('whatsapp-phone-input', className)}>
      <PhoneInput
        international
        defaultCountry={defaultCountry}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        inputComponent={ShadcnInput}
        placeholder={placeholder}
      />
      <style>{`
        .whatsapp-phone-input .PhoneInput {
          display: flex;
          align-items: center;
          gap: 0;
        }
        .whatsapp-phone-input .PhoneInputCountry {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          height: 40px;
          border: 1px solid hsl(var(--input));
          border-right: 0;
          border-radius: calc(var(--radius) - 2px) 0 0 calc(var(--radius) - 2px);
          background: hsl(var(--background));
          cursor: pointer;
          flex-shrink: 0;
        }
        .whatsapp-phone-input .PhoneInputCountryIcon {
          width: 20px;
          height: 15px;
          border-radius: 2px;
          overflow: hidden;
          display: flex;
          align-items: center;
        }
        .whatsapp-phone-input .PhoneInputCountryIcon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .whatsapp-phone-input .PhoneInputCountrySelectArrow {
          width: 6px;
          height: 6px;
          border-right: 1.5px solid hsl(var(--muted-foreground));
          border-bottom: 1.5px solid hsl(var(--muted-foreground));
          transform: rotate(45deg) translateY(-2px);
          margin-left: 2px;
          opacity: 0.7;
        }
        .whatsapp-phone-input .PhoneInputCountrySelect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        .whatsapp-phone-input .PhoneInputCountry {
          position: relative;
        }
      `}</style>
    </div>
  );
}
