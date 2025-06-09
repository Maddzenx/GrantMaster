import Link from 'next/link';
import { useRouter } from 'next/router';

const navItems = [
  { href: '/vinnova', label: 'Utlysningar' },
  { href: '/ansokningar', label: 'Ansökningar' },
  { href: '/finansieradeaktiviteter', label: 'Finansierade Aktiviteter' },
];

export default function VinnovaNav() {
  const router = useRouter();
  return (
    <nav style={{ marginBottom: 32, textAlign: 'center' }}>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} legacyBehavior>
          <a
            style={{
              margin: '0 1rem',
              textDecoration: router.pathname === item.href ? 'underline' : 'none',
              fontWeight: router.pathname === item.href ? 'bold' : 'normal',
              color: router.pathname === item.href ? '#0070f3' : '#222',
            }}
          >
            {item.label}
          </a>
        </Link>
      ))}
    </nav>
  );
} 