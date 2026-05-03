// backend/services/emailService.js
// Handles all email sending via Gmail SMTP

const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // your Gmail address
    pass: process.env.EMAIL_PASS,   // Gmail App Password (not your real password)
  },
});

/**
 * Send a price drop alert email
 * @param {string} toEmail    - recipient email
 * @param {string} userName   - recipient name
 * @param {object} product    - { name, image, currentPrice }
 * @param {number} targetPrice - user's target price
 */
const sendPriceDropAlert = async (toEmail, userName, product, targetPrice) => {
  try {
    const mailOptions = {
      from: `"BuyEasy Alerts" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `🎉 Price Drop Alert: ${product.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="background: #1D9E75; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Price Drop Alert!</h1>
          <p style="color: #E1F5EE; margin: 8px 0 0;">Your cart item just hit your target price</p>
        </div>

        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          
          <p style="color: #333; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
          <p style="color: #555;">Great news! A product in your BuyEasy cart has dropped to your target price.</p>

          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 20px 0;">
            ${product.image ? `<img src="${product.image}" alt="${product.name}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 6px; float: left; margin-right: 16px;"/>` : ''}
            <div style="overflow: hidden;">
              <h3 style="margin: 0 0 8px; color: #333; font-size: 16px;">${product.name}</h3>
              <p style="margin: 4px 0; color: #888; font-size: 14px;">Your target: 
                <span style="text-decoration: line-through;">$${targetPrice}</span>
              </p>
              <p style="margin: 4px 0; font-size: 20px; font-weight: bold; color: #1D9E75;">
                Now: $${product.currentPrice}
              </p>
              <p style="margin: 4px 0; color: #D85A30; font-size: 13px; font-weight: 600;">
                You save $${(targetPrice - product.currentPrice).toFixed(2)}!
              </p>
            </div>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/cart" 
               style="background: #1D9E75; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px;">
              View My Cart →
            </a>
          </div>

          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
            You received this because you set a price alert on BuyEasy.<br/>
            © 2026 BuyEasy
          </p>
        </div>
      </div>
    `,
  };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Price alert email sent to ${toEmail} for product: ${product.name} | Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Email sending failed for ${toEmail}:`);
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    throw error;
  }
};

module.exports = { sendPriceDropAlert };
