/**
 * Password Generation and Validation Utility
 * Provides cryptographically secure password generation and validation
 * for admin functionality when adding new users.
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Character sets for password generation
 */
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL_CHARS = '!@#$%^&*()_+-=';

/**
 * Generates a cryptographically secure random password
 * @param length - Password length (minimum 12, defaults to 16)
 * @returns Generated password string
 */
export function generateSecurePassword(length?: number): string {
  // Default to 16 characters, minimum 12
  const passwordLength = Math.max(12, length ?? 16);

  // Ensure we have at least one of each required character type
  const requiredChars = [
    UPPERCASE[getSecureRandomIndex(UPPERCASE.length)],
    LOWERCASE[getSecureRandomIndex(LOWERCASE.length)],
    NUMBERS[getSecureRandomIndex(NUMBERS.length)],
    SPECIAL_CHARS[getSecureRandomIndex(SPECIAL_CHARS.length)],
  ];

  // Fill the remaining length with a mix of all character types
  const allChars = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL_CHARS;
  const remainingLength = passwordLength - requiredChars.length;

  const randomChars: string[] = [];
  for (let i = 0; i < remainingLength; i++) {
    randomChars.push(allChars[getSecureRandomIndex(allChars.length)]);
  }

  // Combine required and random characters
  const passwordChars = [...requiredChars, ...randomChars];

  // Shuffle the password to randomize the position of required characters
  return shuffleArray(passwordChars).join('');
}

/**
 * Gets a cryptographically secure random index
 * @param max - Maximum value (exclusive)
 * @returns Random index between 0 and max-1
 */
function getSecureRandomIndex(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Fisher-Yates shuffle algorithm using cryptographic randomness
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getSecureRandomIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Validates a password against security requirements
 * @param password - Password to validate
 * @returns Validation result with valid flag and error messages
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length (12 characters)
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  // Check for at least 1 uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }

  // Check for at least 1 lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter');
  }

  // Check for at least 1 number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }

  // Check for at least 1 special character
  if (!/[!@#$%^&*()_+=-]/.test(password)) {
    errors.push('Password must contain at least 1 special character (!@#$%^&*()_+=-)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}