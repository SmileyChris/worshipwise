/// <reference path="../pb_data/types.d.ts" />

/**
 * Send email notifications when church invitations are created
 */
onRecordCreateRequest(function (e) {
	// Continue with the record creation
	e.next();

	// After record is created, send the invitation email
	const invitation = e.record;
	const churchId = invitation.get('church_id');
	const invitedByUserId = invitation.get('invited_by');
	const token = invitation.get('token');
	const email = invitation.get('email');
	const role = invitation.get('role');
	const expiresAt = invitation.get('expires_at');

	try {
		// Fetch the church details
		const church = e.app.findRecordById('churches', churchId);
		const invitedBy = e.app.findRecordById('users', invitedByUserId);

		// Calculate days until expiration
		const expirationDate = new Date(expiresAt);
		const daysUntilExpiration = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));

		// Construct the invitation URL
		const baseUrl = e.app.settings().meta.appUrl || 'http://localhost:5173';
		const inviteUrl = `${baseUrl}/invites/${token}`;

		// Role display names
		const roleDisplayNames = {
			musician: 'Musician',
			leader: 'Worship Leader',
			admin: 'Administrator'
		};

		// Create the email HTML
		const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Church Invitation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: #4f46e5; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        .button:hover { background: #4338ca; }
        .button.secondary { background: #6b7280; }
        .button.secondary:hover { background: #4b5563; }
        .role-badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 12px; font-size: 14px; font-weight: 500; }
        .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 13px; color: #6b7280; }
        .church-info { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .expiry-notice { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You're Invited to Join ${church.get('name')}!</h1>
        </div>
        
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 20px;">Hello!</p>
            
            <p><strong>${invitedBy.get('name') || invitedBy.get('email')}</strong> has invited you to join <strong>${church.get('name')}</strong> as a <span class="role-badge">${roleDisplayNames[role] || role}</span>.</p>
            
            <div class="church-info">
                <h3 style="margin-top: 0;">About ${church.get('name')}</h3>
                ${church.get('description') ? `<p>${church.get('description')}</p>` : ''}
                ${church.get('city') ? `<p><strong>Location:</strong> ${church.get('city')}${church.get('state') ? ', ' + church.get('state') : ''}</p>` : ''}
            </div>
            
            <p>As a ${roleDisplayNames[role] || role}, you'll be able to:</p>
            <ul>
                ${
									role === 'musician'
										? `
                    <li>View and access song library</li>
                    <li>See upcoming services and setlists</li>
                    <li>Access chord charts and resources</li>
                `
										: ''
								}
                ${
									role === 'leader'
										? `
                    <li>Create and manage worship services</li>
                    <li>Add and edit songs in the library</li>
                    <li>Build setlists and manage teams</li>
                    <li>View analytics and insights</li>
                `
										: ''
								}
                ${
									role === 'admin'
										? `
                    <li>Full access to all church features</li>
                    <li>Manage users and permissions</li>
                    <li>Configure church settings</li>
                    <li>Access all administrative tools</li>
                `
										: ''
								}
            </ul>
            
            <div class="expiry-notice">
                ⏰ This invitation will expire in <strong>${daysUntilExpiration} days</strong>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
                <br>
                <a href="${inviteUrl}?action=decline" class="button secondary">Decline</a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
                If you already have a WorshipWise account, you can log in with your existing credentials. 
                If you're new, you'll be able to create an account during the acceptance process.
            </p>
        </div>
        
        <div class="footer">
            <p>This invitation was sent to ${email} by WorshipWise on behalf of ${church.get('name')}.</p>
            <p>If you believe this was sent in error, you can safely ignore this email.</p>
            <p style="margin-top: 20px;">
                <a href="${inviteUrl}?action=decline" style="color: #6b7280; text-decoration: underline;">Decline invitation</a>
            </p>
        </div>
    </div>
</body>
</html>
        `;

		// Create plain text version
		const emailText = `
You're Invited to Join ${church.get('name')}!

Hello!

${invitedBy.get('name') || invitedBy.get('email')} has invited you to join ${church.get('name')} as a ${roleDisplayNames[role] || role}.

${church.get('description') ? '\nAbout ' + church.get('name') + ':\n' + church.get('description') + '\n' : ''}

To accept this invitation, visit:
${inviteUrl}

To decline, visit:
${inviteUrl}?action=decline

This invitation will expire in ${daysUntilExpiration} days.

If you already have a WorshipWise account, you can log in with your existing credentials. If you're new, you'll be able to create an account during the acceptance process.

This invitation was sent to ${email} by WorshipWise on behalf of ${church.get('name')}.
        `;

		// Send the email
		const message = new MailerMessage({
			from: {
				address: e.app.settings().meta.senderAddress,
				name: e.app.settings().meta.senderName || 'WorshipWise'
			},
			to: [{ address: email }],
			subject: `Invitation to join ${church.get('name')} on WorshipWise`,
			html: emailHtml,
			text: emailText
		});

		e.app.newMailClient().send(message);

		console.log(`Invitation email sent to ${email} for church ${church.get('name')}`);
	} catch (error) {
		console.error('Failed to send invitation email:', error);
		// Don't throw - we don't want to fail the invitation creation if email fails
		// The invitation can still be accessed via the UI
	}
}, 'church_invitations');

/**
 * Send email notification when an invitation is accepted
 */
onRecordUpdateRequest(function (e) {
	const oldRecord = e.record.originalCopy();
	const newRecord = e.record;

	// Check if the invitation was just accepted
	if (!oldRecord.get('used_at') && newRecord.get('used_at')) {
		e.next();

		try {
			const churchId = newRecord.get('church_id');
			const invitedByUserId = newRecord.get('invited_by');
			const usedByUserId = newRecord.get('used_by');
			const role = newRecord.get('role');

			// Fetch related records
			const church = e.app.findRecordById('churches', churchId);
			const invitedBy = e.app.findRecordById('users', invitedByUserId);
			const acceptedBy = e.app.findRecordById('users', usedByUserId);

			// Role display names
			const roleDisplayNames = {
				musician: 'Musician',
				leader: 'Worship Leader',
				admin: 'Administrator'
			};

			// Send notification to the inviter
			const message = new MailerMessage({
				from: {
					address: e.app.settings().meta.senderAddress,
					name: e.app.settings().meta.senderName || 'WorshipWise'
				},
				to: [{ address: invitedBy.get('email') }],
				subject: `${acceptedBy.get('name') || acceptedBy.get('email')} accepted your invitation`,
				html: `
                    <p>Good news!</p>
                    <p><strong>${acceptedBy.get('name') || acceptedBy.get('email')}</strong> has accepted your invitation to join <strong>${church.get('name')}</strong> as a ${roleDisplayNames[role] || role}.</p>
                    <p>They now have access to the church and can start collaborating with your worship team.</p>
                `,
				text: `Good news! ${acceptedBy.get('name') || acceptedBy.get('email')} has accepted your invitation to join ${church.get('name')} as a ${roleDisplayNames[role] || role}.`
			});

			e.app.newMailClient().send(message);
		} catch (error) {
			console.error('Failed to send acceptance notification:', error);
		}
	} else {
		e.next();
	}
}, 'church_invitations');
