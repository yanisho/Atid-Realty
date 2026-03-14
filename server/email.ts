// Email service using Resend integration
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

function getSafeFromEmail(configuredEmail: string | undefined): string {
  return 'ATID Property Management <info@atidrealty.com>';
}

interface SendLeaseEmailParams {
  recipientEmail: string;
  recipientName: string;
  propertyName: string;
  propertyAddress: string;
  tenantName: string;
  unitNumber?: string;
  leaseType: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount?: string;
  status: string;
  signingUrl?: string;
}

export async function sendLeaseEmail(params: SendLeaseEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();

    const leaseTypeLabel = params.leaseType === "m2m" ? "Month-to-Month" : "Annual";
    const unitLine = params.unitNumber ? `<tr><td style="padding: 8px 12px; color: #666;">Unit</td><td style="padding: 8px 12px; font-weight: 600;">${params.unitNumber}</td></tr>` : "";

    const senderEmail = getSafeFromEmail(fromEmail);

    const result = await client.emails.send({
      from: senderEmail,
      to: params.recipientEmail,
      subject: params.signingUrl ? `Action Required: Sign Your Lease - ${params.propertyName}` : `Lease Details - ${params.propertyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ATID Property Management</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 14px;">Lease Information</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e3a5f; margin-top: 0;">Hello, ${params.recipientName}</h2>
            
            <p>Here are the lease details for your records:</p>
            
            <div style="background: #f8f9fa; border-radius: 8px; overflow: hidden; margin: 20px 0;">
              <div style="background: #1e3a5f; padding: 12px 16px;">
                <h3 style="color: white; margin: 0; font-size: 16px;">${params.propertyName}</h3>
                <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">${params.propertyAddress}</p>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Tenant</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${params.tenantName}</td>
                </tr>
                ${unitLine}
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Lease Type</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${leaseTypeLabel}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Start Date</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${params.startDate}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">End Date</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${params.endDate}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Monthly Rent</td>
                  <td style="padding: 8px 12px; font-weight: 600; color: #1e3a5f;">$${params.rentAmount}</td>
                </tr>
                ${params.depositAmount ? `<tr style="border-bottom: 1px solid #e5e5e5;"><td style="padding: 8px 12px; color: #666;">Security Deposit</td><td style="padding: 8px 12px; font-weight: 600;">$${params.depositAmount}</td></tr>` : ""}
                <tr>
                  <td style="padding: 8px 12px; color: #666;">Status</td>
                  <td style="padding: 8px 12px; font-weight: 600; text-transform: capitalize;">${params.status}</td>
                </tr>
              </table>
            </div>
            
            ${params.signingUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #333; font-size: 15px; margin-bottom: 16px;">Please review your lease agreement and sign it digitally by clicking the button below:</p>
              <a href="${params.signingUrl}" style="display: inline-block; background: #1e3a5f; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">Review &amp; Sign Lease</a>
              <p style="color: #888; font-size: 12px; margin-top: 12px;">Or copy and paste this link into your browser:<br><a href="${params.signingUrl}" style="color: #2d5a87; word-break: break-all;">${params.signingUrl}</a></p>
            </div>
            ` : ''}
            
            <p style="color: #666; font-size: 14px;">If you have any questions about your lease, please don't hesitate to contact your property manager.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              This email was sent by ATID Property Management.<br>
              If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (result.error) {
      console.error('Resend email error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send lease email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface TenantInviteEmailParams {
  tenantEmail: string;
  tenantName: string;
  propertyAddress: string;
  inviteLink: string;
}

export async function sendTenantInviteEmail(params: TenantInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const senderEmail = getSafeFromEmail(fromEmail);

    const result = await client.emails.send({
      from: senderEmail,
      to: params.tenantEmail,
      subject: 'Welcome to ATID Property Management - Set Up Your Tenant Portal',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ATID Property Management</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e3a5f; margin-top: 0;">Welcome, ${params.tenantName}!</h2>
            
            <p>You've been added as a tenant at:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <strong style="color: #1e3a5f;">${params.propertyAddress}</strong>
            </div>
            
            <p>Click the button below to set up your tenant portal account. Once activated, you'll be able to:</p>
            
            <ul style="color: #666;">
              <li>Pay rent online</li>
              <li>Submit maintenance requests</li>
              <li>View your lease details</li>
              <li>Access important documents</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.inviteLink}" style="background: #1e3a5f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Set Up Your Account</a>
            </div>
            
            <p style="color: #888; font-size: 14px;">This invitation link will expire in 7 days. If you have any questions, please contact your property manager.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              This email was sent by ATID Property Management.<br>
              If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (result.error) {
      console.error('Resend email error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send tenant invite email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface MaintenanceNotificationParams {
  ticketNumber: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  propertyAddress: string;
  unitLabel?: string;
  category: string;
  description: string;
  entryPermission: boolean;
  hasPets: boolean;
  photoCount?: number;
}

export async function sendMaintenanceNotificationEmail(params: MaintenanceNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getResendClient();
    const senderEmail = getSafeFromEmail(fromEmail);

    const unitLine = params.unitLabel ? `<tr><td style="padding: 8px 12px; color: #666;">Unit</td><td style="padding: 8px 12px; font-weight: 600;">${params.unitLabel}</td></tr>` : "";
    const categoryLabel = params.category.charAt(0).toUpperCase() + params.category.slice(1);

    const photoSection = params.photoCount && params.photoCount > 0 ? `
      <div style="margin: 20px 0; padding: 12px 16px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px;">
        <p style="margin: 0; color: #856404; font-weight: 600;">${params.photoCount} photo(s) attached</p>
        <p style="margin: 4px 0 0; color: #856404; font-size: 13px;">View photos in the Admin Portal under Maintenance Requests.</p>
      </div>
    ` : "";

    const result = await client.emails.send({
      from: senderEmail,
      to: 'repairs@atidrealty.com',
      subject: `New Maintenance Request - Ticket #${params.ticketNumber} - ${categoryLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ATID Property Management</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 14px;">New Maintenance Request</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e3a5f; margin-top: 0;">Ticket #${params.ticketNumber}</h2>
            
            <div style="background: #f8f9fa; border-radius: 8px; overflow: hidden; margin: 20px 0;">
              <div style="background: #1e3a5f; padding: 12px 16px;">
                <h3 style="color: white; margin: 0; font-size: 16px;">Tenant & Property Details</h3>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Tenant Name</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${params.tenantName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Phone</td>
                  <td style="padding: 8px 12px; font-weight: 600;"><a href="tel:${params.tenantPhone}" style="color: #2d5a87; text-decoration: none;">${params.tenantPhone}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Email</td>
                  <td style="padding: 8px 12px; font-weight: 600;"><a href="mailto:${params.tenantEmail}" style="color: #2d5a87; text-decoration: none;">${params.tenantEmail}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Property Address</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${params.propertyAddress}</td>
                </tr>
                ${unitLine}
              </table>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; overflow: hidden; margin: 20px 0;">
              <div style="background: #d97706; padding: 12px 16px;">
                <h3 style="color: white; margin: 0; font-size: 16px;">Issue Details</h3>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Category</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${categoryLabel}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <td style="padding: 8px 12px; color: #666;">Entry Permission</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${params.entryPermission ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; color: #666;">Pets on Premises</td>
                  <td style="padding: 8px 12px; font-weight: 600;">${params.hasPets ? "Yes" : "No"}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #1e3a5f; font-size: 16px; margin-bottom: 10px;">Description</h3>
              <div style="background: #fff8e1; padding: 15px; border-radius: 6px; border-left: 4px solid #d97706;">
                <p style="margin: 0; white-space: pre-wrap;">${params.description}</p>
              </div>
            </div>
            
            ${photoSection}
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center;">
              This notification was sent automatically by ATID Property Management.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (result.error) {
      console.error('Resend maintenance notification error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send maintenance notification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
