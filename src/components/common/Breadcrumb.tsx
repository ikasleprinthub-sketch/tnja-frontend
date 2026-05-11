"use client";

import React from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = "" }) => {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2 text-[13px] font-medium text-gray-500">
        {items.map((item, index) => (
          <li key={index} className="flex items-center space-x-2">
            {index > 0 && (
              <span className="text-gray-400 text-[10px]">&gt;</span>
            )}
            {item.href ? (
              <Link 
                href={item.href} 
                className="hover:text-[#FF7400] transition-colors uppercase tracking-wider whitespace-nowrap"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[#FF7400] uppercase tracking-wider whitespace-nowrap">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
