import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Habitaro AI <noreply@habitaro.ai>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://habitaro-ai.vercel.app'

export async function sendInvitationEmail(email: string, token: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const link = `${SITE}/auth/register?token=${token}`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Seu acesso ao Habitaro AI está pronto',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Habitaro AI</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">CRM para imobiliárias</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;font-weight:600;">Pagamento confirmado!</h2>
            <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
              Obrigado por assinar o Habitaro AI. Clique no botão abaixo para criar sua conta e começar a usar o CRM.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#18181b;border-radius:8px;">
                  <a href="${link}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;">
                    Criar minha conta →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#71717a;font-size:13px;">
              Ou copie e cole este link no navegador:
            </p>
            <p style="margin:0 0 32px;font-size:12px;color:#18181b;word-break:break-all;background:#f4f4f5;padding:10px 12px;border-radius:6px;font-family:monospace;">
              ${link}
            </p>

            <div style="border-top:1px solid #f4f4f5;padding-top:24px;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                Este link é válido por 7 dias e pode ser usado apenas uma vez.<br>
                Se você não reconhece este e-mail, ignore-o com segurança.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;padding:20px 40px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;color:#a1a1aa;font-size:12px;">
              © ${new Date().getFullYear()} Habitaro AI · <a href="${SITE}" style="color:#a1a1aa;">habitaro-ai.vercel.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  })
}
