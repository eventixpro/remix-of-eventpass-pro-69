import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, ticketCode, eventTitle, eventDate, venue, ticketId, attendeeName } = req.body;

  if (!email || !ticketCode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'EventTix <onboarding@resend.dev>', // Use default Resend sender for testing
      to: [email],
      subject: `Your Ticket for ${eventTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4f46e5;">Your Ticket is Ready! 🎟️</h1>
          <p>Hi ${attendeeName},</p>
          <p>Here is your ticket for <strong>${eventTitle}</strong>.</p>
          
          <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0; background-color: #f9fafb;">
            <p><strong>Event:</strong> ${eventTitle}</p>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Venue:</strong> ${venue}</p>
            <div style="background-color: #fff; padding: 15px; border: 2px dashed #4f46e5; text-align: center; margin-top: 15px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Ticket Code</p>
              <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #111;">${ticketCode}</p>
              ${req.body.paymentRefId ? `<p style="margin: 10px 0 0; font-size: 11px; color: #9ca3af;">Ref: ${req.body.paymentRefId}</p>` : ''}
            </div>
          </div>

          <p>Please present this email or the ticket code at the entrance.</p>
          <p>
            <a href="https://eent-tix.vercel.app/ticket/${ticketId}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Full Ticket</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 12px; color: #6b7280;">Powered by EventTix</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Email sent successfully', data });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
