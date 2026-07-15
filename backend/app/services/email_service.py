"""
Email notification service using smtplib (no external dependency).
Reads SMTP config from environment variables with sensible defaults.

To enable: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in .env
Gmail example:
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your@gmail.com
  SMTP_PASSWORD=your-app-password
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_irrigation_alert(
    to_email: str,
    to_name: str,
    crop: str,
    field_name: str,
    farm_name: str,
    window_start: str,
    window_end: str,
    reason: str,
    temperature_c: float,
    location: str,
    upcoming_events: Optional[list] = None,
) -> bool:
    """
    Send a daily irrigation reminder email.
    Returns True on success, False if SMTP is not configured or fails.
    """
    settings = get_settings()

    if not settings.smtp_host or not settings.smtp_user:
        logger.info("SMTP not configured — skipping email to %s", to_email)
        return False

    subject = f"🌱 AgriMind: Water your {crop} today ({window_start}–{window_end})"

    # Build upcoming events HTML
    events_html = ""
    if upcoming_events:
        rows = "".join(
            f"<tr style='border-bottom:1px solid #2f3d35'>"
            f"<td style='padding:8px;color:#d4a853'>{e['date']}</td>"
            f"<td style='padding:8px;color:#7cb87a;text-transform:capitalize'>{e['type']}</td>"
            f"<td style='padding:8px;color:#e0e0e0'>{e['product']}</td>"
            f"<td style='padding:8px;color:#9a9a9a'>{e.get('reason','')}</td>"
            f"</tr>"
            for e in upcoming_events[:5]
        )
        events_html = f"""
        <div style='margin-top:24px'>
          <h3 style='color:#7cb87a;margin-bottom:12px'>📋 Upcoming events (next 30 days)</h3>
          <table style='width:100%;border-collapse:collapse;font-size:13px'>
            <thead>
              <tr style='background:#1a2420'>
                <th style='padding:8px;text-align:left;color:#6b7280'>Date</th>
                <th style='padding:8px;text-align:left;color:#6b7280'>Type</th>
                <th style='padding:8px;text-align:left;color:#6b7280'>Product</th>
                <th style='padding:8px;text-align:left;color:#6b7280'>Notes</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
        """

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style='margin:0;padding:0;background:#0a0f0c;font-family:"DM Sans",system-ui,sans-serif;color:#e0e0e0'>
      <div style='max-width:600px;margin:0 auto;padding:32px 16px'>

        <!-- Header -->
        <div style='background:linear-gradient(135deg,#1a2420,#243029);border-radius:16px;padding:32px;margin-bottom:24px;border:1px solid #2f3d35'>
          <div style='display:flex;align-items:center;gap:12px;margin-bottom:8px'>
            <span style='font-size:28px'>🌾</span>
            <span style='font-size:22px;font-weight:700;color:#7cb87a'>AgriMind</span>
          </div>
          <p style='color:#6b7280;margin:0;font-size:13px'>Smart Farm Intelligence</p>
        </div>

        <!-- Alert box -->
        <div style='background:#1a2420;border-radius:16px;padding:28px;margin-bottom:20px;border-left:4px solid #7cb87a'>
          <h2 style='margin:0 0 8px;color:#ffffff;font-size:20px'>
            💧 Irrigation Alert
          </h2>
          <p style='color:#9ca3af;margin:0 0 20px;font-size:14px'>
            Hi {to_name}, here's your daily farm update for <strong style='color:#7cb87a'>{field_name}</strong>
            at <strong style='color:#7cb87a'>{farm_name}</strong>.
          </p>

          <div style='background:#243029;border-radius:12px;padding:20px;margin-bottom:16px'>
            <p style='margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em'>Best watering window today</p>
            <p style='margin:0;font-size:32px;font-weight:700;color:#7cb87a'>{window_start} – {window_end}</p>
            <p style='margin:4px 0 0;font-size:13px;color:#9ca3af'>Local time · {location}</p>
          </div>

          <div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px'>
            <div style='background:#243029;border-radius:10px;padding:14px'>
              <p style='margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase'>Crop</p>
              <p style='margin:0;font-size:16px;font-weight:600;color:#d4a853'>{crop.capitalize()}</p>
            </div>
            <div style='background:#243029;border-radius:10px;padding:14px'>
              <p style='margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase'>Temperature</p>
              <p style='margin:0;font-size:16px;font-weight:600;color:#6eb5d9'>{temperature_c}°C</p>
            </div>
          </div>

          <div style='background:#1e2c26;border-radius:10px;padding:16px;border:1px solid #2f3d35'>
            <p style='margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase'>Why this time?</p>
            <p style='margin:0;font-size:14px;color:#d1fae5;line-height:1.6'>{reason}</p>
          </div>
        </div>

        {events_html}

        <!-- Footer -->
        <div style='text-align:center;padding:20px 0;color:#4b5563;font-size:12px'>
          <p style='margin:0'>AgriMind AI Platform · Smart Agriculture Intelligence</p>
          <p style='margin:4px 0 0'>You are receiving this because you enrolled this field in daily monitoring.</p>
        </div>
      </div>
    </body>
    </html>
    """

    plain_body = (
        f"Hi {to_name},\n\n"
        f"Based on the plan for your {crop} field '{field_name}' at {farm_name},\n"
        f"you need to irrigate today between {window_start} and {window_end}.\n\n"
        f"Reason: {reason}\n\n"
        f"Current temperature: {temperature_c}°C | Location: {location}\n\n"
        "— AgriMind AI Platform"
    )

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"AgriMind <{settings.smtp_user}>"
        msg["To"] = to_email

        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            if settings.smtp_port == 587:
                server.starttls()
                server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, msg.as_string())

        logger.info("Irrigation email sent to %s for %s", to_email, crop)
        return True

    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


def send_pesticide_alert(
    to_email: str,
    to_name: str,
    crop: str,
    field_name: str,
    product: str,
    reason: str,
    date_str: str,
) -> bool:
    """Send a pesticide/fertilizer application reminder."""
    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_user:
        return False

    subject = f"⚠️ AgriMind: Apply {product} on your {crop} ({date_str})"
    plain_body = (
        f"Hi {to_name},\n\n"
        f"Reminder: Apply {product} to your {crop} field '{field_name}' on {date_str}.\n"
        f"Reason: {reason}\n\n"
        "— AgriMind AI Platform"
    )

    try:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = f"AgriMind <{settings.smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(plain_body, "plain"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            if settings.smtp_port == 587:
                server.starttls()
                server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, msg.as_string())

        return True
    except Exception as exc:
        logger.error("Pesticide email failed: %s", exc)
        return False


def send_purchase_notification(
    to_email: str,
    to_name: str,
    buyer_name: str,
    buyer_phone: str,
    buyer_address: str,
    crop: str,
    quantity_kg: float,
    listing_id: int,
) -> bool:
    """Notify a seller that a buyer is interested in their listing."""
    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_user:
        logger.info("SMTP not configured — skipping purchase email to %s", to_email)
        return False

    subject = f"AgriMind: Buyer interest for your {crop} listing"
    plain_body = (
        f"Hi {to_name},\n\n"
        f"A buyer has expressed interest in your listing #{listing_id} for {crop}.\n\n"
        f"Buyer name: {buyer_name}\n"
        f"Phone: {buyer_phone}\n"
        f"Address: {buyer_address}\n"
        f"Requested quantity: {quantity_kg} kg\n\n"
        "Please contact the buyer to arrange the sale.\n\n"
        "— AgriMind"
    )

    try:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = f"AgriMind <{settings.smtp_user}>"
        msg["To"] = to_email
        msg.attach(MIMEText(plain_body, "plain"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            if settings.smtp_port == 587:
                server.starttls()
                server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, to_email, msg.as_string())

        logger.info("Purchase notification sent to %s for listing %s", to_email, listing_id)
        return True
    except Exception as exc:
        logger.error("Failed to send purchase email to %s: %s", to_email, exc)
        return False
