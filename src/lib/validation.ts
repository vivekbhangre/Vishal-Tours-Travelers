export const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'icloud.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'example.com'];

export const validateEmail = (email: string, restrictDomains: boolean = true): string | null => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email format';
  
  if (restrictDomains) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
      return `Email must end with one of: ${ALLOWED_EMAIL_DOMAINS.map(d => '@' + d).join(', ')}`;
    }
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return 'Phone number is required';
  if (!/^\+?[\d\s-]{10,15}$/.test(phone)) {
    return 'Please enter a valid phone number (10-15 digits)';
  }
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name || name.trim().length < 2) {
    return 'Name must be at least 2 characters long';
  }
  if (!/^[a-zA-Z\s\.]+$/.test(name)) {
    return 'Name can only contain letters and spaces';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  return null;
};

export const validateVehicleNumber = (number: string): string | null => {
  if (!number || number.trim().length < 4) {
    return 'Vehicle number must be at least 4 characters';
  }
  if (!/^[A-Z0-9\s-]+$/i.test(number)) {
    return 'Vehicle number can only contain letters, numbers, spaces, and hyphens';
  }
  return null;
};
