export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 30) return false;
  return /^[a-zA-Z0-9_-]+$/.test(username);
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 6) return false;
  return true;
}

export function validateTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  return title.length > 0 && title.length <= 500;
}

export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateContentType(type: string): boolean {
  const validTypes = ['LINK', 'DOCUMENT', 'IMAGE', 'VOICE_NOTE', 'VIDEO_LINK', 'SOCIAL_POST', 'CODE_SNIPPET', 'RICH_NOTE'];
  return validTypes.includes(type);
}
