// InvitePage.tsx
'use client'; // Required for using React Hooks (useState) in Next.js App Router

import React, { useState } from 'react';

// --- Icon Imports ---
// In a real project, you would install lucide-react: npm install lucide-react
const ArrowLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);
const Search = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

// --- Mock Data ---
// All contacts are invitable. Initial 'checked' status determines the default selected avatars.
const allContactsData = [
  {
    id: 'keyle',
    name: 'keyle',
    imageUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&q=80&fit=crop',
    status: 'checked'
  },
  {
    id: 'ktrt',
    name: 'ktrt',
    imageUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&q=80&fit=crop',
    status: 'checked'
  },
  {
    id: 'kelno',
    name: 'kelno',
    imageUrl:
      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&q=80&fit=crop',
    status: 'checked'
  },
  {
    id: 'ktty',
    name: 'ktty',
    imageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&q=80&fit=crop',
    status: 'checked'
  },
  {
    id: 'Linger',
    name: 'Linger',
    imageUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&q=80&fit=crop',
    status: 'available'
  },
  {
    id: 'Lom',
    name: 'Lom',
    imageUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&q=80&fit=crop',
    status: 'available'
  },
  {
    id: 'Musha',
    name: 'Musha',
    imageUrl:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&q=80&fit=crop',
    status: 'available'
  },
  {
    id: 'extra1',
    name: 'Extra 1',
    imageUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&q=80&fit=crop',
    status: 'available'
  },
  {
    id: 'extra2',
    name: 'Extra 2',
    imageUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&q=80&fit=crop',
    status: 'available'
  }
];

// --- Type Definitions ---
type ContactStatus = 'checked' | 'available';
type Contact = {
  id: string;
  name: string;
  imageUrl: string;
  status: ContactStatus;
};

// --- Main Component ---
export default function InvitePage() {
  const [contacts, setContacts] = useState<Contact[]>(allContactsData);
  const [includeHistory, setIncludeHistory] = useState(false);

  const handleContactToggle = (id: string) => {
    setContacts((prevContacts) =>
      prevContacts.map((contact) => {
        if (contact.id === id) {
          return {
            ...contact,
            status: contact.status === 'checked' ? 'available' : 'checked'
          };
        }
        return contact;
      })
    );
  };

  // MODIFIED: This list is now derived from the main contacts state.
  const selectedContacts = contacts.filter(
    (contact) => contact.status === 'checked'
  );
  const selectedCount = selectedContacts.length;

  return (
    <div
      className="bg-white text-black h-screen font-sans flex flex-col max-w-md mx-auto border"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-gray-200">
        <button className="text-sm px-3 py-1 border border-gray-300 rounded-full">
          BNB Chain
        </button>
        <button className="text-sm px-3 py-1 border border-gray-300 rounded-full">
          Connect wallet
        </button>
        <button className="text-sm px-3 py-1 border border-gray-300 rounded-full">
          🇺🇸 USA
        </button>
      </header>

      {/* Page Title */}
      <div className="flex-shrink-0 flex items-center p-4">
        <ArrowLeft />
        <h1 className="text-base font-semibold">成员邀请</h1>
      </div>

      {/* Search Bar */}
      <div className="flex-shrink-0 px-4 py-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="search"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* MODIFIED: Dynamic Selected Contacts Avatars */}
      <div className="flex-shrink-0 px-4 flex items-center h-[68px]">
        <div className="flex items-center gap-4 overflow-hidden flex-nowrap">
          {selectedContacts.map((contact) => (
            <img
              key={contact.id}
              src={contact.imageUrl}
              alt={contact.name}
              className="h-12 w-12 rounded-full flex-shrink-0 object-cover"
            />
          ))}
        </div>
      </div>

      {/* Contact List */}
      <main className="flex-grow overflow-y-auto px-4">
        <div className="flex flex-col">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center py-2 cursor-pointer"
              onClick={() => handleContactToggle(contact.id)}
            >
              <div className="w-8 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={contact.status === 'checked'}
                  onChange={() => handleContactToggle(contact.id)}
                  className="h-6 w-6 rounded-full appearance-none border-2 border-gray-300 checked:bg-indigo-600 checked:border-indigo-600 focus:outline-none"
                  style={{
                    backgroundImage:
                      contact.status === 'checked'
                        ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")`
                        : 'none'
                  }}
                />
              </div>
              <img
                src={contact.imageUrl}
                alt={contact.name}
                className="h-12 w-12 rounded-lg mx-3 object-cover"
              />
              <span className="font-medium text-base">{contact.name}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 p-4 border-t border-gray-200 mt-auto bg-white">
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHistory}
              onChange={(e) => setIncludeHistory(e.target.checked)}
              className="h-5 w-5 rounded-full appearance-none border-2 border-gray-300 checked:bg-indigo-600 checked:border-indigo-600"
            />
            <span className="text-gray-600">附带聊天记录</span>
          </label>
          <button
            className="bg-indigo-600 text-white rounded-full px-8 py-3 font-semibold disabled:bg-indigo-400 disabled:cursor-not-allowed"
            disabled={selectedCount === 0}
          >
            立即邀请({selectedCount})
          </button>
        </div>
      </footer>
    </div>
  );
}
