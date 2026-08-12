export interface PublicNavItem {
  id: string;
  label: string;
  href: string;
}

export const PUBLIC_NAV_ITEMS = [
  { id: 'explore', label: 'Khám phá', href: '/explore' },
  { id: 'son-trang', label: 'Sơn Trang', href: '/explore/son-trang-co-dam' },
] as const satisfies readonly PublicNavItem[];
