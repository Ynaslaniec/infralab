import React from 'react';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  children: React.ReactNode;
}

const statusStyles = {
  success: 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20',
  warning: 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20',
  error: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
  info: 'bg-[#0284C7]/10 text-[#0284C7] border-[#0284C7]/20',
  pending: 'bg-muted text-muted-foreground border-border',
};

export function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      {children}
    </span>
  );
}
