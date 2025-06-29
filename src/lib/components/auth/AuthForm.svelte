<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	interface Props {
		mode: 'login' | 'register';
		loading?: boolean;
		error?: string | null;
		onSubmit: (data: unknown) => void;
	}

	let { mode, loading = false, error = null, onSubmit }: Props = $props();

	// Form state
	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let name = $state('');

	// Computed properties
	let isLogin = $derived(mode === 'login');
	let isRegister = $derived(mode === 'register');
	let title = $derived(isLogin ? 'Sign In' : 'Create Account');
	let submitText = $derived(isLogin ? 'Sign In' : 'Create Account');

	// Validation functions
	function validateEmail(email: string): string {
		if (!email) return 'Email is required';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return 'Please enter a valid email address';
		}
		return '';
	}

	function validatePassword(password: string): string {
		if (!password) return 'Password is required';
		if (password.length < 8) {
			return 'Password must be at least 8 characters';
		}
		return '';
	}

	function validatePasswordConfirm(password: string, confirm: string): string {
		if (isRegister && !confirm) return 'Please confirm your password';
		if (isRegister && password !== confirm) {
			return 'Passwords do not match';
		}
		return '';
	}

	function validateName(name: string): string {
		if (isRegister && !name) return 'Name is required';
		return '';
	}

	// Validation state - computed from reactive inputs
	let emailError = $derived(email ? validateEmail(email) : '');
	let passwordError = $derived(password ? validatePassword(password) : '');
	let passwordConfirmError = $derived(
		passwordConfirm ? validatePasswordConfirm(password, passwordConfirm) : ''
	);
	let nameError = $derived(name ? validateName(name) : '');

	// Form validation
	let isValid = $derived.by(() => {
		if (isLogin) {
			return email && password && !emailError && !passwordError;
		} else {
			return (
				email &&
				password &&
				passwordConfirm &&
				name &&
				!emailError &&
				!passwordError &&
				!passwordConfirmError &&
				!nameError
			);
		}
	});

	function handleSubmit(event: Event) {
		event.preventDefault();

		// Final validation
		const finalEmailError = validateEmail(email);
		const finalPasswordError = validatePassword(password);
		const finalPasswordConfirmError = validatePasswordConfirm(password, passwordConfirm);
		const finalNameError = validateName(name);

		emailError = finalEmailError;
		passwordError = finalPasswordError;
		passwordConfirmError = finalPasswordConfirmError;
		nameError = finalNameError;

		if (finalEmailError || finalPasswordError || finalPasswordConfirmError || finalNameError) {
			return;
		}

		// Prepare form data
		const formData = {
			email,
			password,
			...(isRegister && {
				passwordConfirm,
				name,
				role: 'musician' // Default role
			})
		};

		onSubmit(formData);
	}

	function clearForm() {
		email = '';
		password = '';
		passwordConfirm = '';
		name = '';
		emailError = '';
		passwordError = '';
		passwordConfirmError = '';
		nameError = '';
	}

	// Clear form when mode changes
	$effect(() => {
		clearForm();
	});
</script>

<Card class="mx-auto w-full max-w-md">
	<div class="mb-6 text-center">
		<h1 class="font-title text-2xl font-bold text-gray-900">{title}</h1>
		<p class="mt-2 text-sm text-gray-600">
			{#if isLogin}
				Welcome back to WorshipWise
			{:else}
				Join WorshipWise to get started
			{/if}
		</p>
	</div>

	<form onsubmit={handleSubmit} class="space-y-4">
		{#if error}
			<div class="rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm text-red-800" role="alert">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if isRegister}
			<Input
				label="Full Name"
				name="name"
				bind:value={name}
				placeholder="Enter your full name"
				required
				error={nameError}
				autocomplete="name"
				data-testid="name-input"
			/>
		{/if}

		<Input
			label="Email"
			name="email"
			type="email"
			bind:value={email}
			placeholder="Enter your email"
			required
			error={emailError}
			autocomplete="email"
			data-testid="email-input"
		/>

		<Input
			label="Password"
			name="password"
			type="password"
			bind:value={password}
			placeholder="Enter your password"
			required
			error={passwordError}
			autocomplete={isLogin ? 'current-password' : 'new-password'}
			data-testid="password-input"
		/>

		{#if isRegister}
			<Input
				label="Confirm Password"
				name="passwordConfirm"
				type="password"
				bind:value={passwordConfirm}
				placeholder="Confirm your password"
				required
				error={passwordConfirmError}
				autocomplete="new-password"
				data-testid="password-confirm-input"
			/>
		{/if}

		<Button
			type="submit"
			variant="primary"
			size="lg"
			fullWidth
			{loading}
			disabled={!isValid || loading}
		>
			{loading ? 'Please wait...' : submitText}
		</Button>
	</form>

	{#if isLogin}
		<div class="mt-4 text-center">
			<a href="/reset-password" class="text-primary hover:text-primary/90 text-sm">
				Forgot your password?
			</a>
		</div>
	{/if}

	<div class="mt-6 text-center">
		<p class="text-sm text-gray-600">
			{#if isLogin}
				Don't have an account?
				<a href="/register" class="text-primary hover:text-primary/90 font-medium"> Sign up </a>
			{:else}
				Already have an account?
				<a href="/login" class="text-primary hover:text-primary/90 font-medium"> Sign in </a>
			{/if}
		</p>
	</div>
</Card>
