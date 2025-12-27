'use client';

import Image from 'next/image';
import { Search, CirclePlus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { CountrySelectionSheet } from '@/components/chat/country-selection-sheet';
import { ChainSelectorDropdown } from '@/components/chat/chain-selector-dropdown';
import { WalletQRCodeSheet } from '@/components/chat/WalletQRCodeSheet';

export function ChatNavbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('中国'); // 默认中国

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isConnected } = useAccount();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleGroupChatClick = () => {
    setIsDropdownOpen(false);
    router.push('/chat/create-group');
  };

  const handleSearchClick = () => {
    router.push('/search');
  };

  const handleItemClick = () => {
    setIsDropdownOpen(false);
  };

  const handleScanClick = () => {
    setIsDropdownOpen(false);
    router.push('/scan');
  };

  const openCountryModal = () => {
    setIsDropdownOpen(false);
    setIsCountryModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between py-4 px-4 bg-white border-gray-200">
        {/* Left: Chain Selector or Wallet Connect */}
        <div className="flex items-center">
          {isConnected ? <ChainSelectorDropdown /> : <appkit-button />}
        </div>

        {/* Right: Icons Group */}
        <div className="flex items-center gap-4 text-gray-700">
          {/* Scan Icon */}
          <button
            className="p-1 rounded-full"
            onClick={() => setIsQRCodeOpen(true)}
          >
            <Image src="/chats/QRcode.png" alt="Scan" width={22} height={22} />
          </button>

          {/* Search Icon */}
          <button className="p-1 rounded-full" onClick={handleSearchClick}>
            <Search size={22} strokeWidth={1.5} />
          </button>

          {/* Plus Icon with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="p-1 rounded-full flex items-center"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <CirclePlus size={22} strokeWidth={1.5} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-40 bg-[#424242] text-xs text-white shadow-xl rounded-lg z-50 overflow-hidden">
                {/* Arrow pointing up */}
                <div className="absolute -top-2 right-2 w-0 h-0 border-l-8 border-r-8 border-b-[8px] border-l-transparent border-r-transparent border-b-[#424242]"></div>

                <div className="flex flex-col py-1">
                  <MenuItem
                    icon="/chats/Group chat.png"
                    label="Group chat"
                    onClick={handleGroupChatClick}
                  />
                  <MenuItem
                    icon="/chats/Global Contacts.png"
                    label="Global Contacts"
                    onClick={handleItemClick}
                  />
                  <MenuItem
                    icon="/chats/Scan.png"
                    label="Scan"
                    onClick={handleScanClick}
                  />
                  <MenuItem
                    icon="/chats/payment.png"
                    label="Payment"
                    onClick={handleItemClick}
                  />
                  <MenuItem
                    icon="/chats/Airdrop.png"
                    label="Airdrop"
                    onClick={handleItemClick}
                    noBorder
                  />

                  {/* Country Selector Item (At Bottom) */}
                  <div
                    className="flex items-center px-4 py-3 hover:bg-[#585858] cursor-pointer border-t border-[#585858] mt-1"
                    onClick={openCountryModal}
                  >
                    <div className="w-4 h-4 mr-3 flex-shrink-0 rounded-full overflow-hidden relative">
                      <Image
                        src="/top/usa.png"
                        alt="Country"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span>USA</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Country Selection Sheet Modal */}
      <CountrySelectionSheet
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        defaultCountry={selectedCountry}
        onSelect={(country) => setSelectedCountry(country)}
      />

      {/* Wallet QR Code Sheet */}
      <WalletQRCodeSheet
        isOpen={isQRCodeOpen}
        onClose={() => setIsQRCodeOpen(false)}
      />
    </>
  );
}

// --- Helper Components ---

function MenuItem({
  icon,
  label,
  onClick,
  noBorder
}: {
  icon: string;
  label: string;
  onClick: () => void;
  noBorder?: boolean;
}) {
  return (
    <div
      className="flex items-center px-4 py-2.5 hover:bg-[#585858] cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="w-4 h-4 mr-3 flex-shrink-0 flex items-center justify-center">
        <Image
          src={icon}
          alt={label}
          width={16}
          height={16}
          className="w-full h-full object-contain"
        />
      </div>
      <div
        className={`flex-1 text-left text-[13px] ${!noBorder ? 'border-b border-[#585858] pb-2' : ''}`}
      >
        {label}
      </div>
    </div>
  );
}
