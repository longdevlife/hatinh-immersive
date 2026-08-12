import React, { useState } from 'react';
import '../../../app/styles/site-shell.css';
import type { PublicNavItem } from '../model/public-navigation';

export type PublicHeaderProps = { activePath: string; items: readonly PublicNavItem[] };

export function PublicHeader({ activePath, items }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeItem = items
    .filter((item) => activePath === item.href || activePath.startsWith(`${item.href}/`))
    .sort((left, right) => right.href.length - left.href.length)[0];

  return (
    <header className="site-shell-header">
      <div className="site-shell-header__container">
        <div className="site-shell-header__brand">
          <a href="/" aria-label="Hà Tĩnh - Trang chủ" className="site-shell-header__brand-link">
            <svg
              className="site-shell-header__logo-icon"
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="16" fill="#00884F" />
              <path
                d="M16 7C16 7 21.5 13 21.5 18C21.5 21 18.5 24 16 24C13.5 24 10.5 21 10.5 18C10.5 13 16 7 16 7Z"
                fill="white"
              />
              <path
                d="M11 17C11 17 8 13.5 6 13.5C4 13.5 4 16 6 18C8 20 11 17 11 17Z"
                fill="white"
              />
              <path
                d="M21 17C21 17 24 13.5 26 13.5C28 13.5 28 16 26 18C24 20 21 17 21 17Z"
                fill="white"
              />
              <circle cx="16" cy="14" r="2" fill="#00884F" />
            </svg>
            <div className="site-shell-header__brand-text">
              <span className="site-shell-header__brand-name">Hà Tĩnh</span>
              <span className="site-shell-header__brand-slogan">
                Một hành trình – Nhiều trải nghiệm
              </span>
            </div>
          </a>
        </div>

        <button
          className="site-shell-header__mobile-toggle"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {mobileMenuOpen ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>

        <nav
          className={`site-shell-header__nav ${mobileMenuOpen ? 'site-shell-header__nav--open' : ''}`}
          aria-label="Điều hướng chính"
        >
          <ul className="site-shell-header__nav-list">
            {items.map((item) => {
              const isActive = activeItem?.id === item.id;
              return (
                <li key={item.id} className="site-shell-header__nav-item">
                  <a
                    href={item.href}
                    className="site-shell-header__nav-link"
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
