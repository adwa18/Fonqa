// src/components/BackButton.jsx — (C) consistent back button
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useEffect } from 'react';

/**
 * Renders a back button in the page header AND registers
 * the Telegram native BackButton so hardware back works too.
 *
 * Usage:
 *   <BackButton to="/matches" label="Matches" />
 *   <BackButton />  // uses browser history
 */
export default function BackButton({ to, label }) {
  const navigate  = useNavigate();
  const { backButton } = useTelegram();

  const goBack = () => (to ? navigate(to) : navigate(-1));

  useEffect(() => {
    backButton.show(goBack);
    return () => backButton.hide();
  }, [to]);

  return (
    <button onClick={goBack}
      className="flex items-center gap-1 py-1 pr-2 text-sm font-medium transition-opacity active:opacity-60"
      style={{ color: 'var(--brand)' }}>
      <ChevronLeft size={20} />
      {label && <span>{label}</span>}
    </button>
  );
}
