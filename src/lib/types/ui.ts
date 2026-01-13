/**
 * UI Component Type Definitions
 *
 * This file contains type definitions for UI component props
 * to ensure consistency across the application.
 */

// ============================================================================
// Badge Component Types
// ============================================================================

/**
 * Badge visual variants
 */
export type BadgeVariant =
	| 'default'
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'danger';

/**
 * Badge color options (alternative to variant)
 */
export type BadgeColor = 'default' | 'red' | 'yellow' | 'blue' | 'green' | 'purple' | 'gray';

/**
 * Badge size options
 */
export type BadgeSize = 'sm' | 'md';

// ============================================================================
// Button Component Types
// ============================================================================

/**
 * Button visual variants
 */
export type ButtonVariant =
	| 'primary'
	| 'secondary'
	| 'danger'
	| 'ghost'
	| 'outline'
	| 'success';

/**
 * Button size options
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button HTML type attribute
 */
export type ButtonType = 'button' | 'submit' | 'reset';

/**
 * Button icon position
 */
export type ButtonIconPosition = 'left' | 'right';

/**
 * Button content alignment
 */
export type ButtonAlign = 'left' | 'center' | 'right';

// ============================================================================
// Input Component Types
// ============================================================================

/**
 * Input field types
 */
export type InputType =
	| 'text'
	| 'email'
	| 'password'
	| 'number'
	| 'tel'
	| 'url'
	| 'search'
	| 'date'
	| 'time'
	| 'datetime-local';

// ============================================================================
// Modal Component Types
// ============================================================================

/**
 * Modal size options
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// ============================================================================
// Alert/Toast Component Types
// ============================================================================

/**
 * Alert/toast severity levels
 */
export type AlertSeverity = 'success' | 'error' | 'warning' | 'info';

// ============================================================================
// Type Guards
// ============================================================================

export function isBadgeVariant(value: string): value is BadgeVariant {
	return ['default', 'primary', 'secondary', 'success', 'warning', 'danger'].includes(value);
}

export function isBadgeColor(value: string): value is BadgeColor {
	return ['default', 'red', 'yellow', 'blue', 'green', 'purple', 'gray'].includes(value);
}

export function isBadgeSize(value: string): value is BadgeSize {
	return ['sm', 'md'].includes(value);
}

export function isButtonVariant(value: string): value is ButtonVariant {
	return ['primary', 'secondary', 'danger', 'ghost', 'outline', 'success'].includes(value);
}

export function isButtonSize(value: string): value is ButtonSize {
	return ['sm', 'md', 'lg'].includes(value);
}

export function isButtonType(value: string): value is ButtonType {
	return ['button', 'submit', 'reset'].includes(value);
}

export function isModalSize(value: string): value is ModalSize {
	return ['sm', 'md', 'lg', 'xl', 'full'].includes(value);
}

export function isAlertSeverity(value: string): value is AlertSeverity {
	return ['success', 'error', 'warning', 'info'].includes(value);
}

// ============================================================================
// Constants
// ============================================================================

export const BADGE_VARIANTS: Record<string, BadgeVariant> = {
	DEFAULT: 'default',
	PRIMARY: 'primary',
	SECONDARY: 'secondary',
	SUCCESS: 'success',
	WARNING: 'warning',
	DANGER: 'danger'
} as const;

export const BUTTON_VARIANTS: Record<string, ButtonVariant> = {
	PRIMARY: 'primary',
	SECONDARY: 'secondary',
	DANGER: 'danger',
	GHOST: 'ghost',
	OUTLINE: 'outline',
	SUCCESS: 'success'
} as const;

export const BUTTON_SIZES: Record<string, ButtonSize> = {
	SM: 'sm',
	MD: 'md',
	LG: 'lg'
} as const;

export const MODAL_SIZES: Record<string, ModalSize> = {
	SM: 'sm',
	MD: 'md',
	LG: 'lg',
	XL: 'xl',
	FULL: 'full'
} as const;

export const ALERT_SEVERITIES: Record<string, AlertSeverity> = {
	SUCCESS: 'success',
	ERROR: 'error',
	WARNING: 'warning',
	INFO: 'info'
} as const;
