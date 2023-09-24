import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
	id: 'notify_on_event',
	name: 'Notify on event',
	icon: 'box',
	description: 'Sends out event emails. Must be paired with an event hook of type action.',
	overview: ({ to, events }) => [
		{
			label: 'To',
			text: Array.isArray(to) ? to.join(', ') : to,
		},
		{
			label: 'Events',
			text: Array.isArray(events) ? to.join(', ') : events,
		}
	],
	options: [
		{
			field: 'to',
			name: 'To',
			type: 'csv',
			meta: {
				width: 'full',
				interface: 'tags',
				options: {
					placeholder: '$t:operations.mail.to_placeholder',
					iconRight: 'alternate_email',
				},
			},
		},
		{
			field: 'events',
			name: 'Events',
			type: 'csv',
			meta: {
				width: 'full',
				interface: 'tags',
				options: {
					placeholder: 'Nach jedem Event mit ENTER bestätigen',
				},
			},
		},
	],
});
