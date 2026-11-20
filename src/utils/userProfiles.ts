import harutoAvatar from '../assets/images/haruto_avatar_1795158656673.jpg';
import sakuraAvatar from '../assets/images/sakura_avatar_1795158657393.jpg';
import type {UserId, UserProfile} from '../types/study';

const ACTIVE_USER_KEY = 'smart_study_active_user_v1';
const USER_PIN_PREFIX = 'smart_study_user_pin_v1_';

export const USER_PROFILES: UserProfile[] = [
  {
    id: 'haruto',
    name: 'Haruto',
    japaneseName: 'ハルト',
    genderLabel: 'Boy',
    roleSubtitle: 'SSW Logistics Warehousing Candidate',
    avatarUrl: harutoAvatar,
    accentGradient: 'from-blue-600 to-indigo-600',
    ringClass: 'ring-blue-500/30 border-blue-200/90',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    japaneseName: 'サクラ',
    genderLabel: 'Lady',
    roleSubtitle: 'SSW Logistics Warehousing Candidate',
    avatarUrl: sakuraAvatar,
    accentGradient: 'from-rose-500 to-pink-600',
    ringClass: 'ring-rose-500/30 border-rose-200/90',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
  },
];

export function getUserProfile(userId: UserId): UserProfile {
  return USER_PROFILES.find((u) => u.id === userId) ?? USER_PROFILES[0];
}

export function getStoredActiveUserId(): UserId | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    if (raw === 'haruto' || raw === 'sakura') {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredActiveUserId(userId: UserId | null): void {
  try {
    if (userId) {
      localStorage.setItem(ACTIVE_USER_KEY, userId);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getUserPin(userId: UserId): string | null {
  try {
    const pin = localStorage.getItem(`${USER_PIN_PREFIX}${userId}`);
    return pin && /^\d{4}$/.test(pin) ? pin : null;
  } catch {
    return null;
  }
}

export function setUserPin(userId: UserId, pin: string | null): void {
  try {
    if (pin && /^\d{4}$/.test(pin)) {
      localStorage.setItem(`${USER_PIN_PREFIX}${userId}`, pin);
    } else {
      localStorage.removeItem(`${USER_PIN_PREFIX}${userId}`);
    }
  } catch {
    // Ignore storage errors
  }
}
