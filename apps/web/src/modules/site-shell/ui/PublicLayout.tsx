import React from 'react';
import { PublicHeader } from './PublicHeader';
import type { PublicNavItem } from '../model/public-navigation';
import '../../../app/styles/site-shell.css';

export type PublicLayoutProps = {
  activePath: string;
  items: readonly PublicNavItem[];
  children: React.ReactNode;
};

export function PublicLayout({ activePath, items, children }: PublicLayoutProps) {
  return (
    <div className="site-shell-layout editorial-system" data-testid="public-site-shell">
      <PublicHeader activePath={activePath} items={items} />
      <div className="site-shell-layout__content">{children}</div>
    </div>
  );
}
