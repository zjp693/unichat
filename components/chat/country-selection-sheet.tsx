'use client';

import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { useState, useEffect } from 'react';

// Define country type
interface Country {
  name: string;
  flag: string;
  code: string;
}

const countries: Country[] = [
  { name: '中国', flag: '/nation/China.png', code: 'CN' },
  { name: 'កម្ពុជា', flag: '/nation/Cambodia.png', code: 'KH' },
  { name: 'America', flag: '/nation/USA.png', code: 'US' },
  { name: 'Viet Nam', flag: '/nation/Viet Nam.png', code: 'VN' },
  { name: 'ประเทศไทย', flag: '/nation/Thailand.png', code: 'TH' },
  { name: 'भारत', flag: '/nation/India.png', code: 'IN' }
];

interface CountrySelectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (country: string) => void;
  defaultCountry?: string;
}

export function CountrySelectionSheet({
  isOpen,
  onClose,
  onSelect,
  defaultCountry = 'Viet Nam'
}: CountrySelectionSheetProps) {
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);

  // Reset selection when re-opening
  useEffect(() => {
    if (isOpen) {
      setSelectedCountry(defaultCountry);
    }
  }, [isOpen, defaultCountry]);

  const handleConfirm = () => {
    if (onSelect) {
      onSelect(selectedCountry);
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-[20px] p-0 overflow-hidden max-h-[90vh] flex flex-col gap-0 border-t-0"
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-1 bg-white">
          <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
        </div>

        <SheetHeader className="px-5 pb-4 text-left bg-white">
          <SheetTitle className="text-lg font-bold">国家</SheetTitle>
          <SheetDescription className="sr-only">
            选择您的国家或地区
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="px-5 pb-8 overflow-y-auto bg-white">
          <div className="grid grid-cols-2 gap-3 mb-8">
            {countries.map((country) => (
              <CountryOption
                key={country.name}
                name={country.name}
                flag={country.flag}
                isSelected={selectedCountry === country.name}
                onSelect={() => setSelectedCountry(country.name)}
              />
            ))}
          </div>

          <button
            className="w-full bg-[#5637f5] text-white font-medium py-3.5 rounded-xl hover:bg-[#4a2ee0] active:scale-[0.98] transition-all shadow-lg shadow-[#5637f5]/20"
            onClick={handleConfirm}
          >
            确认
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CountryOption({
  name,
  flag,
  isSelected,
  onSelect
}: {
  name: string;
  flag: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`
        flex items-center p-3 rounded-xl cursor-pointer border transition-all relative overflow-hidden select-none
        ${
          isSelected
            ? 'bg-[#f4f1ff] border-[#8a70ff] shadow-sm'
            : 'bg-gray-50 border-transparent hover:bg-gray-100'
        }
      `}
      onClick={onSelect}
    >
      <div className="w-9 h-9 mr-3 rounded-sm shadow-sm overflow-hidden relative border border-black/5 flex-shrink-0">
        <Image
          src={flag}
          alt={name}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
      <span
        className={`text-sm font-medium truncate ${isSelected ? 'text-[#5637f5]' : 'text-gray-700'}`}
      >
        {name}
      </span>
    </div>
  );
}
