// Email notification API endpoint
// This uses Supabase Edge Functions for sending emails

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, type, billData } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // For now, we'll log the email (you'll need to integrate with your email service)
    console.log('📧 Email notification triggered:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Type:', type);
    console.log('Bill Data:', billData);

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // Example with Resend:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Cashflo <notifications@your-domain.com>',
      to: [to],
      subject: subject,
      html: html,
    });
    */

    // For now, return success
    res.status(200).json({
      success: true,
      message: 'Email notification queued',
      debug: {
        to,
        subject,
        type,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Email API error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
}