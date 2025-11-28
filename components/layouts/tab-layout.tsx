'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface TabLayoutProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export const TabLayout: React.FC<TabLayoutProps> = ({
  tabs,
  defaultTab,
  onChange,
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs?.[0]?.id || '');
  
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };
  
  const activeTabContent = tabs?.find(tab => tab?.id === activeTab)?.content;
  
  return (
    <div className={cn('w-full', className)}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs?.map((tab) => (
            <button
              key={tab?.id}
              onClick={() => handleTabChange(tab?.id)}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab?.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab?.icon}
              {tab?.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {activeTabContent}
      </div>
    </div>
  );
};

TabLayout.displayName = 'TabLayout';
