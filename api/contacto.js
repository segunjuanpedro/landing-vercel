// /api/contacto.js
// Función serverless de Vercel: recibe el POST del formulario y envía el email vía Resend.

export default async function handler(req, res) {
  // Solo aceptamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre, email, mensaje, honeypot } = req.body;

  // Honeypot anti-spam: campo oculto que un humano nunca completa.
  // Si viene lleno, es un bot -> respondemos OK igual (para no darle pistas) pero no mandamos nada.
  if (honeypot) {
    return res.status(200).json({ ok: true });
  }

  // Validación básica en el servidor (nunca confiar solo en el frontend)
  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Landing <notificaciones@juanpedro.com.ar>', // reemplazar por tu dominio verificado en Resend
        to: 'contacto@juanpedro.com.ar', // a donde querés que llegue
        reply_to: email, // así podés responder directo al que escribió
        subject: `Nuevo mensaje de ${nombre} — Landing`,
        text: `Nombre: ${nombre}\nEmail: ${email}\n\nMensaje:\n${mensaje}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de Resend:', errorData);
      return res.status(502).json({ error: 'No se pudo enviar el mensaje' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error al enviar el mensaje:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}