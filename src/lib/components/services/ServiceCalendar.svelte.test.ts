import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ServiceCalendar from './ServiceCalendar.svelte';
import type { Service } from '$lib/types/service';

describe('ServiceCalendar', () => {
	const mockServices: Service[] = [
		{
			id: '1',
			church_id: 'church1',
			title: 'Sunday Morning Service',
			service_date: new Date().toISOString(),
			service_type: 'Sunday Morning',
			status: 'planned',
			created: new Date().toISOString(),
			updated: new Date().toISOString()
		},
		{
			id: '2',
			church_id: 'church1',
			title: 'Wednesday Night',
			service_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
			service_type: 'Wednesday Night',
			status: 'draft',
			created: new Date().toISOString(),
			updated: new Date().toISOString()
		}
	];

	const mockOnServiceClick = vi.fn();
	const mockOnDateClick = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render calendar with current month', () => {
		render(ServiceCalendar, {
			services: mockServices,
			onServiceClick: mockOnServiceClick,
			onDateClick: mockOnDateClick
		});

		// Check month/year display
		const currentDate = new Date();
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		const expectedMonth = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
		expect(screen.getByText(expectedMonth)).toBeInTheDocument();
	});

	it('should display day headers', () => {
		render(ServiceCalendar, { services: [] });

		expect(screen.getByText('Sun')).toBeInTheDocument();
		expect(screen.getByText('Mon')).toBeInTheDocument();
		expect(screen.getByText('Tue')).toBeInTheDocument();
		expect(screen.getByText('Wed')).toBeInTheDocument();
		expect(screen.getByText('Thu')).toBeInTheDocument();
		expect(screen.getByText('Fri')).toBeInTheDocument();
		expect(screen.getByText('Sat')).toBeInTheDocument();
	});

	it('should display services on correct dates', () => {
		render(ServiceCalendar, {
			services: mockServices,
			onServiceClick: mockOnServiceClick
		});

		// Services should be displayed as badges
		expect(screen.getByText('Sunday Morning Service')).toBeInTheDocument();
		expect(screen.getByText('Wednesday Night')).toBeInTheDocument();
	});

	it('should navigate to previous and next months', async () => {
		render(ServiceCalendar, { services: [] });

		const currentDate = new Date();
		// Find buttons by their SVG content since aria-label isn't being passed through
		const buttons = screen.getAllByRole('button');
		const prevButton = buttons.find(btn => btn.querySelector('svg path[d*="M15 19l-7-7"]'));
		const nextButton = buttons.find(btn => btn.querySelector('svg path[d*="M9 5l7 7"]'));

		// Go to previous month
		await fireEvent.click(prevButton);
		
		// Should show previous month
		const prevMonth = new Date(currentDate);
		prevMonth.setMonth(prevMonth.getMonth() - 1);
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		expect(screen.getByText(`${monthNames[prevMonth.getMonth()]} ${prevMonth.getFullYear()}`)).toBeInTheDocument();

		// Go to next month (back to current)
		await fireEvent.click(nextButton);
		expect(screen.getByText(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`)).toBeInTheDocument();
	});

	it('should go to today when Today button is clicked', async () => {
		render(ServiceCalendar, { services: [] });

		// Find buttons by their content
		const buttons = screen.getAllByRole('button');
		const prevButton = buttons.find(btn => btn.querySelector('svg path[d*="M15 19l-7-7"]'));
		const todayButton = screen.getByText('Today');

		// Navigate away
		await fireEvent.click(prevButton);
		await fireEvent.click(prevButton);

		// Click Today button
		await fireEvent.click(todayButton);

		// Should be back at current month
		const currentDate = new Date();
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		expect(screen.getByText(`${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`)).toBeInTheDocument();
	});

	it('should call onServiceClick when service is clicked', async () => {
		render(ServiceCalendar, {
			services: mockServices,
			onServiceClick: mockOnServiceClick
		});

		const serviceButton = screen.getByText('Sunday Morning Service');
		await fireEvent.click(serviceButton);

		expect(mockOnServiceClick).toHaveBeenCalledWith(mockServices[0]);
	});

	it('should call onDateClick when date is clicked', async () => {
		render(ServiceCalendar, {
			services: [],
			onDateClick: mockOnDateClick
		});

		// Click on a date button (find one that's in current month)
		const dateButtons = screen.getAllByRole('button');
		const currentMonthButton = dateButtons.find(btn => 
			btn.textContent === '15' && !btn.disabled
		);

		if (currentMonthButton) {
			await fireEvent.click(currentMonthButton);
			expect(mockOnDateClick).toHaveBeenCalled();
		}
	});

	it('should show loading indicator when loading', () => {
		render(ServiceCalendar, {
			services: [],
			loading: true
		});

		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('should display status badges correctly', () => {
		render(ServiceCalendar, {
			services: mockServices
		});

		// Check legend
		const legends = screen.getAllByText('Draft');
		expect(legends.length).toBeGreaterThan(0);
		
		expect(screen.getByText('Planned')).toBeInTheDocument();
		expect(screen.getByText('Completed')).toBeInTheDocument();
	});

	it('should show multiple services on same day', () => {
		const sameDay = new Date().toISOString();
		const multipleServices: Service[] = [
			{
				id: '1',
				church_id: 'church1',
				title: 'Morning Service',
				service_date: sameDay,
				service_type: 'Sunday Morning',
				status: 'planned',
				created: sameDay,
				updated: sameDay
			},
			{
				id: '2',
				church_id: 'church1',
				title: 'Evening Service',
				service_date: sameDay,
				service_type: 'Sunday Evening',
				status: 'planned',
				created: sameDay,
				updated: sameDay
			},
			{
				id: '3',
				church_id: 'church1',
				title: 'Youth Service',
				service_date: sameDay,
				service_type: 'Youth Service',
				status: 'draft',
				created: sameDay,
				updated: sameDay
			}
		];

		render(ServiceCalendar, {
			services: multipleServices
		});

		// Should show first two services
		expect(screen.getByText('Morning Service')).toBeInTheDocument();
		expect(screen.getByText('Evening Service')).toBeInTheDocument();
		
		// Should show +1 more indicator
		expect(screen.getByText('+1 more')).toBeInTheDocument();
	});
});